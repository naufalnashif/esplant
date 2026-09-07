from typing import List, Optional

from pydantic import BaseModel, Field


class GmailStartResponse(BaseModel):
    authorization_url: str


class GmailStatusResponse(BaseModel):
    connected: bool


class GmailCandidate(BaseModel):
    external_id: str
    merchant: str
    amount: float
    currency: str = "IDR"
    date: str
    category: str = "Other"
    account_hint: Optional[str] = None
    source: str = "gmail"


class GmailScanResponse(BaseModel):
    candidates: List[GmailCandidate]
    scanned: int


class ReportSendRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=160)
    html: str = Field(min_length=1, max_length=200_000)
    pdf_base64: Optional[str] = Field(default=None, max_length=8_000_000)
    filename: str = Field(default="esplant-daily-summary.pdf", max_length=120)


class ReportSendResponse(BaseModel):
    sent: bool
    message_id: Optional[str] = None