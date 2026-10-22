import json
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / '.env')
SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
CORS_ORIGINS = [x.strip() for x in os.getenv('CORS_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(',') if x.strip()]
PREVIEW = os.getenv('ALLOW_PRACTICE_PREVIEW', 'true').lower() == 'true'
MAX_UPLOAD = int(os.getenv('RESUME_MAX_BYTES', '10485760'))
MODEL = os.getenv('AI_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
MODEL_LOCAL_ONLY = os.getenv('AI_LOCAL_FILES_ONLY', 'true').lower() == 'true'
WEIGHTS = json.loads(os.getenv('MATCH_WEIGHTS', '{"semantic":0.45,"skills":0.25,"qualification":0.1,"experience":0.1,"location":0.05,"job_type":0.05}'))
if set(WEIGHTS) != {'semantic','skills','qualification','experience','location','job_type'} or any(not isinstance(v,(int,float)) or v < 0 for v in WEIGHTS.values()) or sum(WEIGHTS.values()) <= 0:
    raise ValueError('MATCH_WEIGHTS must define six nonnegative weights with a positive sum')

GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'openai/gpt-oss-120b')

def configured():
    return bool(SUPABASE_URL.startswith('https://') and ANON_KEY)
