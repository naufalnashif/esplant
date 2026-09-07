import { apiDelete, apiGet, apiPost } from "@/lib/api";

export interface GmailStartResponse { authorization_url: string; }
export interface GmailStatusResponse { connected: boolean; }
export interface GmailCandidate { external_id: string; merchant: string; amount: number; currency: string; date: string; category: string; account_hint?: string | null; source: string; }
export interface GmailScanResponse { candidates: GmailCandidate[]; scanned: number; }
export interface ReportSendRequest { subject: string; html: string; pdf_base64?: string; filename?: string; recipient?: string; }
export interface ReportSendResponse { sent: boolean; message_id?: string | null; }

export const getGmailStatus = () => apiGet<GmailStatusResponse>("/integrations/gmail/status");
export const startGmailOAuth = () => apiGet<GmailStartResponse>("/integrations/gmail/start");
export const scanGmail = () => apiPost<GmailScanResponse>("/integrations/gmail/scan");
export const disconnectGmail = () => apiDelete<GmailStatusResponse>("/integrations/gmail");
export const sendReportEmail = (payload: ReportSendRequest) => apiPost<ReportSendResponse>("/integrations/reports/send", payload);