"""Explicit one-time model download; normal API calls use local cache only."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.core import settings
from sentence_transformers import SentenceTransformer
SentenceTransformer(settings.MODEL,device='cpu',local_files_only=False)
print('Semantic model cached. Restart the backend to use it.')
