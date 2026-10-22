import json
from app.core import settings
from app.database.repository import Repository
from fastapi import HTTPException

def jobs_all():
    try:
        rows = Repository().all('jobs', {'is_active': 'eq.true'})
        # Filter out any legacy demo jobs
        real_rows = [r for r in rows if not r.get('is_demo') and 'fake-jobs' not in (r.get('source') or '')]
        if real_rows:
            return real_rows
    except Exception:
        pass

    # If no real jobs in database yet, scrape live from recruitment websites
    try:
        from app.services.live_scraper import collect_all_real_jobs
        fresh_jobs = collect_all_real_jobs(limit_total=100)
        if fresh_jobs:
            repo = Repository(privileged=True)
            for start in range(0, len(fresh_jobs), 50):
                try:
                    repo.write('jobs', fresh_jobs[start:start+50], conflict='id')
                except Exception:
                    pass
            return fresh_jobs
    except Exception as exc:
        import logging
        logging.error("Automatic live job scraping failed: %s", exc)

    return []

def refresh_live_jobs(limit_total=100):
    from app.services.live_scraper import collect_all_real_jobs
    fresh_jobs = collect_all_real_jobs(limit_total=limit_total)
    if fresh_jobs:
        repo = Repository(privileged=True)
        for start in range(0, len(fresh_jobs), 50):
            try:
                repo.write('jobs', fresh_jobs[start:start+50], conflict='id')
            except Exception:
                pass
    return fresh_jobs

def find_job(job_id):
    for job in jobs_all():
        if str(job['id']) == str(job_id):
            return job
    raise HTTPException(404, 'Job not found')

def filter_rows(rows, q=None, title=None, company=None, location=None, skills=None, department=None,
                experience=None, job_type=None, work_mode=None, salary_min=None, source=None, sort='date'):
    def contains(value, query):
        return not query or query.casefold() in (value or '').casefold()

    filtered = []
    for job in rows:
        if not contains(' '.join([job.get(k) or '' for k in ('title', 'company', 'location', 'description')] + (job.get('skills') or [])), q):
            continue
        if not all(contains(job.get(k), v) for k, v in [('title', title), ('company', company), ('location', location), ('department', department), ('job_type', job_type), ('work_mode', work_mode), ('source', source)]):
            continue
        if skills and not {s.strip().casefold() for s in skills.split(',') if s.strip()}.issubset({s.casefold() for s in job.get('skills') or []}):
            continue
        if experience is not None and (job.get('experience_min') is None or job['experience_min'] > experience):
            continue
        if salary_min is not None and (job.get('salary_max') is None or job['salary_max'] < salary_min):
            continue
        filtered.append(job)

    if sort == 'title':
        filtered.sort(key=lambda j: (j.get('title') or '').casefold())
    else:
        filtered.sort(key=lambda j: (j.get('posted_date') or '', j['id']), reverse=True)
    return filtered

def paginate(rows, page=1, page_size=12):
    return {
        'items': rows[(page - 1) * page_size : page * page_size],
        'total': len(rows),
        'page': page,
        'page_size': page_size
    }
