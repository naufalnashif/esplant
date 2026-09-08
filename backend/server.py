import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from lib.db_sql import db_sql

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Esplan Backend SQL Server (Engine: %s)...", db_sql.db_type)
    yield


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "db_engine": db_sql.db_type}


@api_router.get("/")
async def root():
    return {"message": "Esplan Financial Tracker API", "db_engine": db_sql.db_type}


@api_router.get("/state")
async def get_finance_state():
    state_data = db_sql.get_state()
    return {"state": state_data}


@api_router.post("/state")
async def save_finance_state(payload: Dict[str, Any]):
    state_data = payload.get("state", payload)
    ok = db_sql.save_state(state_data)
    return {"status": "saved" if ok else "error", "engine": db_sql.db_type}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
