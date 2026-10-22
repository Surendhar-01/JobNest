"""Import previously collected educational data without scraping again."""
import sys
import json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.core import settings
from app.database.repository import Repository
rows=json.loads((settings.ROOT/'data/practice-jobs.json').read_text(encoding='utf-8'))
repo=Repository(privileged=True)
for start in range(0,len(rows),100):
    repo.write('jobs',[{**j,'is_demo':True} for j in rows[start:start+100]],conflict='id')
print(f'Imported {len(rows)} clearly labeled practice jobs into Supabase.')
