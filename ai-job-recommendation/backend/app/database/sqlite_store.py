"""Persistent SQLite database and local file storage fallback.
Enables full application functionality (Auth, Jobs, Resumes, NLP, AI Recommendations, Saved Jobs, Applications, Admin Scrapers)
both in offline/local mode and when Supabase credentials are not yet configured.
"""
import hashlib
import hmac
import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

DATA_DIR = Path(__file__).resolve().parents[2] / 'data'
DB_PATH = DATA_DIR / 'app.db'
STORAGE_DIR = DATA_DIR / 'resumes'
SECRET_KEY = os.getenv('JWT_SECRET', 'pathfinder-local-secret-key-32charsmin!')

JSON_FIELDS = {
    'technical_skills', 'soft_skills', 'certifications', 'projects',
    'skills', 'analysis', 'history', 'explanation', 'config', 'details'
}

def get_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS auth_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL DEFAULT '',
        email TEXT,
        role TEXT NOT NULL DEFAULT 'student',
        phone TEXT,
        photo_url TEXT,
        department TEXT,
        degree TEXT,
        college TEXT,
        graduation_year INTEGER,
        current_location TEXT,
        preferred_location TEXT,
        preferred_job_type TEXT,
        expected_salary REAL,
        technical_skills TEXT NOT NULL DEFAULT '[]',
        soft_skills TEXT NOT NULL DEFAULT '[]',
        certifications TEXT NOT NULL DEFAULT '[]',
        projects TEXT NOT NULL DEFAULT '[]',
        internship_experience TEXT,
        work_experience TEXT,
        experience_years REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        source_job_id TEXT,
        title TEXT,
        company TEXT,
        location TEXT,
        description TEXT,
        skills TEXT DEFAULT '[]',
        experience TEXT,
        salary TEXT,
        job_type TEXT,
        posted_date TEXT,
        application_url TEXT,
        source TEXT NOT NULL,
        collected_at TEXT NOT NULL,
        qualification TEXT,
        department TEXT,
        work_mode TEXT,
        experience_min REAL,
        salary_min REAL,
        salary_max REAL,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(source, source_job_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS user_skills (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'technical',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, skill)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        storage_path TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploaded',
        extracted_text TEXT,
        analysis TEXT,
        reviewed INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS job_skills (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        mandatory INTEGER NOT NULL DEFAULT 0,
        evidence TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(job_id, skill)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS saved_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, job_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Applied',
        notes TEXT NOT NULL DEFAULT '',
        history TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, job_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        score REAL NOT NULL,
        explanation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, job_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS scraping_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        permission_url TEXT NOT NULL,
        adapter TEXT NOT NULL DEFAULT 'practice',
        enabled INTEGER NOT NULL DEFAULT 1,
        permitted INTEGER NOT NULL DEFAULT 1,
        interval_seconds INTEGER NOT NULL DEFAULT 3600,
        config TEXT NOT NULL DEFAULT '{}',
        access_denied INTEGER NOT NULL DEFAULT 0,
        last_attempt TEXT,
        last_success TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS scraping_logs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL,
        job_count INTEGER DEFAULT 0,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # Backward compatibility column migrations
    for col, col_type in [('created_at', 'TEXT'), ('updated_at', 'TEXT')]:
        try:
            cur.execute(f"ALTER TABLE scraping_logs ADD COLUMN {col} {col_type}")
        except Exception:
            pass
        try:
            cur.execute(f"ALTER TABLE admin_activity_logs ADD COLUMN {col} {col_type}")
        except Exception:
            pass

    conn.commit()

    # Pre-seed default scraping source
    cur.execute("""
    INSERT OR IGNORE INTO scraping_sources (id, name, url, permission_url, adapter, enabled, permitted, created_at, updated_at)
    VALUES ('fake-jobs', 'Real Python practice jobs', 'https://realpython.github.io/fake-jobs/',
            'https://realpython.com/beautiful-soup-web-scraper-python/', 'practice', 1, 1, datetime('now'), datetime('now'))
    """)
    conn.commit()

    # Pre-seed demo users
    cur.execute("SELECT COUNT(*) as count FROM auth_users")
    if cur.fetchone()['count'] == 0:
        seed_users(conn)

    # Pre-seed jobs from practice-jobs.json if jobs table empty
    cur.execute("SELECT COUNT(*) as count FROM jobs")
    if cur.fetchone()['count'] == 0:
        seed_jobs(conn)

    conn.close()

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def seed_users(conn):
    cur = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    # 1. Admin
    admin_id = str(uuid4())
    cur.execute("INSERT OR IGNORE INTO auth_users VALUES (?, ?, ?, ?, ?)",
                (admin_id, 'admin@pathfinder.io', hash_pw('DemoPassword123!'), 'admin', now))
    cur.execute("""INSERT OR IGNORE INTO profiles
                   (id, full_name, email, role, department, degree, college, graduation_year, technical_skills, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (admin_id, 'System Administrator', 'admin@pathfinder.io', 'admin', 'Computer Science',
                 'M.Tech', 'K S Rangasamy College of Technology (Autonomous)', 2020, json.dumps(['Python', 'SQL', 'FastAPI', 'Docker']), now, now))

    # 2. Student
    student_id = str(uuid4())
    cur.execute("INSERT OR IGNORE INTO auth_users VALUES (?, ?, ?, ?, ?)",
                (student_id, 'alex.student@pathfinder.io', hash_pw('DemoPassword123!'), 'student', now))
    cur.execute("""INSERT OR IGNORE INTO profiles
                   (id, full_name, email, role, department, degree, college, graduation_year, current_location,
                    preferred_location, technical_skills, soft_skills, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (student_id, 'Alex Morgan', 'alex.student@pathfinder.io', 'student', 'Computer Science',
                 'B.Tech', 'K S Rangasamy College of Technology (Autonomous)', 2025, 'KSR Kalvi Nagar, Tiruchengode', 'Remote',
                 json.dumps(['Python', 'JavaScript', 'React', 'SQL', 'Git', 'FastAPI']),
                 json.dumps(['Problem Solving', 'Teamwork', 'Communication']), now, now))
    conn.commit()

def seed_jobs(conn):
    try:
        from app.services.live_scraper import collect_all_real_jobs
        jobs = collect_all_real_jobs(limit_total=100)
        cur = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        # Clean up any legacy demo jobs
        cur.execute("DELETE FROM jobs WHERE is_demo = 1 OR source LIKE '%fake-jobs%'")
        for j in jobs:
            cur.execute("""
            INSERT OR REPLACE INTO jobs
            (id, source_job_id, title, company, location, description, skills, experience, salary,
             job_type, posted_date, application_url, source, collected_at, qualification, department,
             work_mode, experience_min, is_active, is_demo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                j.get('id'), j.get('source_job_id'), j.get('title'), j.get('company'),
                j.get('location'), j.get('description'), json.dumps(j.get('skills') or []),
                j.get('experience'), j.get('salary'), j.get('job_type') or 'Full-time',
                j.get('posted_date'), j.get('application_url'), j.get('source'),
                j.get('collected_at') or now, j.get('qualification') or "Bachelor's Degree",
                j.get('department') or 'Computer Science & Engineering', j.get('work_mode') or 'On-site',
                j.get('experience_min') or 0, 1, 0, now, now
            ))
            # Insert skills into job_skills
            for skill in j.get('skills') or []:
                skill_id = f"{j['id']}_{skill}"
                cur.execute("""
                INSERT OR IGNORE INTO job_skills (id, job_id, skill, mandatory, evidence, created_at, updated_at)
                VALUES (?, ?, ?, 1, 'Extracted requirement', ?, ?)
                """, (skill_id, j['id'], skill, now, now))
        conn.commit()
        logging.info("Seeded %d live recruitment jobs into SQLite.", len(jobs))
    except Exception as e:
        logging.warning("Could not pre-seed real jobs: %s", e)

# Token generation and verification
import base64

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'sub': user_id,
        'email': email,
        'role': role,
        'exp': int(time.time()) + 86400 * 7
    }
    payload_bytes = json.dumps(payload).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{sig}"

def verify_jwt_token(token: str) -> dict | None:
    try:
        parts = token.split('.', 1)
        if len(parts) != 2:
            return None
        b64_payload, sig = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padded = b64_payload + '=' * (-len(b64_payload) % 4)
        payload_bytes = base64.urlsafe_b64decode(padded)
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get('exp', 0) < time.time():
            return None
        return payload
    except Exception:
        return None

class SQLiteRepository:
    def __init__(self, token=None, privileged=False):
        init_db()
        self.conn = get_connection()
        self.privileged = privileged
        self.token = token

    def _parse_filter(self, key: str, val: str):
        # PostgREST format: "eq.something", "neq.something", "is.true", etc.
        if isinstance(val, str) and '.' in val:
            op, arg = val.split('.', 1)
            if op == 'eq':
                if arg.lower() == 'true': return f"{key} = 1", []
                if arg.lower() == 'false': return f"{key} = 0", []
                if arg.lower() == 'null': return f"{key} IS NULL", []
                return f"{key} = ?", [arg]
            if op == 'neq':
                return f"{key} != ?", [arg]
            if op == 'like':
                return f"{key} LIKE ?", [arg]
            if op == 'ilike':
                return f"LOWER({key}) LIKE LOWER(?)", [arg]
        return f"{key} = ?", [val]

    def _format_row(self, row):
        if not row:
            return None
        d = dict(row)
        for k in list(d.keys()):
            if k in JSON_FIELDS and isinstance(d[k], str):
                try:
                    d[k] = json.loads(d[k])
                except Exception:
                    pass
            elif k in ('is_active', 'is_demo', 'reviewed', 'enabled', 'permitted', 'access_denied', 'mandatory'):
                if d[k] is not None:
                    d[k] = bool(d[k])
        return d

    def select(self, table, filters=None, order=None, limit=500, offset=0, select='*'):
        cur = self.conn.cursor()
        where_clauses, params = [], []
        if filters:
            for k, v in filters.items():
                clause, p = self._parse_filter(k, v)
                where_clauses.append(clause)
                params.extend(p)

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        order_sql = ""
        if order:
            parts = order.split('.')
            col = parts[0]
            direction = parts[1].upper() if len(parts) > 1 else 'ASC'
            order_sql = f" ORDER BY {col} {direction}"

        query = f"SELECT {select} FROM {table}{where_sql}{order_sql} LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur.execute(query, params)
        rows = cur.fetchall()
        return [self._format_row(r) for r in rows]

    def all(self, table, filters=None, order='id.asc', select='*'):
        return self.select(table, filters, order, limit=10000, offset=0, select=select)

    def _table_cols(self, table):
        cur = self.conn.cursor()
        cur.execute(f"PRAGMA table_info({table})")
        return {r['name'] for r in cur.fetchall()}

    def write(self, table, rows, conflict=None):
        if not rows:
            return []
        if isinstance(rows, dict):
            rows = [rows]

        cur = self.conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        results = []
        valid_cols = self._table_cols(table)

        for row_dict in rows:
            data = dict(row_dict)
            if 'id' not in data or not data['id']:
                data['id'] = str(uuid4())
            if 'created_at' in valid_cols and 'created_at' not in data:
                data['created_at'] = now
            if 'updated_at' in valid_cols and 'updated_at' not in data:
                data['updated_at'] = now
            if 'started_at' in valid_cols and 'started_at' not in data:
                data['started_at'] = now

            for k in list(data.keys()):
                if k not in valid_cols:
                    del data[k]
                    continue
                if k in JSON_FIELDS and not isinstance(data[k], str):
                    data[k] = json.dumps(data[k])
                elif isinstance(data[k], bool):
                    data[k] = 1 if data[k] else 0

            cols = list(data.keys())
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join(cols)

            if conflict:
                conflict_cols = [c.strip() for c in conflict.split(',') if c.strip() in valid_cols]
                update_cols = [c for c in cols if c not in conflict_cols and c != 'id']
                update_stmt = ', '.join([f"{c} = excluded.{c}" for c in update_cols])
                sql = f"""
                INSERT INTO {table} ({col_names})
                VALUES ({placeholders})
                ON CONFLICT({', '.join(conflict_cols)}) DO UPDATE SET {update_stmt}
                """
            else:
                sql = f"INSERT OR REPLACE INTO {table} ({col_names}) VALUES ({placeholders})"

            cur.execute(sql, list(data.values()))
            results.append(data['id'])

        self.conn.commit()
        if not results:
            return []
        if len(results) == 1:
            return self.select(table, {'id': f"eq.{results[0]}"})
        return [{'id': i} for i in results]

    def update(self, table, values, filters):
        cur = self.conn.cursor()
        data = dict(values)
        valid_cols = self._table_cols(table)
        if 'updated_at' in valid_cols:
            data['updated_at'] = datetime.now(timezone.utc).isoformat()

        for k in list(data.keys()):
            if k not in valid_cols:
                del data[k]
                continue
            if k in JSON_FIELDS and not isinstance(data[k], str):
                data[k] = json.dumps(data[k])
            elif isinstance(data[k], bool):
                data[k] = 1 if data[k] else 0

        set_clause = ', '.join([f"{k} = ?" for k in data.keys()])
        params = list(data.values())

        where_clauses = []
        if filters:
            for k, v in filters.items():
                clause, p = self._parse_filter(k, v)
                where_clauses.append(clause)
                params.extend(p)

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        cur.execute(f"UPDATE {table} SET {set_clause}{where_sql}", params)
        self.conn.commit()
        return self.select(table, filters)

    def delete(self, table, filters):
        cur = self.conn.cursor()
        where_clauses, params = [], []
        if filters:
            for k, v in filters.items():
                clause, p = self._parse_filter(k, v)
                where_clauses.append(clause)
                params.extend(p)
        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        cur.execute(f"DELETE FROM {table}{where_sql}", params)
        self.conn.commit()

    def count(self, table):
        cur = self.conn.cursor()
        cur.execute(f"SELECT COUNT(*) as count FROM {table}")
        return cur.fetchone()['count']

    def upload(self, path, data, mime):
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        target = STORAGE_DIR / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def download(self, path):
        target = STORAGE_DIR / path
        if not target.exists():
            raise FileNotFoundError(f"Stored resume not found: {path}")
        return target.read_bytes()

    def remove_file(self, path):
        target = STORAGE_DIR / path
        if target.exists():
            target.unlink()
