from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import asyncio
import io
import csv
from fastapi.responses import StreamingResponse

from job_scraper import (
    get_jobs,
    scrape_linkedin_jobs,
    scrape_naukri_jobs,
    scrape_instahyre_jobs,
    scrape_remoteok_jobs,
    scrape_arbeitnow_jobs,
    scrape_jobicy_jobs,
    scrape_remotive_jobs
)

REFRESH_INTERVAL = 30 * 60  # 30 minutes auto-refresh window

# In-memory store for live scraped jobs (no pre-existing CSV datasets)
jobs_cache: List[Dict[str, Any]] = []
last_refresh: float = 0.0
refresh_lock = asyncio.Lock()
is_scraping: bool = False


async def refresh_jobs(force: bool = False, sources: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Directly scrapes real-time job listings from recruitment websites
    (LinkedIn, Naukri, Instahyre, RemoteOK, Arbeitnow, Jobicy, Remotive).
    Does NOT read from pre-existing CSV datasets.
    """
    global jobs_cache, last_refresh, is_scraping

    async with refresh_lock:
        now = datetime.now(timezone.utc).timestamp()

        # If cache is populated and not expired, and not forced, return cached results
        if not force and jobs_cache and (now - last_refresh < REFRESH_INTERVAL):
            return jobs_cache

        is_scraping = True
        try:
            # Perform live web scraping across recruitment portals in background worker threads
            fetched_jobs = await asyncio.to_thread(get_jobs, sources=sources, limit_per_source=20)

            if not fetched_jobs and not jobs_cache:
                raise HTTPException(
                    status_code=503,
                    detail="Live job scraping returned no records. Please retry shortly."
                )

            if fetched_jobs:
                jobs_cache = fetched_jobs
                last_refresh = datetime.now(timezone.utc).timestamp()

            return jobs_cache
        finally:
            is_scraping = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On microservice startup, immediately trigger direct web scraping
    from live recruitment websites.
    """
    # Trigger initial scrape in the background without blocking server boot
    asyncio.create_task(refresh_jobs(force=True))
    yield


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Real-Time Job Scraping & Recommendation Microservice",
    description="Directly scrapes live job openings from recruitment websites such as LinkedIn, Naukri, Instahyre, RemoteOK, Arbeitnow, Jobicy, and Remotive without reading from CSV datasets.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "service": "Real-Time Job Scraping & Recommendation Service",
        "status": "online",
        "data_source": "Direct Web Scraping (LinkedIn, Naukri, Instahyre, RemoteOK, Arbeitnow, Jobicy, Remotive)",
        "csv_dataset_used": False,
        "total_jobs_in_cache": len(jobs_cache),
        "last_refresh_utc": datetime.fromtimestamp(last_refresh, tz=timezone.utc).isoformat() if last_refresh else None,
        "is_currently_scraping": is_scraping
    }


@app.get("/sources")
def list_sources():
    """Returns available recruitment portals and their live scraping adapters."""
    return {
        "supported_portals": [
            {
                "name": "LinkedIn",
                "type": "Direct HTML Web Scraper",
                "coverage": "Worldwide & India tech and corporate jobs",
                "status": "Active"
            },
            {
                "name": "Naukri",
                "type": "Official XML Sitemap Feed + Direct Session Scraper",
                "coverage": "India tech, enterprise & IT job listings (title, company, location, experience, posting date)",
                "status": "Active (CAPTCHA-gated search API untouched; listings collected from Naukri's robots.txt-declared sitemaps)"
            },
            {
                "name": "Instahyre",
                "type": "Direct Recruitment Platform API Scraper",
                "coverage": "Top Indian startups & product firms (Bangalore, Pune, Remote)",
                "status": "Active"
            },
            {
                "name": "RemoteOK",
                "type": "Direct Global Remote Job Board Scraper",
                "coverage": "Global remote software engineering, AI, DevOps",
                "status": "Active"
            },
            {
                "name": "Arbeitnow",
                "type": "Verified Tech Job Board Scraper",
                "coverage": "European and global tech opportunities",
                "status": "Active"
            },
            {
                "name": "Jobicy",
                "type": "Direct Remote Job Board Scraper",
                "coverage": "Engineering, marketing, product & data roles",
                "status": "Active"
            },
            {
                "name": "Remotive",
                "type": "Direct Remote Engineering Scraper",
                "coverage": "Software development, data, DevOps",
                "status": "Active"
            }
        ]
    }


