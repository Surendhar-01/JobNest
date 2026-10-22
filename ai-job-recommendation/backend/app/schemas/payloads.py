from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class ProfileUpdate(StrictModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(None, max_length=30)
    photo_url: HttpUrl | None = None
    department: str | None = Field(None, max_length=100)
    degree: str | None = Field(None, max_length=120)
    college: str | None = Field(None, max_length=200)
    graduation_year: int | None = Field(None, ge=1950, le=2100)
    current_location: str | None = Field(None, max_length=150)
    preferred_location: str | None = Field(None, max_length=150)
    preferred_job_type: str | None = Field(None, max_length=60)
    expected_salary: float | None = Field(None, ge=0)
    technical_skills: list[str] = Field(default_factory=list, max_length=100)
    soft_skills: list[str] = Field(default_factory=list, max_length=100)
    certifications: list[str] = Field(default_factory=list, max_length=100)
    projects: list[str] = Field(default_factory=list, max_length=100)
    internship_experience: str | None = Field(None, max_length=5000)
    work_experience: str | None = Field(None, max_length=5000)
    experience_years: float | None = Field(None, ge=0, le=80)

class JobReference(StrictModel):
    job_id: UUID

class ApplicationCreate(JobReference):
    status: Literal['Saved','Applied','Interview','Offer','Rejected'] = 'Applied'
    notes: str = Field('', max_length=5000)

class ApplicationUpdate(StrictModel):
    status: Literal['Saved','Applied','Interview','Offer','Rejected']
    notes: str = Field('', max_length=5000)

class ResumeReference(StrictModel):
    resume_id: UUID | None = None

class ResumeReview(ResumeReference):
    full_name: str = Field('Not provided', max_length=200)
    college: str = Field('Not provided', max_length=300)
    current_year: str = Field('Not provided', max_length=100)
    department: str = Field('Not provided', max_length=200)
    graduation_year: str = Field('Not provided', max_length=50)
    cgpa: str = Field('Not provided', max_length=50)
    email: str = Field('Not provided', max_length=150)
    phone: str = Field('Not provided', max_length=100)
    location: str = Field('Not provided', max_length=150)
    linkedin_url: str = Field('Not provided', max_length=500)
    github_url: str = Field('Not provided', max_length=500)
    portfolio_url: str = Field('Not provided', max_length=500)
    technical_skills: list[str] = Field(default_factory=list, max_length=200)
    soft_skills: list[str] = Field(default_factory=list, max_length=100)
    skills: list[str] = Field(default_factory=list, max_length=200)
    educational_qualifications: list[str] = Field(default_factory=list, max_length=100)
    education: list[str] = Field(default_factory=list, max_length=100)
    work_experience: list[str] = Field(default_factory=list, max_length=100)
    internships: list[str] = Field(default_factory=list, max_length=100)
    experience: list[str] = Field(default_factory=list, max_length=100)
    projects: list[str] = Field(default_factory=list, max_length=100)
    certifications: list[str] = Field(default_factory=list, max_length=100)
    achievements: list[str] = Field(default_factory=list, max_length=100)
    summary: str = Field('', max_length=5000)

class SourceUpdate(StrictModel):
    name: str = Field(min_length=1,max_length=150)
    url: HttpUrl
    permission_url: HttpUrl
    adapter: Literal['practice','json_api']
    enabled: bool = False
    permitted: bool = False
    interval_seconds: int = Field(3600,ge=3600,le=2592000)
    config: dict = Field(default_factory=dict)

class JobImport(StrictModel):
    title: str = Field(min_length=1,max_length=200)
    company: str | None = Field(None,max_length=200)
    location: str | None = Field(None,max_length=200)
    description: str | None = Field(None,max_length=30000)
    skills: list[str] | None = None
    salary: str | None = None
    salary_min: float | None = Field(None,ge=0)
    salary_max: float | None = Field(None,ge=0)
    experience: str | None = None
    experience_min: float | None = Field(None,ge=0)
    qualification: str | None = None
    department: str | None = None
    job_type: str | None = None
    work_mode: Literal['Remote','Hybrid','On-site'] | None = None
    source: HttpUrl
    application_url: HttpUrl
    source_job_id: str | None = None
    posted_date: str | None = None
    is_demo: bool = False

class ScrapeRequest(StrictModel):
    source_id: str = 'fake-jobs'

class UserManage(StrictModel):
    role: Literal['student','admin']
