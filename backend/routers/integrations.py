import base64
import hashlib
import html
import json
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, Optional

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from lib.db import db
from models.integrations import (
    GmailCandidate,
    GmailScanResponse,
    GmailStartResponse,
    GmailStatusResponse,
    ReportSendRequest,
    ReportSendResponse,
)

router = APIRouter(prefix="/integrations", tags=["integrations"])
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
APP_URL = os.environ.get("OAUTH_PUBLIC_URL", os.environ.get("APP_URL", "")).rstrip("/")
REDIRECT_URI = f"{APP_URL}/api/integrations/gmail/callback"


def _client_config() -> Dict[str, Any]:
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Gmail OAuth credentials are not configured")
    return {"web": {"client_id": client_id, "client_secret": client_secret, "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token"}}


def _fernet() -> Fernet:
    secret = os.environ.get("GOOGLE_CLIENT_SECRET", "esplant-local-secret").encode()
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def _decode_part(part: Dict[str, Any]) -> str:
    body = part.get("body", {}).get("data")
    if body:
        try:
            return base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)).decode("utf-8", errors="ignore")
        except (ValueError, UnicodeDecodeError):
            return ""
    return "".join(_decode_part(child) for child in part.get("parts", []))


def _parse_amount(text: str) -> Optional[float]:
    match = re.search(r"(?:Rp\.?\s?|IDR\s?)([\d.,]+)", text, re.IGNORECASE)
    if not match:
        return None
    digits = re.sub(r"\D", "", match.group(1))
    return float(digits) if digits else None


def _parse_candidate(message: Dict[str, Any]) -> Optional[GmailCandidate]:
    payload = message.get("payload", {})
    headers = {item.get("name", "").lower(): item.get("value", "") for item in payload.get("headers", [])}
    subject = headers.get("subject", "")
    body_text = _decode_part(payload)
    source_text = f"{subject}\n{body_text}"
    amount = _parse_amount(source_text)
    if amount is None:
        return None
    date_value = headers.get("date", "")
    try:
        parsed_date = parsedate_to_datetime(date_value).astimezone(timezone.utc).date().isoformat()
    except (TypeError, ValueError, OverflowError):
        parsed_date = datetime.now(timezone.utc).date().isoformat()
    merchant_match = re.search(r"(?:di|at|ke)\s+([A-Za-z0-9][A-Za-z0-9 .&'_-]{2,60})", source_text, re.IGNORECASE)
    merchant = merchant_match.group(1).strip(" .,-") if merchant_match else subject[:80] or "QRIS merchant"
    bank_match = re.search(r"\b(BCA|BNI|BRI|Mandiri|Blu|Wondr|Livin|GoPay|DANA|ShopeePay|OVO)\b", source_text, re.IGNORECASE)
    bank = bank_match.group(1) if bank_match else None
    category = "Food" if re.search(r"kopi|makan|resto|cafe|food", source_text, re.IGNORECASE) else "Other"
    return GmailCandidate(external_id=message.get("id", secrets.token_hex(8)), merchant=merchant, amount=amount, date=parsed_date, category=category, account_hint=bank)


async def _get_credentials() -> Credentials:
    record = await db.gmail_tokens.find_one({"key": "default"})
    if not record:
        raise HTTPException(status_code=401, detail="Gmail is not connected")
    try:
        payload = _fernet().decrypt(record["encrypted"].encode()).decode()
        credentials = Credentials.from_authorized_user_info(json.loads(payload))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Stored Gmail authorization is invalid") from exc
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())
        encrypted = _fernet().encrypt(credentials.to_json().encode()).decode()
        await db.gmail_tokens.update_one({"key": "default"}, {"$set": {"encrypted": encrypted, "updated_at": datetime.now(timezone.utc)}})
    return credentials


@router.get("/gmail/start", response_model=GmailStartResponse)
async def gmail_start() -> GmailStartResponse:
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    authorization_url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    await db.gmail_oauth_states.delete_many({"created_at": {"$lt": datetime.now(timezone.utc) - timedelta(minutes=10)}})
    await db.gmail_oauth_states.insert_one({"state": state, "created_at": datetime.now(timezone.utc)})
    return GmailStartResponse(authorization_url=authorization_url)


@router.get("/gmail/callback", response_class=HTMLResponse)
async def gmail_callback(code: str = Query(...), state: str = Query(...)) -> HTMLResponse:
    state_record = await db.gmail_oauth_states.find_one_and_delete({"state": state})
    if not state_record or state_record["created_at"] < datetime.now(timezone.utc) - timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="OAuth state expired")
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=state, redirect_uri=REDIRECT_URI)
    flow.fetch_token(code=code)
    encrypted = _fernet().encrypt(flow.credentials.to_json().encode()).decode()
    await db.gmail_tokens.update_one({"key": "default"}, {"$set": {"key": "default", "encrypted": encrypted, "updated_at": datetime.now(timezone.utc)}}, upsert=True)
    safe_origin = html.escape(APP_URL)
    return HTMLResponse(f"<script>window.opener?.postMessage({{type:'esplant-gmail-connected'}}, '{safe_origin}'); window.close();</script><p>Gmail connected. You can close this window.</p>")


@router.get("/gmail/status", response_model=GmailStatusResponse)
async def gmail_status() -> GmailStatusResponse:
    return GmailStatusResponse(connected=bool(await db.gmail_tokens.find_one({"key": "default"}, {"_id": 1})))


@router.post("/gmail/scan", response_model=GmailScanResponse)
async def gmail_scan() -> GmailScanResponse:
    credentials = await _get_credentials()
    service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
    result = service.users().messages().list(userId="me", q="newer_than:90d (QRIS OR pembayaran OR transaksi)", maxResults=50).execute()
    candidates = []
    for item in result.get("messages", []):
        message = service.users().messages().get(userId="me", id=item["id"], format="full").execute()
        candidate = _parse_candidate(message)
        if candidate:
            candidates.append(candidate)
    return GmailScanResponse(candidates=candidates, scanned=len(result.get("messages", [])))


@router.delete("/gmail", response_model=GmailStatusResponse)
async def gmail_disconnect() -> GmailStatusResponse:
    await db.gmail_tokens.delete_many({"key": "default"})
    return GmailStatusResponse(connected=False)


@router.post("/reports/send", response_model=ReportSendResponse)
async def send_report(request: ReportSendRequest) -> ReportSendResponse:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("REPORT_FROM_EMAIL")
    if not api_key or not sender:
        raise HTTPException(status_code=503, detail="Resend report credentials are not configured")
    recipient = request.recipient or os.environ.get("REPORT_RECIPIENT_EMAIL")
    if not recipient:
        raise HTTPException(status_code=400, detail="A recipient email is required")
    payload: Dict[str, Any] = {"from": sender, "to": [recipient], "subject": request.subject, "html": request.html}
    if request.pdf_base64:
        payload["attachments"] = [{"filename": request.filename, "content": request.pdf_base64}]
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Resend rejected the report")
    return ReportSendResponse(sent=True, message_id=response.json().get("id"))