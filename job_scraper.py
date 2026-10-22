"""
Live Job Scraper Module
Directly scrapes real-time job listings from recruitment websites:
- LinkedIn
- Naukri
- Instahyre
- RemoteOK
- Arbeitnow
- Jobicy
- Remotive
"""

import re
import time
import gzip
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import urllib.parse
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("job_scraper")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Common skill keywords to extract from titles and descriptions
COMMON_SKILLS = [
    "Python", "Java", "C++", "C#", "Golang", "Go", "Rust", "JavaScript", "TypeScript",
    "React", "React Native", "Angular", "Vue", "Node.js", "Express", "Django", "Flask",
    "FastAPI", "Spring Boot", "Ruby on Rails", "PHP", "Laravel", "HTML", "CSS", "Tailwind",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux",
    "Machine Learning", "Deep Learning", "NLP", "LLM", "Generative AI", "PyTorch",
    "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "Data Science", "Data Engineering",
    "Apache Spark", "Airflow", "Kafka", "Tableau", "Power BI", "DevOps", "Microservices",
    "REST API", "GraphQL", "Cybersecurity", "Penetration Testing", "Agile", "Scrum"
]

def extract_skills_from_text(text: str) -> List[str]:
    """Extract known technology and programming skills from text."""
    if not text:
        return []
    found = []
    text_lower = f" {text.lower()} "
    for skill in COMMON_SKILLS:
        pattern = r'(?<![a-zA-Z0-9_])' + re.escape(skill.lower()) + r'(?![a-zA-Z0-9_])'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def scrape_linkedin_jobs(keyword: str = "Software Engineer", location: str = "India", limit: int = 15) -> List[Dict[str, Any]]:
    """
    Directly scrapes public job postings from LinkedIn without requiring authentication.
    Uses LinkedIn's public search portal.
    """
    jobs = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
    }
    encoded_keyword = urllib.parse.quote(keyword)
    encoded_loc = urllib.parse.quote(location)
    url = f"https://www.linkedin.com/jobs/search?keywords={encoded_keyword}&location={encoded_loc}"

    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code != 200:
            logger.warning(f"LinkedIn returned status code {response.status_code}")
            return jobs

        soup = BeautifulSoup(response.text, "html.parser")
        cards = soup.find_all("div", class_=lambda c: c and "base-card" in c)
        if not cards:
            cards = soup.find_all("li")

        for card in cards:
            title_el = card.find("h3", class_=lambda x: x and "base-search-card__title" in x)
            comp_el = card.find("h4", class_=lambda x: x and "base-search-card__subtitle" in x)
            loc_el = card.find("span", class_=lambda x: x and "job-search-card__location" in x)
            link_el = card.find("a", class_=lambda x: x and "base-card__full-link" in x)
            date_el = card.find("time")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            company = comp_el.get_text(strip=True) if comp_el else "Confidential"
            loc = loc_el.get_text(strip=True) if loc_el else location
            raw_url = link_el.get("href", "") if link_el else ""
            job_url = raw_url.split("?")[0] if raw_url else f"https://www.linkedin.com/jobs/search?keywords={encoded_keyword}"

            posted_date = None
            if date_el:
                posted_date = date_el.get("datetime") or date_el.get_text(strip=True)

            skills = extract_skills_from_text(title + " " + keyword)

            jobs.append({
                "job_title": title,
                "company": company,
                "location": loc,
                "skills": skills,
                "job_url": job_url,
                "source": "LinkedIn",
                "posted_date": posted_date,
                "collected_at": datetime.now(timezone.utc).isoformat()
            })

            if len(jobs) >= limit:
                break

        logger.info(f"Successfully scraped {len(jobs)} live jobs from LinkedIn")
    except Exception as e:
        logger.error(f"Error scraping LinkedIn: {e}")

    return jobs


NAUKRI_SITEMAP_INDEX = "https://www.naukri.com/sitemap.xml"
NAUKRI_SITEMAP_CACHE_TTL = 1800  # seconds before sitemap/company dictionaries are refetched

_NAUKRI_CACHE: Dict[str, Any] = {
    "companies": None, "companies_at": 0.0,
    "sitemaps": None, "sitemaps_at": 0.0,
}

