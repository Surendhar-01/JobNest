from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class Job(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    source_job_id: str | None = None
    title: str | None = None
    company: str | None = None
    location: str | None = None
    description: str | None = None
    skills: list[str] | None = None
    experience: str | None = None
    salary: str | None = None
    job_type: str | None = None
    posted_date: date | None = None
    application_url: str | None = None
    source: str
    collected_at: datetime
