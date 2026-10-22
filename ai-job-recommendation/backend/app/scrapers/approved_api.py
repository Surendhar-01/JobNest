"""Adapter for reviewed JSON APIs returning a jobs list; no automatic source discovery."""
import json
import time
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from datetime import datetime,timezone
from uuid import uuid5,NAMESPACE_URL
from app.scrapers.base_scraper import BaseScraper
from app.models.job import Job
from app.services.cleaner import valid_url

class ApprovedJSONAPI(BaseScraper):
    def __init__(self,source):
        self.source_url=source['url']
        self.permission_url=source['permission_url']
        self.config=source.get('config') or {}

    def parse(self,html):
        payload=json.loads(html)
        rows=payload if isinstance(payload,list) else payload.get(self.config.get('items_key','jobs'),[])
        mappings=self.config.get('fields',{})
        jobs=[]
        for row in rows:
            values={target:row.get(origin) for target,origin in mappings.items() if target in Job.model_fields and target not in ('id','source','collected_at')}
            source_id=values.get('source_job_id') or row.get('id')
            application=valid_url(values.get('application_url'),self.source_url)
            identity=str(source_id) if source_id is not None else application
            if not identity: continue
            values.update(id=str(uuid5(NAMESPACE_URL,self.source_url+'#'+identity)),source_job_id=str(source_id) if source_id is not None else None,
                          source=self.source_url,collected_at=datetime.now(timezone.utc),application_url=application)
            jobs.append(Job(**values))
        return jobs

    def scrape(self):
        jobs=[]
        maximum=min(10,max(1,int(self.config.get('max_pages',1))))
        page_parameter=self.config.get('page_parameter')
        for page in range(1,maximum+1):
            url=self.source_url
            if page_parameter:
                parts=urlsplit(url)
                query=dict(parse_qsl(parts.query)); query[page_parameter]=str(page)
                url=urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(query),''))
            elif page>1: break
            if page>1: time.sleep(max(1,float(self.config.get('request_delay_seconds',1))))
            batch=self.parse(self.fetch(url))
            if not batch: break
            jobs.extend(batch)
        return jobs