# City tokens used when a listing slug ends with one or more locations
_NAUKRI_CITY_TOKENS = frozenset({
    "pune", "mumbai", "bangalore", "bengaluru", "hyderabad", "chennai", "delhi", "noida",
    "gurgaon", "gurugram", "kolkata", "ahmedabad", "indore", "coimbatore", "jaipur",
    "chandigarh", "lucknow", "nagpur", "thane", "vashi", "ghaziabad", "faridabad",
    "kochi", "cochin", "mysore", "madurai", "visakhapatnam", "vijayawada", "patna",
    "bhopal", "raipur", "surat", "vadodara", "ranchi", "dehradun", "mohali", "zirakpur",
    "panchkula", "warangal", "trichy", "salem", "erode", "kanchipuram", "sriperumbudur",
    "secunderabad", "gachibowli", "udaipur", "aurangabad", "nashik", "kanpur", "varanasi",
    "jamshedpur", "hubli", "mangalore", "thiruvananthapuram", "agra", "bhavnagar",
    "bhubaneswar", "cuttack", "rourkela", "guwahati", "siliguri", "howrah", "gwalior",
    "jodhpur", "kota", "mysuru", "tumkur", "belgaum", "remote", "wfh", "india", "anywhere", "rural",
})

# Company-slug tokens that alone never identify a real employer
_NAUKRI_LEGAL_TOKENS = frozenset({"pvt", "ltd", "limited", "private", "inc", "llp", "co", "and", "the", "india", "indian"})

_NAUKRI_METRO_ORDER = (
    "bangalore", "mumbai", "delhi", "hyderabad", "chennai", "pune",
    "noida", "gurgaon", "gurugram", "kolkata", "ahmedabad",
)


