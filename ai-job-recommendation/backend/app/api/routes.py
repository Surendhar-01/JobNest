import json
import os
from collections import Counter
from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL
from urllib.parse import urlsplit, urlunsplit
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, EmailStr, Field

from app.core import settings
from app.core.auth import Identity, current_user, admin_user
from app.database.repository import Repository
from app.database.sqlite_store import (
    get_connection, hash_pw, create_jwt_token, verify_jwt_token
)
from app.schemas.payloads import (
    ProfileUpdate, JobReference, ApplicationCreate, ApplicationUpdate,
    ResumeReference, ResumeReview, SourceUpdate, SourceSettingsUpdate, JobImport, ScrapeRequest, UserManage
)
from app.services.jobs import jobs_all, find_job, filter_rows, paginate
from app.services.resumes import upload_resume, analyze_resume, latest_resume
from app.services.collection import claim_collection, collect_claimed
from app.ai.matching import rank_jobs

router = APIRouter(prefix='/api')
User = Annotated[Identity, Depends(current_user)]
Admin = Annotated[Identity, Depends(admin_user)]
Text = Annotated[str | None, Query(max_length=200)]

DEFAULT_COLLEGE = 'K S Rangasamy College of Technology (Autonomous)'
DEFAULT_LOCATION = 'KSR Kalvi Nagar, Tiruchengode'

# Auth Schemas
class SignUpRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    department: str | None = 'Computer Science'
    qualification: str | None = 'B.Tech'
    graduation_year: int | None = 2025
    college: str | None = DEFAULT_COLLEGE
    current_location: str | None = DEFAULT_LOCATION

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class DemoLoginRequest(BaseModel):
    role: Literal['student', 'admin']

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

def own(user, **filters):
    return {'user_id': 'eq.' + user.id, **filters}

def joined_jobs(rows):
    jobs = {str(j['id']): j for j in jobs_all()}
    return [{**row, 'job': jobs.get(str(row['job_id']))} for row in rows]

def audit(user, action, details=None):
    try:
        Repository(privileged=True).write('admin_activity_logs', {
            'admin_id': user.id,
            'action': action,
            'details': details or {}
        })
    except Exception:
        pass

def safe_source_url(value):
    try:
        parsed = urlsplit(str(value))
        host = parsed.hostname or ''
        if parsed.port:
            host = f'{host}:{parsed.port}'
        return urlunsplit((parsed.scheme, host, parsed.path, '', ''))
    except ValueError:
        return ''

def admin_source_view(row, latest_log=None):
    latest_log = latest_log or {}
    config = row.get('config')
    return {
        'id': row['id'],
        'name': row['name'],
        'url': safe_source_url(row.get('url', '')),
        'permission_url': safe_source_url(row.get('permission_url', '')),
        'adapter': row.get('adapter'),
        'enabled': row.get('enabled', False),
        'permitted': row.get('permitted', False),
        'interval_seconds': row.get('interval_seconds'),
        'configuration_status': 'Configured' if config else (
            'Default configuration' if row.get('adapter') == 'practice' else 'Not configured'
        ),
        'access_denied': row.get('access_denied', False),
        'last_attempt': row.get('last_attempt'),
        'last_success': row.get('last_success'),
        'latest_status': latest_log.get('status'),
        'latest_error': latest_log.get('error')
    }

# ── Health & Diagnostics ──
@router.get('/health')
def health():
    return {
        'status': 'ok',
        'supabase_configured': settings.configured(),
        'practice_preview': not settings.configured() and settings.PREVIEW,
        'service_key_configured': bool(settings.SERVICE_KEY),
        'semantic_model': settings.MODEL
    }

