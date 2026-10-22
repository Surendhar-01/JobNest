from abc import ABC, abstractmethod
import time
import requests
from app.config import TIMEOUT, RETRIES

class AccessDenied(RuntimeError):
    pass

class BaseScraper(ABC):
    # Subclasses must document explicit collection and reuse permission.
    permission_url: str
    source_url: str

    def fetch(self, url=None):
        from urllib.parse import urlsplit
        url = url or self.source_url
        expected, actual = urlsplit(self.source_url), urlsplit(url)
        if (actual.scheme, actual.netloc) != (expected.scheme, expected.netloc) or not actual.path.startswith(expected.path):
            raise AccessDenied("Only approved source URLs may be fetched")
        with requests.Session() as session:
            session.headers["User-Agent"] = "CollegeJobResearch/1.0 (educational practice scraper)"
            for attempt in range(RETRIES + 1):
                try:
                    response = session.get(url, timeout=TIMEOUT, allow_redirects=False)
                    if response.status_code in (401, 403, 429):
                        raise AccessDenied(f"Source denied or rate-limited access ({response.status_code}); stop collection")
                    if 300 <= response.status_code < 400:
                        raise AccessDenied("Unexpected redirect; review source permission before following")
                    if response.status_code >= 500:
                        response.raise_for_status()
                    response.raise_for_status()
                    return response.text
                except (requests.Timeout, requests.ConnectionError):
                    if attempt == RETRIES:
                        raise
                except requests.HTTPError as exc:
                    if exc.response.status_code < 500 or attempt == RETRIES:
                        raise
                time.sleep(min(2 ** attempt, 8))
        raise RuntimeError("Fetch exhausted")

    @abstractmethod
    def parse(self, html):
        pass

    def scrape(self):
        return self.parse(self.fetch())