def _naukri_fetch(url: str, timeout: int = 40) -> str:
    """Fetches a Naukri URL (HTML or XML, optionally .gz) with a browser-like session."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    res = requests.get(url, headers=headers, timeout=timeout)
    res.raise_for_status()
    raw = res.content
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw.decode("utf-8", "ignore")


def _naukri_company_slugs() -> set:
    """
    Loads Naukri's official employer index (jobByCompany sitemaps) so listing slugs
    can be split into title + company. Cached in-process to stay polite.
    """
    now = time.time()
    cached = _NAUKRI_CACHE.get("companies")
    if cached is not None and now - _NAUKRI_CACHE["companies_at"] < NAUKRI_SITEMAP_CACHE_TTL:
        return cached

    slugs = set()
    for url in (
        "https://www.naukri.com/sitemap/jobByCompany-1.xml.gz",
        "https://www.naukri.com/sitemap/jobByCompany-2.xml.gz",
    ):
        try:
            xml = _naukri_fetch(url, timeout=60)
        except Exception as exc:
            logger.warning(f"Naukri employer sitemap fetch failed: {exc}")
            continue
        for path in re.findall(r"<loc>https://www\.naukri\.com/([^<]+)</loc>", xml):
            m = re.match(r"^(.+)-jobs-careers-\d+$", path)
            if not m:
                continue
            slug = m.group(1)
            if set(slug.split("-")) <= _NAUKRI_LEGAL_TOKENS:
                continue
            slugs.add(slug)

    _NAUKRI_CACHE["companies"] = slugs
    _NAUKRI_CACHE["companies_at"] = now
    return slugs


def _naukri_job_sitemaps() -> List[str]:
    """Returns the jobDesc sitemaps Naukri publishes for crawlers (robots.txt declared)."""
    now = time.time()
    cached = _NAUKRI_CACHE.get("sitemaps")
    if cached is not None and now - _NAUKRI_CACHE["sitemaps_at"] < NAUKRI_SITEMAP_CACHE_TTL:
        return cached
    xml = _naukri_fetch(NAUKRI_SITEMAP_INDEX, timeout=30)
    urls = re.findall(r"<loc>(https://www\.naukri\.com/sitemap/jobDescPages[^<]+)</loc>", xml)
    _NAUKRI_CACHE["sitemaps"] = urls
    _NAUKRI_CACHE["sitemaps_at"] = now
    return urls


def _naukri_sitemap_city(url: str) -> str:
    """Derives the city a jobDesc sitemap covers from its filename (e.g. jobDescPagesPune.xml)."""
    name = url.rsplit("/", 1)[-1].lower()
    m = re.match(r"jobdescpages([a-z]+?)(?:-\d+)?\.xml(?:\.gz)?$", name)
    city = m.group(1) if m else ""
    return city.capitalize() if city in _NAUKRI_CITY_TOKENS else ""


def _naukri_ordered_sitemaps(location: str) -> List[str]:
    """Orders sitemaps so the requested city and major metros are scanned first."""
    wanted = (location or "").strip().lower()

    def rank(url: str) -> int:
        name = url.rsplit("/", 1)[-1].lower()
        if wanted and wanted not in ("india", "remote") and wanted in name:
            return 0
        for i, city in enumerate(_NAUKRI_METRO_ORDER):
            if city in name:
                return 1 + i
        return 50

    return sorted(_naukri_job_sitemaps(), key=rank)


def _naukri_humanize(tokens: List[str]) -> str:
    return " ".join(tok.capitalize() for tok in tokens if tok)


def _naukri_normalize_location(tokens: List[str]) -> List[str]:
    """Merges city synonyms (bengaluru/bangalore, gurugram/gurgaon...) and drops noise words."""
    synonyms = {
        "bengaluru": "bangalore", "gurugram": "gurgaon", "mysuru": "mysore",
        "cochin": "kochi", "bombay": "mumbai", "calcutta": "kolkata", "madras": "chennai",
    }
    noise = {"rural", "india", "anywhere"}
    normalized: List[str] = []
    for tok in tokens:
        tok = synonyms.get(tok, tok)
        if tok not in normalized:
            normalized.append(tok)
    if any(tok not in noise for tok in normalized):
        normalized = [tok for tok in normalized if tok not in noise]
    return normalized or tokens


def _naukri_parse_listing(url: str, companies: set, default_location: str = "") -> Optional[Dict[str, Any]]:
    """
    Extracts a job record from a Naukri job-listings URL published in the official
    sitemap. Slug layout: job-listings-<title>-<company>-<location>-<experience>-<DDMMYY><jobid>
    """
    path = url.rstrip("/").split("/")[-1]
    m = re.match(r"^job-listings-(?P<body>.+)-(?P<trail>\d{12})$", path)
    if not m:
        return None
    body, trail = m.group("body"), m.group("trail")

    posted_date = None
    try:
        day, month, yy = int(trail[0:2]), int(trail[2:4]), int(trail[4:6])
        posted = datetime(2000 + yy, month, day)
        if 2015 <= posted.year <= 2035:
            posted_date = posted.strftime("%Y-%m-%d")
    except ValueError:
        pass

    experience = None
    exp_match = re.search(
        r"-(?P<exp>\d+-to-\d+-years|\d+-\d+-years|\d+-plus-years|\d+-years|freshers?)$", body
    )
    if exp_match:
        experience = exp_match.group("exp").replace("-to-", "-").replace("-years", " years").replace("-plus-", " plus ")
        body = body[:exp_match.start()]

    tokens = body.split("-")

    loc_tokens: List[str] = []
    while len(tokens) > 2 and tokens[-1] in _NAUKRI_CITY_TOKENS and len(loc_tokens) < 4:
        loc_tokens.insert(0, tokens.pop())

    # Split title from company: company is a suffix of the remaining slug that
    # matches an employer slug in Naukri's official employer index.
    count = len(tokens)
    best_start = None
    for start in range(2, count):
        candidate = tokens[start:]
        if any("-".join(candidate[:k]) in companies for k in range(len(candidate), 0, -1)):
            best_start = start
    if best_start is None:
        for start in range(1, count):
            candidate = tokens[start:]
            if any("-".join(candidate[:k]) in companies for k in range(len(candidate), 0, -1)):
                best_start = start
                break

    title_tokens = tokens if best_start is None else tokens[:best_start]
    company_tokens = [] if best_start is None else tokens[best_start:]

    title = _naukri_humanize(title_tokens) or path
    company = _naukri_humanize(company_tokens) if company_tokens else None
    location = _naukri_humanize(_naukri_normalize_location(loc_tokens)) or (default_location or "India")
    skills = extract_skills_from_text(f"{title} {company or ''} {location}")

    return {
        "job_title": title,
        "company": company,
        "location": location,
        "experience": experience,
        "skills": skills,
        "job_url": url,
        "source": "Naukri",
        "posted_date": posted_date,
        "collected_at": datetime.now(timezone.utc).isoformat()
    }


def _naukri_from_sitemaps(keyword: str, location: str, limit: int) -> List[Dict[str, Any]]:
    """Collects matching Naukri listings from the official job sitemaps."""
    companies = _naukri_company_slugs()
    if not companies:
        return []

    wanted_terms = [t for t in (keyword or "").lower().split() if t]
    location_filter = (location or "").strip().lower()
    if location_filter in ("", "india", "remote"):
        location_filter = ""

    jobs: List[Dict[str, Any]] = []
    seen: set = set()
    for sitemap_url in _naukri_ordered_sitemaps(location)[:8]:
        if len(jobs) >= limit:
            break
        try:
            xml = _naukri_fetch(sitemap_url, timeout=60)
        except Exception as exc:
            logger.warning(f"Naukri job sitemap fetch failed for {sitemap_url}: {exc}")
            continue

        default_location = _naukri_sitemap_city(sitemap_url)
        for page_url in re.findall(r"<loc>(https://www\.naukri\.com/job-listings-[^<]+)</loc>", xml):
            if len(jobs) >= limit:
                break
            if page_url in seen:
                continue
            seen.add(page_url)

            parsed = _naukri_parse_listing(page_url, companies, default_location)
            if not parsed:
                continue
            if location_filter and location_filter not in parsed["location"].lower():
                continue
            haystack = f"{parsed['job_title']} {parsed['company'] or ''}".lower()
            if wanted_terms and not all(term in haystack for term in wanted_terms):
                continue
            jobs.append(parsed)

    logger.info(f"Successfully collected {len(jobs)} live listings from Naukri official sitemaps")
    return jobs


def scrape_naukri_jobs(keyword: str = "Python", location: str = "India", limit: int = 15) -> List[Dict[str, Any]]:
    """
    Collects live job listings from Naukri.com.

    Naukri's search API is CAPTCHA-gated (HTTP 406 "recaptcha required") and its HTML
    pages are client-rendered shells, so after the direct session request we fall back
    to Naukri's official XML sitemaps, which robots.txt declares for crawlers and which
    publish every listing URL with title, company, location, experience and posting date
    encoded in the slug. Anti-bot protections are never bypassed and no data is fabricated.
    """
    jobs = []

    # Fast path: direct session request against the search portal HTML
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
    }
    safe_keyword = keyword.lower().replace(" ", "-")
    url = f"https://www.naukri.com/{safe_keyword}-jobs-in-{location.lower()}"

    try:
        session = requests.Session()
        res = session.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(res.text, "html.parser")
        articles = soup.find_all("div", class_=lambda c: c and ("srp-jobtuple-wrapper" in c or "cust-job-tuple" in c))

        for art in articles:
            title_node = art.find("a", class_=lambda c: c and "title" in c)
            comp_node = art.find("a", class_=lambda c: c and "comp-name" in c) or art.find("span", class_="comp-name")
            loc_node = art.find("span", class_=lambda c: c and "loc" in c)

            if title_node:
                title = title_node.get_text(strip=True)
                href = title_node.get("href", "")
                company = comp_node.get_text(strip=True) if comp_node else None
                loc = loc_node.get_text(strip=True) if loc_node else location

                jobs.append({
                    "job_title": title,
                    "company": company,
                    "location": loc,
                    "experience": None,
                    "skills": extract_skills_from_text(title + " " + art.get_text(" ", strip=True)),
                    "job_url": href if href.startswith("http") else f"https://www.naukri.com{href}",
                    "source": "Naukri",
                    "posted_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
    except Exception as e:
        logger.error(f"Error scraping Naukri search HTML: {e}")

    # Fallback path: Naukri publishes listing URLs in its official sitemaps
    if len(jobs) < limit:
        try:
            fallback = _naukri_from_sitemaps(keyword, location, limit)
            known = {j.get("job_url") for j in jobs}
            for job in fallback:
                if job["job_url"] in known:
                    continue
                jobs.append(job)
                if len(jobs) >= limit:
                    break
        except Exception as e:
            logger.error(f"Error collecting Naukri listings from official sitemaps: {e}")

    if not jobs:
        logger.info("Naukri returned no listings (search API CAPTCHA-gated, sitemap feed empty).")

    return jobs[:limit]


def scrape_instahyre_jobs(keyword: str = "Engineer", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Directly scrapes live job openings from Instahyre (leading Indian recruitment platform).
    """
    jobs = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    url = "https://www.instahyre.com/api/v1/job_search"

    try:
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            for item in data.get("objects", []):
                title = item.get("title", "")
                employer = item.get("employer", {}) or {}
                company = employer.get("company_name", "Tech Startup")
                locations = item.get("locations", "India")
                if isinstance(locations, list):
                    loc_str = ", ".join(locations)
                else:
                    loc_str = str(locations)

                skills_data = item.get("skills", [])
                skills = []
                for s in skills_data:
                    if isinstance(s, dict) and s.get("name"):
                        skills.append(s.get("name"))
                    elif isinstance(s, str):
                        skills.append(s)

                if not skills:
                    skills = extract_skills_from_text(title + " " + (item.get("description") or ""))

                job_id = item.get("id")
                job_url = f"https://www.instahyre.com/job-{job_id}" if job_id else "https://www.instahyre.com"

                jobs.append({
                    "job_title": title,
                    "company": company,
                    "location": loc_str or "India",
                    "skills": skills,
                    "job_url": job_url,
                    "source": "Instahyre",
                    "posted_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
        logger.info(f"Successfully collected {len(jobs)} live jobs from Instahyre")
    except Exception as e:
        logger.error(f"Error scraping Instahyre: {e}")

    return jobs


def scrape_remoteok_jobs(limit: int = 25) -> List[Dict[str, Any]]:
    """
    Directly scrapes live tech job openings from RemoteOK recruitment portal.
    """
    jobs = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
    url = "https://remoteok.com/api"

    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code == 200:
            data = response.json()
            for item in data:
                if not isinstance(item, dict) or not item.get("position"):
                    continue

                raw_tags = item.get("tags", [])
                skills = [t.capitalize() for t in raw_tags] if isinstance(raw_tags, list) else []

                jobs.append({
                    "job_title": item.get("position"),
                    "company": item.get("company", "Remote Company"),
                    "location": item.get("location") or "Remote",
                    "skills": skills,
                    "job_url": item.get("url") or "https://remoteok.com",
                    "source": "RemoteOK",
                    "posted_date": item.get("date"),
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
        logger.info(f"Successfully collected {len(jobs)} live jobs from RemoteOK")
    except Exception as e:
        logger.error(f"Error scraping RemoteOK: {e}")

    return jobs


def scrape_arbeitnow_jobs(limit: int = 25) -> List[Dict[str, Any]]:
    """
    Directly scrapes live job openings from Arbeitnow recruitment platform.
    """
    jobs = []
    url = "https://www.arbeitnow.com/api/job-board-api"

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            for item in data.get("data", []):
                title = item.get("title", "")
                company = item.get("company_name", "Global Tech")
                location = item.get("location", "Worldwide")
                tags = item.get("tags", [])
                skills = tags if isinstance(tags, list) else []
                if not skills:
                    skills = extract_skills_from_text(title + " " + item.get("description", ""))

                jobs.append({
                    "job_title": title,
                    "company": company,
                    "location": location,
                    "skills": skills,
                    "job_url": item.get("url", ""),
                    "source": "Arbeitnow",
                    "posted_date": datetime.fromtimestamp(item.get("created_at", time.time()), tz=timezone.utc).strftime("%Y-%m-%d") if item.get("created_at") else None,
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
        logger.info(f"Successfully collected {len(jobs)} live jobs from Arbeitnow")
    except Exception as e:
        logger.error(f"Error scraping Arbeitnow: {e}")

    return jobs


def scrape_jobicy_jobs(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Directly scrapes live job openings from Jobicy recruitment portal.
    """
    jobs = []
    url = f"https://jobicy.com/api/v2/remote-jobs?count={limit}"

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            for item in data.get("jobs", []):
                title = item.get("jobTitle", "")
                company = item.get("companyName", "Tech Employer")
                location = item.get("jobGeo", "Remote")
                industry = item.get("jobIndustry", [])
                skills = industry if isinstance(industry, list) else [industry]
                extracted = extract_skills_from_text(title + " " + item.get("jobExcerpt", ""))
                combined_skills = list(dict.fromkeys(skills + extracted))

                jobs.append({
                    "job_title": title,
                    "company": company,
                    "location": location,
                    "skills": combined_skills,
                    "job_url": item.get("url", ""),
                    "source": "Jobicy",
                    "posted_date": item.get("pubDate"),
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
        logger.info(f"Successfully collected {len(jobs)} live jobs from Jobicy")
    except Exception as e:
        logger.error(f"Error scraping Jobicy: {e}")

    return jobs


def scrape_remotive_jobs(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Directly scrapes live job openings from Remotive job portal.
    """
    jobs = []
    url = f"https://remotive.com/api/remote-jobs?limit={limit}"

    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            data = response.json()
            for item in data.get("jobs", []):
                title = item.get("title", "")
                company = item.get("company_name", "Innovative Tech")
                location = item.get("candidate_required_location", "Remote")
                tags = item.get("tags", [])
                skills = tags if isinstance(tags, list) else []
                extracted = extract_skills_from_text(title + " " + item.get("description", ""))
                combined_skills = list(dict.fromkeys(skills + extracted))

                jobs.append({
                    "job_title": title,
                    "company": company,
                    "location": location,
                    "skills": combined_skills,
                    "job_url": item.get("url", ""),
                    "source": "Remotive",
                    "posted_date": item.get("publication_date"),
                    "collected_at": datetime.now(timezone.utc).isoformat()
                })
                if len(jobs) >= limit:
                    break
        logger.info(f"Successfully collected {len(jobs)} live jobs from Remotive")
    except Exception as e:
        logger.error(f"Error scraping Remotive: {e}")

    return jobs


def get_jobs(
    sources: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
    location: str = "India",
    limit_per_source: int = 20
) -> List[Dict[str, Any]]:
    """
    Orchestrates real-time web scraping directly from recruitment websites:
    - LinkedIn
    - Naukri
    - Instahyre
    - RemoteOK
    - Arbeitnow
    - Jobicy
    - Remotive

    Does NOT fetch from any CSV file or pre-existing datasets.
    Collects live job openings concurrently.
    """
    if not sources:
        sources = ["LinkedIn", "Instahyre", "RemoteOK", "Arbeitnow", "Jobicy", "Remotive", "Naukri"]

    if not keywords:
        keywords = ["Software Engineer", "Python Developer", "Full Stack Developer", "Data Scientist"]

    tasks = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for src in sources:
            s_lower = src.lower()
            if "linkedin" in s_lower:
                for kw in keywords[:2]:
                    tasks.append(executor.submit(scrape_linkedin_jobs, kw, location, limit_per_source))
            elif "naukri" in s_lower:
                for kw in keywords[:2]:
                    tasks.append(executor.submit(scrape_naukri_jobs, kw, location, limit_per_source))
            elif "instahyre" in s_lower:
                tasks.append(executor.submit(scrape_instahyre_jobs, "Engineer", limit_per_source))
            elif "remoteok" in s_lower:
                tasks.append(executor.submit(scrape_remoteok_jobs, limit_per_source))
            elif "arbeitnow" in s_lower:
                tasks.append(executor.submit(scrape_arbeitnow_jobs, limit_per_source))
            elif "jobicy" in s_lower:
                tasks.append(executor.submit(scrape_jobicy_jobs, limit_per_source))
            elif "remotive" in s_lower:
                tasks.append(executor.submit(scrape_remotive_jobs, limit_per_source))

        all_jobs = []
        seen_urls = set()

        for future in as_completed(tasks):
            try:
                batch = future.result()
                for job in batch:
                    url = job.get("job_url")
                    if not url or url in seen_urls:
                        continue
                    seen_urls.add(url)
                    all_jobs.append(job)
            except Exception as e:
                logger.error(f"Scraping task generated an exception: {e}")

    logger.info(f"Total live scraped jobs aggregated: {len(all_jobs)}")
    return all_jobs


if __name__ == "__main__":
    print("Testing live web scraping from recruitment websites (LinkedIn, Naukri, Instahyre, RemoteOK, etc.)...")
    jobs = get_jobs(limit_per_source=5)
    print(f"\nTotal live jobs scraped directly: {len(jobs)}")
    for j in jobs[:10]:
        print(f"[{j['source']}] {j['job_title']} at {j['company']} ({j['location']}) -> {j['job_url']}")
