import re
from urllib.parse import urlsplit, urljoin, urlunsplit
from bs4 import BeautifulSoup
from app.models.job import Job

def clean_text(value):
    if value is None:
        return None
    text = BeautifulSoup(str(value), "html.parser").get_text(" ", strip=True)
    return re.sub(r"\s+", " ", text).strip() or None

def valid_url(value, base):
    if not value:
        return None
    try:
        url = urlsplit(urljoin(base, value.strip()))
        if url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password:
            return None
        _ = url.port
        if any(c.isspace() for c in url.netloc):
            return None
        return urlunsplit((url.scheme.lower(), url.netloc.lower(), url.path, url.query, ""))
    except ValueError:
        return None

def clean_jobs(jobs: list[Job]) -> list[Job]:
    unique = {}
    for job in jobs:
        values = job.model_dump()
        for field in ("title", "company", "location", "description", "experience", "salary", "job_type"):
            values[field] = clean_text(values[field])
        # Preserve acronyms and proper names; normalize spacing rather than guessing casing.
        values["application_url"] = valid_url(job.application_url, job.source)
        if job.skills is not None:
            values["skills"] = list(dict.fromkeys(s for item in job.skills if (s := clean_text(item))))
        unique[job.id] = Job(**values)
    return list(unique.values())
