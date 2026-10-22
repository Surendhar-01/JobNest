import logging
from datetime import date, datetime, timezone
from uuid import uuid5, NAMESPACE_URL
from bs4 import BeautifulSoup
from app.config import SOURCE_URL, PERMISSION_URL
from app.models.job import Job
from app.scrapers.base_scraper import BaseScraper
from app.services.cleaner import clean_text, valid_url

class PracticeScraper(BaseScraper):
    source_url = SOURCE_URL
    permission_url = PERMISSION_URL

    def parse(self, html):
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select("#ResultsContainer .card-content")
        if not cards:
            raise ValueError("No job cards found; source HTML may have changed")
        collected = datetime.now(timezone.utc)
        jobs = []
        for card in cards:
            def text(selector):
                node = card.select_one(selector)
                return clean_text(node.get_text(" ", strip=True)) if node else None
            apply = next((a for a in card.select("a[href]") if a.get_text(strip=True).casefold() == "apply"), None)
            application = valid_url(apply.get("href"), self.source_url) if apply else None
            source_id = card.get("id")
            identity = source_id or application
            if not identity:
                logging.warning("Skipping card without a stable source identity")
                continue
            node = card.select_one("time")
            posted = None
            if node:
                try:
                    posted = date.fromisoformat(node.get("datetime") or node.get_text(strip=True))
                except ValueError:
                    logging.warning("Invalid posted date for %s", identity)
            jobs.append(Job(
                id=str(uuid5(NAMESPACE_URL, self.source_url + "#" + identity)),
                source_job_id=source_id, title=text("h2.title"),
                company=text("h3.company"), location=text("p.location"),
                posted_date=posted, application_url=application,
                source=self.source_url, collected_at=collected))
        if not jobs:
            raise ValueError("No valid jobs extracted")
        return jobs

    def scrape(self):
        import time
        from app.config import FETCH_DETAILS, DETAIL_DELAY_SECONDS
        jobs = super().scrape()
        if FETCH_DETAILS:
            for index, job in enumerate(jobs, 1):
                if job.application_url:
                    time.sleep(DETAIL_DELAY_SECONDS)
                    detail = BeautifulSoup(self.fetch(job.application_url), "html.parser")
                    paragraphs = detail.select("#ResultsContainer .content p:not([id])")
                    description = clean_text(" ".join(p.get_text(" ", strip=True) for p in paragraphs))
                    if not description:
                        raise ValueError("Description selector no longer matches source")
                    job.description = description
                if index % 20 == 0:
                    logging.info("Read %s/%s job detail pages", index, len(jobs))
        return jobs
