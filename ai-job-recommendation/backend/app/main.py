import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core import settings
from app.api.routes import router

logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(name)s %(message)s')

@asynccontextmanager
async def lifespan(app):
    scheduler=None
    if os.getenv('ENABLE_SCHEDULER','false').lower()=='true' and settings.configured() and settings.SERVICE_KEY:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.collection import scheduled_collection
        scheduler=BackgroundScheduler(timezone='UTC')
        scheduler.add_job(scheduled_collection,'interval',seconds=300,max_instances=1,coalesce=True)
        scheduler.start()
    yield
    if scheduler: scheduler.shutdown(wait=False)

app=FastAPI(title='AI-Based Job Recommendation System',version='1.0.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=settings.CORS_ORIGINS,allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Authorization','Content-Type'],allow_credentials=False)
app.include_router(router)

@app.exception_handler(Exception)
async def unexpected(request:Request,exc:Exception):
    logging.exception('Unexpected API failure',exc_info=exc)
    return JSONResponse(status_code=500,content={'detail':'Unexpected server error; see backend logs'})