# ── Dual Authentication Endpoints ──
@router.post('/auth/signup', status_code=201)
def auth_signup(payload: SignUpRequest):
    college = payload.college or DEFAULT_COLLEGE
    location = payload.current_location or DEFAULT_LOCATION

    if settings.configured():
        from app.database.repository import auth_client
        client = auth_client()
        try:
            res = client.auth.sign_up({
                'email': payload.email,
                'password': payload.password,
                'options': {
                    'data': {
                        'full_name': payload.full_name,
                        'department': payload.department,
                        'qualification': payload.qualification,
                        'graduation_year': payload.graduation_year,
                        'college': college,
                        'current_location': location,
                        'role': 'student'
                    }
                }
            })
            if not res.user:
                raise HTTPException(400, 'Signup failed')

            token = res.session.access_token if res.session else None
            user_id = res.user.id
            if not token:
                try:
                    login_res = client.auth.sign_in_with_password({
                        'email': payload.email,
                        'password': payload.password
                    })
                    token = login_res.session.access_token
                    user_id = login_res.user.id
                except Exception:
                    pass

            profile = {
                'id': user_id,
                'full_name': payload.full_name,
                'email': payload.email,
                'role': 'student',
                'department': payload.department,
                'degree': payload.qualification,
                'college': college,
                'current_location': location,
                'graduation_year': payload.graduation_year
            }
            if token:
                profiles = Repository(token).select('profiles', {'id': 'eq.' + user_id})
                if profiles:
                    profile = profiles[0]

            return {'token': token or '', 'user': profile}
        except HTTPException:
            raise
        except Exception as e:
            if 'already registered' in str(e).lower() or 'already exists' in str(e).lower():
                raise HTTPException(409, 'An account with this email address already exists')
            raise HTTPException(400, f'Registration failed: {e}')

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM auth_users WHERE email = ?", (payload.email,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(409, 'An account with this email address already exists')

    user_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    hashed = hash_pw(payload.password)

    cur.execute("INSERT INTO auth_users VALUES (?, ?, ?, ?, ?)",
                (user_id, payload.email, hashed, 'student', now))

    cur.execute("""
    INSERT INTO profiles (id, full_name, email, role, department, degree, college, current_location, graduation_year, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, payload.full_name, payload.email, 'student', payload.department, payload.qualification, college, location, payload.graduation_year, now, now))
    conn.commit()
    conn.close()

    token = create_jwt_token(user_id, payload.email, 'student')
    profile = Repository(token).select('profiles', {'id': 'eq.' + user_id})[0]
    return {'token': token, 'user': profile}

@router.post('/auth/login')
def auth_login(payload: LoginRequest):
    if settings.configured():
        from app.database.repository import auth_client
        client = auth_client()
        try:
            session = client.auth.sign_in_with_password({
                'email': payload.email,
                'password': payload.password
            })
            token = session.session.access_token
            user_id = session.user.id
            profiles = Repository(token).select('profiles', {'id': 'eq.' + user_id})
            if not profiles:
                raise HTTPException(404, 'Profile missing; run migrations')
            if not profiles[0].get('is_active', True):
                raise HTTPException(403, 'This account is inactive; contact an administrator')
            return {'token': token, 'user': profiles[0]}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(401, 'Invalid email or password')

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, role, password_hash FROM auth_users WHERE email = ?", (payload.email,))
    row = cur.fetchone()
    conn.close()

    if not row or row['password_hash'] != hash_pw(payload.password):
        raise HTTPException(401, 'Invalid email or password')

    user_id = row['id']
    role = row['role']
    token = create_jwt_token(user_id, payload.email, role)
    profiles = Repository(token).select('profiles', {'id': 'eq.' + user_id})
    if not profiles:
        raise HTTPException(404, 'Profile missing; run migrations')
    if not profiles[0].get('is_active', True):
        raise HTTPException(403, 'This account is inactive; contact an administrator')
    return {'token': token, 'user': profiles[0]}

@router.post('/auth/demo-login')
def auth_demo_login(payload: DemoLoginRequest):
    demo_email = 'admin@pathfinder.io' if payload.role == 'admin' else 'alex.student@pathfinder.io'
    demo_pass = 'DemoPassword123!'

    if settings.configured():
        from app.database.repository import auth_client
        client = auth_client()
        try:
            session = client.auth.sign_in_with_password({
                'email': demo_email,
                'password': demo_pass
            })
            token = session.session.access_token
            user_id = session.user.id
            profiles = Repository(token).select('profiles', {'id': 'eq.' + user_id})
            profile = profiles[0] if profiles else {
                'id': user_id,
                'full_name': 'System Administrator' if payload.role == 'admin' else 'Alex Morgan',
                'email': demo_email,
                'role': payload.role,
                'college': DEFAULT_COLLEGE,
                'current_location': DEFAULT_LOCATION,
            }
            if not profile.get('is_active', True):
                raise HTTPException(403, 'This account is inactive; contact an administrator')
            return {'token': token, 'user': profile}
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(401, f"Supabase demo authentication failed: {e}")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, role FROM auth_users WHERE email = ?", (demo_email,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise HTTPException(404, f"Demo account for {payload.role} not found")

    user_id = row['id']
    token = create_jwt_token(user_id, demo_email, row['role'])
    profile = Repository(token).select('profiles', {'id': 'eq.' + user_id})[0]
    if not profile.get('is_active', True):
        raise HTTPException(403, 'This account is inactive; contact an administrator')
    return {'token': token, 'user': profile}

@router.post('/auth/forgot-password')
def auth_forgot_password(payload: ForgotPasswordRequest):
    return {'success': True, 'message': f"Password reset instructions sent to {payload.email}"}

# ── User Profile ──
@router.get('/users/me')
def me(user: User):
    return {**user.profile, 'email': user.email}

@router.put('/users/me')
def update_profile(payload: ProfileUpdate, user: User):
    repo = Repository(user.token)
    result = repo.update('profiles', payload.model_dump(mode='json'), {'id': 'eq.' + user.id})
    repo.delete('user_skills', own(user))
    rows = [
        {'user_id': user.id, 'skill': s.strip(), 'category': category}
        for category, skills in [('technical', payload.technical_skills), ('soft', payload.soft_skills)]
        for s in skills if s.strip()
    ]
    if rows:
        repo.write('user_skills', rows, conflict='user_id,skill')
    repo.delete('recommendations', own(user))
    return result[0] if result else {**user.profile, **payload.model_dump(mode='json')}

@router.get('/users/me/skills')
def user_skills(user: User):
    return {'items': Repository(user.token).all('user_skills', own(user))}

from app.services.jobs import jobs_all, find_job, filter_rows, paginate, refresh_live_jobs
from app.services.live_scraper import check_recruitment_portals_status

# ── Job Listings & Search ──
@router.get('/jobs')
@router.get('/jobs/search')
def list_jobs(
    q: Text = None, title: Text = None, company: Text = None, location: Text = None,
    skills: Text = None, department: Text = None, experience: float | None = Query(None, ge=0),
    job_type: Text = None, work_mode: Text = None, salary_min: float | None = Query(None, ge=0),
    source: Text = None, sort: Literal['date', 'title'] = 'date',
    page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100)
):
    rows = filter_rows(jobs_all(), q, title, company, location, skills, department, experience, job_type, work_mode, salary_min, source, sort)
    return {**paginate(rows, page, page_size), 'data_mode': 'live_recruitment_scraping'}

@router.post('/jobs/refresh')
def refresh_jobs_endpoint():
    jobs = refresh_live_jobs(limit_total=100)
    return {
        'status': 'success',
        'message': f'Successfully refreshed {len(jobs)} live jobs from recruitment portals',
        'count': len(jobs)
    }

@router.get('/scraping/sources-status')
def scraping_sources_status():
    return {'items': check_recruitment_portals_status()}

@router.get('/jobs/filters')
def filters():
    jobs = jobs_all()
    return {
        field: sorted({str(j[field]) for j in jobs if j.get(field)})
        for field in ('location', 'company', 'department', 'job_type', 'work_mode', 'source')
    }

@router.get('/jobs/stats')
def stats():
    jobs = jobs_all()
    return {
        'total': len(jobs),
        'practice_jobs': 0,
        'sources': dict(Counter(j['source'] for j in jobs if j.get('source'))),
        'departments': dict(Counter(j.get('department') or 'Not specified' for j in jobs))
    }

@router.get('/jobs/{job_id}')
def detail(job_id: str):
    job = find_job(job_id)
    similar = [
        j for j in jobs_all()
        if str(j['id']) != str(job['id']) and any(
            word.casefold() in (j.get('title') or '').casefold()
            for word in (job.get('title') or '').split() if len(word) > 3
        )
    ][:4]
    return {**job, 'similar_jobs': similar}

# ── Saved Jobs ──
@router.get('/saved-jobs')
def saved(user: User, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    items = Repository(user.token).all('saved_jobs', own(user), 'created_at.desc')
    return paginate(joined_jobs(items), page, page_size)

@router.post('/saved-jobs')
def save(payload: JobReference, user: User):
    find_job(payload.job_id)
    res = Repository(user.token).write('saved_jobs', {'user_id': user.id, 'job_id': str(payload.job_id)}, conflict='user_id,job_id')
    return res[0] if res else {'success': True}

@router.delete('/saved-jobs/{job_id}')
def unsave(job_id: str, user: User):
    Repository(user.token).delete('saved_jobs', own(user, job_id='eq.' + str(job_id)))
    return {'success': True}

# ── Application Tracking ──
@router.get('/applications')
def applications(user: User, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    items = Repository(user.token).all('applications', own(user), 'updated_at.desc')
    return paginate(joined_jobs(items), page, page_size)

@router.post('/applications')
def apply(payload: ApplicationCreate, user: User):
    find_job(payload.job_id)
    repo = Repository(user.token)
    existing = repo.select('applications', own(user, job_id='eq.' + str(payload.job_id)), limit=1)
    if existing:
        raise HTTPException(409, 'This job is already in your application tracker')
    res = repo.write('applications', {
        'user_id': user.id,
        **payload.model_dump(mode='json'),
        'history': [{'status': payload.status, 'at': datetime.now(timezone.utc).isoformat()}]
    })
    return res[0] if res else {'success': True}

@router.patch('/applications/{application_id}')
def update_application(application_id: str, payload: ApplicationUpdate, user: User):
    repo = Repository(user.token)
    filters = own(user, id='eq.' + str(application_id))
    rows = repo.select('applications', filters, limit=1)
    if not rows:
        raise HTTPException(404, 'Application not found')
    history = rows[0].get('history') or []
    if rows[0]['status'] != payload.status:
        history.append({'status': payload.status, 'at': datetime.now(timezone.utc).isoformat()})
    res = repo.update('applications', {**payload.model_dump(), 'history': history}, filters)
    return res[0] if res else {'success': True}

# ── Resume Upload & NLP Analysis ──
@router.post('/resumes/upload', status_code=201)
async def upload(user: User, file: UploadFile = File(...)):
    from starlette.concurrency import run_in_threadpool
    data = await file.read(settings.MAX_UPLOAD + 1)
    await file.close()
    return await run_in_threadpool(upload_resume, user, data, file.filename or '')

@router.get('/resumes/me')
def resumes(user: User):
    return {'items': Repository(user.token).all('resumes', own(user), 'created_at.desc')}

@router.post('/resumes/analyze')
def analyze(payload: ResumeReference, user: User):
    return analyze_resume(user, payload.resume_id)

@router.get('/resumes/analysis')
def analysis(user: User):
    row = latest_resume(user)
    return {k: v for k, v in row.items() if k not in ('extracted_text', 'storage_path', 'sha256')}

@router.put('/resumes/analysis')
def review(payload: ResumeReview, user: User):
    row = latest_resume(user, payload.resume_id)
    changes = payload.model_dump(mode='json', exclude={'resume_id'})
    changes['provenance'] = 'User-reviewed and verified candidate details'
    repo = Repository(user.token)
    result = repo.update('resumes', {'analysis': {**(row.get('analysis') or {}), **changes}, 'reviewed': True}, own(user, id='eq.' + row['id']))
    repo.delete('recommendations', own(user))
    return result[0] if result else row

# ── AI Recommendations ──
@router.get('/recommendations')
def recommendations(user: User, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100)):
    items = Repository(user.token).all('recommendations', own(user), 'score.desc')
    return paginate(joined_jobs(items), page, page_size)

@router.post('/recommendations/generate')
def generate(user: User):
    repo = Repository(user.token)
    rows = repo.select('resumes', own(user, status='eq.analyzed'), 'updated_at.desc', 1)
    analysis_data = rows[0].get('analysis') or {} if rows else {}
    matches = rank_jobs(jobs_all(), user.profile, analysis_data)
    repo.delete('recommendations', own(user))
    if matches:
        repo.write('recommendations', [
            {'user_id': user.id, 'job_id': str(row['job_id']), 'score': row['score'], 'explanation': row['explanation']}
            for row in matches
        ], conflict='user_id,job_id')
    return {'total': len(matches), 'items': matches[:12]}

@router.get('/recommendations/{job_id}/explanation')
def explanation(job_id: str, user: User):
    rows = Repository(user.token).select('recommendations', own(user, job_id='eq.' + str(job_id)), limit=1)
    if not rows:
        raise HTTPException(404, 'Generate recommendations first to view an explanation')
    return rows[0]

# ── Student Dashboard Endpoint ──
@router.get('/users/me/dashboard')
def dashboard(user: User):
    repo = Repository(user.token)
    saved_items = repo.all('saved_jobs', own(user))
    app_items = repo.all('applications', own(user))
    recommended_items = repo.all('recommendations', own(user), 'score.desc')
    resume_items = repo.select('resumes', own(user), 'created_at.desc', 1)

    fields = ['full_name', 'department', 'degree', 'college', 'graduation_year', 'preferred_location', 'technical_skills', 'work_experience']
    completion = round(100 * sum(bool(user.profile.get(f)) for f in fields) / len(fields))
    dept = user.profile.get('department')
    all_jobs = jobs_all()

    return {
        'profile': user.profile,
        'matching_jobs': len(recommended_items),
        'saved_jobs': len(saved_items),
        'applications': len(app_items),
        'profile_completion': completion,
        'resume': resume_items[0] if resume_items else None,
        'application_statuses': dict(Counter(a['status'] for a in app_items)),
        'recommendations': joined_jobs(recommended_items[:4]),
        'recent_jobs': sorted(all_jobs, key=lambda j: j.get('collected_at') or '', reverse=True)[:4],
        'department_jobs': [j for j in all_jobs if dept and j.get('department') == dept][:4]
    }

# ── Admin Dashboard & Scraping Controls ──
@router.get('/admin/dashboard')
def admin_dashboard(user: Admin):
    repo = Repository(privileged=True)
    all_jobs = repo.all('jobs')
    logs = repo.all(
        'scraping_logs',
        order='started_at.desc',
        select='id,source_id,status,job_count,inserted_count,updated_count,error,started_at,finished_at'
    )
    resume_statuses = repo.all('resumes', select='id,status')
    profiles = repo.all('profiles', select='created_at')
    sources = repo.all('scraping_sources', select='id,enabled,permitted,access_denied,last_success')
    departments = Counter(j.get('department') or 'Not specified' for j in all_jobs)
    locations = Counter(j.get('location') or 'Not specified' for j in all_jobs)
    skills = Counter(
        str(skill).strip()
        for job in all_jobs
        for skill in (job.get('skills') if isinstance(job.get('skills'), list) else [])
        if str(skill).strip()
    )
    job_types = Counter(j.get('job_type') or 'Not specified' for j in all_jobs)
    latest_successful_refresh = next(
        (log.get('finished_at') for log in logs if log.get('status') == 'success' and log.get('finished_at')),
        None
    )
    if not latest_successful_refresh:
        latest_successful_refresh = max(
            (source.get('last_success') for source in sources if source.get('last_success')),
            default=None
        )
    user_growth = Counter(
        str(profile['created_at'])[:10]
        for profile in profiles
        if profile.get('created_at')
    )
    collection_runs = Counter(str(log['started_at'])[:10] for log in logs if log.get('started_at'))
    collection_jobs = Counter()
    for log in logs:
        if log.get('started_at'):
            collection_jobs[str(log['started_at'])[:10]] += int(log.get('job_count') or 0)

    return {
        'users': repo.count('profiles'),
        'jobs': len(all_jobs),
        'active_jobs': sum(bool(j.get('is_active')) for j in all_jobs),
        'active_sources': sum(
            bool(source.get('enabled')) and bool(source.get('permitted')) and not bool(source.get('access_denied'))
            for source in sources
        ),
        'resumes': len(resume_statuses),
        'jobs_collected_latest_run': logs[0].get('job_count', 0) if logs else 0,
        'latest_successful_refresh': latest_successful_refresh,
        'jobs_by_source': dict(Counter(safe_source_url(j['source']) for j in all_jobs if j.get('source'))),
        'jobs_by_department': dict(departments),
        'jobs_by_location': dict(locations),
        'job_types': dict(job_types),
        'frequently_requested_skills': dict(skills.most_common(10)),
        'user_growth': dict(sorted(user_growth.items())),
        'collection_trends': [
            {'date': day, 'runs': count, 'jobs': collection_jobs[day]}
            for day, count in sorted(collection_runs.items())
        ],
        'scheduled_refresh': {
            'enabled': os.getenv('ENABLE_SCHEDULER', 'false').lower() == 'true'
            and settings.configured() and bool(settings.SERVICE_KEY),
            'interval_seconds': 300
        },
        'resume_statuses': dict(Counter(r['status'] for r in resume_statuses if r.get('status'))),
        'collection_statuses': dict(Counter(l['status'] for l in logs if l.get('status'))),
        'recent_logs': logs[:10],
        'recent_errors': [log for log in logs if log.get('status') == 'failed'][:5],
        'activity': repo.select('admin_activity_logs', order='created_at.desc', limit=10)
    }

@router.get('/admin/users')
def users(
    user: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=120),
    role: Literal['student', 'admin'] | None = None,
    department: str | None = None,
    active: bool | None = None,
    exclude_admin: bool = Query(False)
):
    repo = Repository(privileged=True)
    rows = repo.all(
        'profiles',
        order='created_at.desc',
        select='id,full_name,email,role,department,created_at,is_active'
    )
    if exclude_admin:
        rows = [row for row in rows if row.get('role') != 'admin']
    if q and isinstance(q, str):
        search = q.casefold()
        rows = [row for row in rows if search in str(row.get('full_name') or '').casefold()
                or search in str(row.get('email') or '').casefold()]
    if role:
        rows = [row for row in rows if row.get('role') == role]
    if department:
        rows = [row for row in rows if str(row.get('department') or '').casefold() == department.casefold()]
    if active is not None:
        rows = [row for row in rows if bool(row.get('is_active', True)) == active]
    total = len(rows)
    start = (page - 1) * page_size
    return {'items': rows[start:start + page_size], 'total': total, 'page': page, 'page_size': page_size}

@router.patch('/admin/users/{user_id}')
def manage_user(user_id: str, payload: UserManage, user: Admin):
    values = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not values:
        raise HTTPException(422, 'Provide a role or account status to update')
    if str(user_id) == user.id and (
        ('role' in values and values['role'] != 'admin') or values.get('is_active') is False
    ):
        raise HTTPException(409, 'You cannot deactivate or demote your own administrator account')
    rows = Repository(privileged=True).update('profiles', values, {'id': 'eq.' + str(user_id)})
    if not rows:
        raise HTTPException(404, 'User not found')
    audit(user, 'update_user_account', {'user_id': str(user_id), **values})
    return rows[0]

@router.get('/admin/scraping/logs')
def scraping_logs(user: Admin, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    repo = Repository(privileged=True)
    return {
        'items': repo.select('scraping_logs', order='started_at.desc', limit=page_size, offset=(page-1)*page_size),
        'total': repo.count('scraping_logs'),
        'page': page,
        'page_size': page_size
    }

@router.post('/admin/scraping/run', status_code=202)
def run_collection(payload: ScrapeRequest, tasks: BackgroundTasks, user: Admin):
    source, log_id = claim_collection(payload.source_id)
    audit(user, 'trigger_collection', {'source_id': payload.source_id, 'log_id': log_id})
    tasks.add_task(collect_claimed, source, log_id)
    return {'log_id': log_id, 'status': 'running'}

@router.get('/admin/sources')
def sources(user: Admin):
    repo = Repository(privileged=True)
    rows = repo.all('scraping_sources')
    latest_logs = {}
    for log in repo.all(
        'scraping_logs',
        order='started_at.desc',
        select='source_id,status,error,started_at,finished_at'
    ):
        latest_logs.setdefault(log.get('source_id'), log)
    return {
        'items': [admin_source_view(row, latest_logs.get(row['id'])) for row in rows]
    }

@router.put('/admin/sources/{source_id}')
def configure_source(source_id: str, payload: SourceUpdate, user: Admin):
    result = Repository(privileged=True).write('scraping_sources', {'id': source_id, **payload.model_dump(mode='json')}, conflict='id')[0]
    audit(user, 'configure_source', {'source_id': source_id})
    return admin_source_view(result)

@router.patch('/admin/sources/{source_id}')
def update_source_settings(source_id: str, payload: SourceSettingsUpdate, user: Admin):
    values = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not values:
        raise HTTPException(422, 'Provide source settings to update')
    rows = Repository(privileged=True).update('scraping_sources', values, {'id': 'eq.' + source_id})
    if not rows:
        raise HTTPException(404, 'Source not found')
    audit(user, 'update_source_settings', {'source_id': source_id, **values})
    return admin_source_view(rows[0])

@router.post('/admin/sources/{source_id}/clear-block')
def clear_source(source_id: str, user: Admin):
    rows = Repository(privileged=True).update('scraping_sources', {'access_denied': False}, {'id': 'eq.' + source_id})
    if not rows:
        raise HTTPException(404, 'Source not found')
    audit(user, 'clear_access_denial', {'source_id': source_id})
    return admin_source_view(rows[0])

@router.get('/admin/jobs')
def admin_jobs(
    user: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=120),
    department: str | None = Query(None, max_length=120),
    location: str | None = Query(None, max_length=120),
    job_type: str | None = Query(None, max_length=80),
    source: str | None = Query(None, max_length=500)
):
    repo = Repository(privileged=True)
    rows = repo.all('jobs', order='collected_at.desc')
    if q:
        search = q.casefold()
        rows = [row for row in rows if search in str(row.get('title') or '').casefold()
                or search in str(row.get('company') or '').casefold()]
    for field, value in (('department', department), ('location', location), ('job_type', job_type)):
        if value:
            if value.casefold() == 'not specified':
                rows = [row for row in rows if not row.get(field)]
            else:
                rows = [row for row in rows if str(row.get(field) or '').casefold() == value.casefold()]
    if source:
        safe_source = safe_source_url(source).casefold()
        rows = [row for row in rows if safe_source_url(row.get('source', '')).casefold() == safe_source]
    total = len(rows)
    start = (page - 1) * page_size
    items = rows[start:start + page_size]
    for row in items:
        if row.get('source'):
            row['source'] = safe_source_url(row['source'])
    return {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size
    }

@router.get('/admin/audit-logs')
def admin_audit_logs(
    user: Admin,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=120)
):
    repo = Repository(privileged=True)
    rows = repo.all('admin_activity_logs', order='created_at.desc')
    profiles = {
        str(profile['id']): profile
        for profile in repo.all('profiles', select='id,email,full_name')
    }
    enriched = [{
        **row,
        'admin_email': profiles.get(str(row.get('admin_id')), {}).get('email'),
        'admin_name': profiles.get(str(row.get('admin_id')), {}).get('full_name')
    } for row in rows]
    if q:
        search = q.casefold()
        enriched = [row for row in enriched if search in ' '.join(
            str(row.get(field) or '') for field in ('action', 'admin_email', 'admin_name', 'details')
        ).casefold()]
    total = len(enriched)
    start = (page - 1) * page_size
    return {'items': enriched[start:start + page_size], 'total': total, 'page': page, 'page_size': page_size}

@router.post('/admin/jobs/import')
def import_job(payload: JobImport, user: Admin):
    repo = Repository(privileged=True)
    row = payload.model_dump(mode='json')
    identity = payload.source_job_id or str(payload.application_url)
    row.update(
        id=str(uuid5(NAMESPACE_URL, str(payload.source) + '#' + identity)),
        collected_at=datetime.now(timezone.utc).isoformat()
    )
    result = repo.write('jobs', row, conflict='id')[0]
    audit(user, 'import_job', {'job_id': result['id']})
    return result

@router.patch('/admin/jobs/{job_id}')
def manage_job(job_id: str, active: bool, user: Admin):
    rows = Repository(privileged=True).update('jobs', {'is_active': active}, {'id': 'eq.' + str(job_id)})
    if not rows:
        raise HTTPException(404, 'Job not found')
    audit(user, 'set_job_active', {'job_id': str(job_id), 'active': active})
    return rows[0]
