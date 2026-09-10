import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=False)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# _self.manage is storage-less by design: financial data lives in the user's own Google
# Spreadsheet (or their browser). The API therefore never receives or persists it.
app = FastAPI(title="_self.manage API")
api_router = APIRouter(prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "storage": "user-owned (google sheets / browser)"}


@api_router.get("/")
async def root():
    return {"message": "_self.manage API", "persists_user_data": False}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
