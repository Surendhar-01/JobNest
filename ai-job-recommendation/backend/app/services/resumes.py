import hashlib
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException
from app.core import settings
from app.database.repository import Repository
from app.ai.resume import validate_file, extract_text, analyze_text

def latest_resume(user, resume_id=None):
    filters = {'user_id':'eq.'+user.id}
    if resume_id: filters['id']='eq.'+str(resume_id)
    rows = Repository(user.token).select('resumes',filters,'created_at.desc',1)
    if not rows: raise HTTPException(404,'No uploaded resume found')
    return rows[0]

def upload_resume(user,data,name):
    if not data or len(data)>settings.MAX_UPLOAD:
        raise HTTPException(413,'Resume must be nonempty and at most 10 MB')
    suffix = Path(name or '').suffix.lower()
    mime = validate_file(data,suffix)
    resume_id = str(uuid4())
    path = user.id+'/'+resume_id+suffix
    repo = Repository(user.token)
    repo.upload(path,data,mime)
    try:
        row = {'id':resume_id,'user_id':user.id,'file_name':Path(name.replace('\\','/')).name[:200],
               'storage_path':path,'mime_type':mime,'size_bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'status':'uploaded'}
        return repo.write('resumes',row)[0]
    except Exception:
        repo.remove_file(path)
        raise

def analyze_resume(user,resume_id=None):
    resume = latest_resume(user,resume_id)
    repo = Repository(user.token)
    filters = {'id':'eq.'+resume['id'],'user_id':'eq.'+user.id}
    repo.update('resumes',{'status':'analyzing','error':None},filters)
    try:
        data = repo.download(resume['storage_path'])
        if len(data)>settings.MAX_UPLOAD: raise HTTPException(413,'Stored resume exceeds processing limits')
        text = extract_text(data,Path(resume['file_name']).suffix.lower())
        analysis = analyze_text(text)
        result = repo.update('resumes',{'status':'analyzed','analysis':analysis,'extracted_text':text,'reviewed':False},filters)[0]
        repo.delete('recommendations',{'user_id':'eq.'+user.id})
        return result
    except Exception as exc:
        repo.update('resumes',{'status':'failed','error':exc.detail if isinstance(exc,HTTPException) else 'Resume processing failed'},filters)
        raise
