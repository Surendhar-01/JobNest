"""User JWTs are forwarded to PostgREST so RLS remains enforced.
When Supabase is not configured, seamlessly transparently delegates to SQLiteRepository.
"""
from functools import lru_cache
from urllib.parse import quote
import httpx
from fastapi import HTTPException
from app.core import settings
from app.database.sqlite_store import SQLiteRepository

@lru_cache
def auth_client():
    from supabase import create_client
    if not settings.configured():
        return None
    return create_client(settings.SUPABASE_URL, settings.ANON_KEY)

class Repository:
    def __init__(self, token=None, privileged=False):
        self.is_supabase = settings.configured()
        self.token = token
        self.privileged = privileged

        if not self.is_supabase:
            self._local = SQLiteRepository(token=token, privileged=privileged)
        else:
            self._local = None
            self.key = settings.SERVICE_KEY if privileged else settings.ANON_KEY
            self.token = self.key if privileged else (token or self.key)

    def request(self, method, path, params=None, payload=None, headers=None, content=None):
        if not self.is_supabase:
            raise HTTPException(500, "Direct PostgREST HTTP request called in SQLite mode")
        auth = {'apikey': self.key, 'Authorization': 'Bearer ' + self.token, **(headers or {})}
        try:
            with httpx.Client(timeout=30) as client:
                response = client.request(method, settings.SUPABASE_URL + path, params=params, json=payload, content=content, headers=auth)
            if response.status_code >= 400:
                status = response.status_code if response.status_code in (401, 403, 404, 409, 413) else 503
                raise HTTPException(status, 'Database or storage operation failed; check schema, permissions and configuration')
            return response
        except httpx.HTTPError:
            raise HTTPException(503, 'Supabase is temporarily unavailable')

    def select(self, table, filters=None, order=None, limit=500, offset=0, select='*'):
        if not self.is_supabase:
            return self._local.select(table, filters, order, limit, offset, select)
        params = {'select': select, 'limit': str(limit), 'offset': str(offset), **(filters or {})}
        if order:
            params['order'] = order
        return self.request('GET', '/rest/v1/' + table, params=params).json()

    def all(self, table, filters=None, order='id.asc', select='*'):
        if not self.is_supabase:
            return self._local.all(table, filters, order, select)
        rows, offset = [], 0
        while True:
            batch = self.select(table, filters, order, 500, offset, select)
            rows.extend(batch)
            if len(batch) < 500:
                return rows
            offset += 500

    def write(self, table, rows, conflict=None):
        if not self.is_supabase:
            return self._local.write(table, rows, conflict)
        headers = {'Prefer': 'return=representation' + (',resolution=merge-duplicates' if conflict else '')}
        params = {'on_conflict': conflict} if conflict else None
        return self.request('POST', '/rest/v1/' + table, params=params, payload=rows, headers=headers).json()

    def update(self, table, values, filters):
        if not self.is_supabase:
            return self._local.update(table, values, filters)
        return self.request('PATCH', '/rest/v1/' + table, params=filters, payload=values, headers={'Prefer': 'return=representation'}).json()

    def delete(self, table, filters):
        if not self.is_supabase:
            return self._local.delete(table, filters)
        self.request('DELETE', '/rest/v1/' + table, params=filters)

    def count(self, table):
        if not self.is_supabase:
            return self._local.count(table)
        response = self.request('HEAD', '/rest/v1/' + table, params={'select': 'id'}, headers={'Prefer': 'count=exact'})
        return int(response.headers['content-range'].split('/')[-1])

    def upload(self, path, data, mime):
        if not self.is_supabase:
            return self._local.upload(path, data, mime)
        self.request('POST', '/storage/v1/object/resumes/' + quote(path, safe='/'), content=data, headers={'Content-Type': mime, 'x-upsert': 'false'})

    def download(self, path):
        if not self.is_supabase:
            return self._local.download(path)
        return self.request('GET', '/storage/v1/object/authenticated/resumes/' + quote(path, safe='/')).content

    def remove_file(self, path):
        if not self.is_supabase:
            return self._local.remove_file(path)
        self.request('DELETE', '/storage/v1/object/resumes', payload={'prefixes': [path]})
