import csv
import io
import json
import logging
from datetime import datetime, timezone
from fastapi import HTTPException
from app.core import settings
from app.database.repository import Repository
from app.scrapers.practice_scraper import PracticeScraper
from app.scrapers.approved_api import ApprovedJSONAPI
from app.scrapers.base_scraper import AccessDenied
from app.services.cleaner import clean_jobs

def claim_collection(source_id):
    repo = Repository(privileged=True)
    if repo.is_supabase:
        try:
            source = repo.request('POST', '/rest/v1/rpc/claim_scrape_source', payload={'source_key': source_id}).json()
        except HTTPException:
            raise HTTPException(409, 'Source disabled, blocked, or still in cooldown; review source configuration')
    else:
        sources = repo.select('scraping_sources', {'id': 'eq.' + source_id})
        if not sources or not sources[0].get('enabled') or not sources[0].get('permitted') or sources[0].get('access_denied'):
            raise HTTPException(409, 'Source disabled, blocked, or unpermitted')
        source = sources[0]

    log = repo.write('scraping_logs', {'source_id': source_id, 'status': 'running'})[0]
    return source, log['id']

def collect_claimed(source, log_id):
    repo = Repository(privileged=True)
    try:
        if source['adapter'] == 'practice':
            if str(source['url']).rstrip('/') != PracticeScraper.source_url.rstrip('/'):
                raise ValueError('Practice adapter URL must remain the approved practice source')
            scraper = PracticeScraper()
        else:
            scraper = ApprovedJSONAPI(source)

        jobs = clean_jobs(scraper.scrape())
        if not jobs:
            raise ValueError('Source returned no valid jobs')

        rows = [{**j.model_dump(mode='json'), 'is_demo': source['adapter'] == 'practice'} for j in jobs]
        existing_ids = {str(row['id']) for row in repo.all('jobs', select='id')}
        inserted_count = 0
        updated_count = 0
        for start in range(0, len(rows), 100):
            batch = rows[start:start+100]
            batch_existing = {str(row['id']) for row in batch if str(row['id']) in existing_ids}
            repo.write('jobs', batch, conflict='id')
            updated_count += len(batch_existing)
            inserted_count += len(batch) - len(batch_existing)
            existing_ids.update(str(row['id']) for row in batch)

        for job in rows:
            repo.delete('job_skills', {'job_id': 'eq.' + job['id']})
            if job.get('skills'):
                repo.write('job_skills', [{'job_id': job['id'], 'skill': s, 'evidence': 'Explicit source field'} for s in job['skills']], conflict='job_id,skill')

        settings.ROOT.joinpath('data').mkdir(exist_ok=True)
        settings.ROOT.joinpath('data/jobs.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows([{**r, 'skills': json.dumps(r['skills']) if r['skills'] is not None else None} for r in rows])
        settings.ROOT.joinpath('data/jobs.csv').write_text(output.getvalue(), encoding='utf-8')

        now = datetime.now(timezone.utc).isoformat()
        repo.update('scraping_sources', {'last_success': now}, {'id': 'eq.' + source['id']})
        repo.update('scraping_logs', {
            'status': 'success',
            'job_count': len(rows),
            'inserted_count': inserted_count,
            'updated_count': updated_count,
            'finished_at': now
        }, {'id': 'eq.' + log_id})
        logging.info('Collected %s jobs from %s', len(rows), source['id'])
    except Exception as exc:
        logging.exception('Collection failed')
        if isinstance(exc, AccessDenied):
            repo.update('scraping_sources', {'access_denied': True}, {'id': 'eq.' + source['id']})
        repo.update('scraping_logs', {'status': 'failed', 'error': type(exc).__name__, 'finished_at': datetime.now(timezone.utc).isoformat()}, {'id': 'eq.' + log_id})

def scheduled_collection():
    repo = Repository(privileged=True)
    for source in repo.all('scraping_sources', {'enabled': 'eq.true', 'permitted': 'eq.true', 'access_denied': 'eq.false'}):
        try:
            claimed, log_id = claim_collection(source['id'])
            collect_claimed(claimed, log_id)
        except HTTPException as exc:
            if exc.status_code != 409:
                logging.exception('Scheduled collection failed')