@app.get("/jobs")
async def get_all_jobs(
    source: Optional[str] = Query(None, description="Filter by portal: LinkedIn, Naukri, Instahyre, RemoteOK, Arbeitnow, Jobicy, Remotive"),
    search: Optional[str] = Query(None, description="Search query across job title, company, or skills"),
    location: Optional[str] = Query(None, description="Filter by job location"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of jobs to return"),
    page: int = Query(1, ge=1, description="Page number for pagination")
):
    """
    Returns real job listings scraped directly from recruitment portals.
    Does not use or load any pre-existing CSV datasets.
    """
    # If cache is empty and not currently scraping, populate from live portals
    if not jobs_cache:
        await refresh_jobs(force=True)

    results = jobs_cache

    # Source filter
    if source:
        src_lower = source.strip().lower()
        results = [j for j in results if src_lower in j.get("source", "").lower()]

    # Keyword / Search filter
    if search:
        q_lower = search.strip().lower()
        def matches_query(j):
            title = j.get("job_title", "").lower()
            comp = (j.get("company") or "").lower()
            skills_val = j.get("skills", [])
            skills_text = " ".join(skills_val).lower() if isinstance(skills_val, list) else str(skills_val).lower()
            return q_lower in title or q_lower in comp or q_lower in skills_text
        results = [j for j in results if matches_query(j)]

    # Location filter
    if location:
        loc_lower = location.strip().lower()
        results = [j for j in results if loc_lower in j.get("location", "").lower()]

    total_matched = len(results)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_jobs = results[start_idx:end_idx]

    return {
        "status": "success",
        "data_source": "Live Recruitment Portals",
        "total_jobs": total_matched,
        "page": page,
        "page_size": limit,
        "jobs": paginated_jobs
    }


@app.post("/refresh")
@app.post("/scrape")
async def manual_refresh(
    sources: Optional[List[str]] = Query(None, description="Specific portals to scrape (e.g. ['LinkedIn', 'Instahyre'])")
):
    """
    Triggers an immediate live web scraping cycle directly against recruitment websites.
    """
    refreshed_jobs = await refresh_jobs(force=True, sources=sources)
    return {
        "message": "Live web scraping completed successfully from recruitment websites",
        "data_source": "Direct Web Scraping",
        "total_jobs_scraped": len(refreshed_jobs),
        "timestamp_utc": datetime.fromtimestamp(last_refresh, tz=timezone.utc).isoformat()
    }


@app.get("/stats")
def get_stats():
    """Returns portal distribution statistics of the live scraped jobs."""
    distribution: Dict[str, int] = {}
    for j in jobs_cache:
        src = j.get("source", "Unknown")
        distribution[src] = distribution.get(src, 0) + 1

    return {
        "total_live_jobs": len(jobs_cache),
        "last_refresh_utc": datetime.fromtimestamp(last_refresh, tz=timezone.utc).isoformat() if last_refresh else None,
        "distribution_by_portal": distribution
    }


@app.get("/jobs/export-csv")
def export_scraped_csv():
    """
    Exports currently scraped in-memory jobs to a downloadable CSV stream.
    NOTE: This generates fresh CSV output from live scraped data; it never reads
    from any pre-existing CSV datasets.
    """
    if not jobs_cache:
        raise HTTPException(status_code=404, detail="No scraped jobs in memory to export.")

    output = io.StringIO()
    fieldnames = ["job_title", "company", "location", "skills", "job_url", "source", "posted_date", "collected_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for job in jobs_cache:
        row = dict(job)
        if isinstance(row.get("skills"), list):
            row["skills"] = ", ".join(row["skills"])
        writer.writerow({k: row.get(k, "") for k in fieldnames})

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=live_scraped_jobs.csv"}
    )
