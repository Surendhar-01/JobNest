import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
DATA = ROOT / "data"
SOURCE_URL = "https://realpython.github.io/fake-jobs/"
PERMISSION_URL = "https://realpython.com/beautiful-soup-web-scraper-python/"
TIMEOUT = float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20"))
RETRIES = int(os.getenv("MAX_RETRIES", "3"))
INTERVAL = max(3600, int(os.getenv("SCRAPE_INTERVAL_SECONDS", "3600")))
BACKEND = os.getenv("STORAGE_BACKEND", "local")
if BACKEND not in {"local", "supabase"}:
    raise ValueError("STORAGE_BACKEND must be local or supabase")
if TIMEOUT <= 0 or not 0 <= RETRIES <= 5:
    raise ValueError("Timeout must be positive and retries between 0 and 5")

FETCH_DETAILS = os.getenv("FETCH_DETAILS", "true").lower() == "true"
DETAIL_DELAY_SECONDS = max(1.0, float(os.getenv("DETAIL_DELAY_SECONDS", "1")))
