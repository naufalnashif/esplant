# Esplant Financial Tracker Specification

## Product
Local-first personal financial spending and planning dashboard for one person. The product name is Esplant (Financial Tracker). The UI is bilingual Indonesian/English, responsive, and supports dark/light themes styled after LeetCode's dark mode: near-black background (#1a1a1a), #282828 cards, #3c3c3c borders, amber primary (#ffa116, dark text on amber), LeetCode green (#2cbb5d) for income and red (#ef4743) for expenses, Geist Variable for all text and JetBrains Mono for figures. Financial data stays on the user's device in IndexedDB; the backend is not used for personal data.

## Launch state
The app ships with ZERO data — no demo/dummy records. `createInitialState()` in frontend/src/lib/localDb.ts returns empty accounts/transactions/bills/debts/savings/wishlist/budgets (only the default category list for dropdown validation). An onboarding banner on the empty dashboard points to "Tambah akun" and "Impor JSON". Adding a transaction without any account is blocked with a toast. Settings has Import JSON (validated via `sanitizeImportedState`) and a confirm-guarded "Hapus semua data" reset. A personal starter backup for the owner lives at frontend/public/starter-naufal.json (Blu BCA 1.4M, BNI 771,670, Kredit Mandiri 419k, Uang Tunai 300k + 4 debts: Shopee Kredit 24.6M, Kredit Mandiri 4M, Mba Resi 3M, Atha 1M) — consider removing before public deploy.

## Data model
Accounts (multiple banks, debit/credit cards, e-wallets, cash, and investments), transactions, recurring bills/installments, debts and receivables, savings goals, wishlist items grouped by Travel/Work/Home/Personal/Education/Health/Other, per-category monthly budgets, currency rates, and local report scheduler settings. IDR is the default base currency; USD, EUR, SGD, MYR, JPY, and AUD have editable offline rates. Display currency conversion is centralized around IDR reference rates and applies to dashboard totals, charts, budgets, insights, and reports.

## Key flows
1. Open dashboard with realistic Indonesian demo data.
2. Add a validated income/expense transaction and see KPIs, recent activity, and category chart update.
3. Filter/sort the transaction ledger by type/category/account/search.
4. Review month-over-month spend/income comparison, installment commitments, debt progress, savings goals, and wishlist.
5. Export local data as JSON/CSV or open a print dialog for PDF.
6. Configure language, theme, manual exchange rates, browser reminder, Gmail/Resend setup checklist, and local report schedule.
7. Review and update category budgets with safe/warning/over-budget status and automatic remaining/overage insight.
8. View category trend recommendations, add/adjust/remove accounts, connect Gmail readonly, preview/approve/deduplicate normalized QRIS emails, and preview/print the same monthly report figures as the dashboard.
9. Switch display currency, commit money into a savings goal as an expense transaction that reduces an account, or withdraw it as an income transaction that increases an account.
10. Preview a simple daily report containing total balance, income, expense, net flow, top categories, budget warnings, and five recent transactions; send it through Resend with a browser-generated PDF attachment to an optional recipient email typed in the UI (falls back to the server default recipient).
11. Create/read/update/delete transactions; create/edit/archive/restore/delete categories with history validation; manage account balances, bills, debts, wishlist entries, savings commits, and budgets locally.
12. Data Health: automatic reconciliation panel in Settings (frontend/src/lib/dataHealth.ts + DataHealthPanel). Each account carries an `openingBalance` anchor (backfilled on load); checks detect balance drift vs transaction history, orphan transactions, invalid amounts, over-paid debts, over-saved goals, duplicate suspects, and invalid budgets. Fixable issues have a one-click auto-fix; a header badge appears whenever findings exist and deep-links to Settings.

## Auth and integrations
Single-user, no app login. Gmail OAuth uses readonly scope, state validation, encrypted token storage in the backend, preview approval, and message-id deduplication. Resend delivery: sender displays as "Esplant Reports <onboarding@resend.dev>", recipient typed in the UI (validated) or falls back to REPORT_RECIPIENT_EMAIL (naufalnashif.imanuddin@gmail.com). The email is a professional HTML template with a summary table (balance, income/spend/net today, month spend) and a today's-transactions table, plus a jsPDF attachment. Anti-spam: max 3 report emails per client IP per UTC day (backend in-memory; Netlify function uses a Blobs counter), payload size caps, HTML escaping of user text. Financial records remain in IndexedDB.

## Netlify deployment package
`/app/netlify.toml` + `/app/netlify/functions/*.mjs` mirror every FastAPI integration endpoint (same `/api/integrations/...` paths via function `config.path`), using Netlify Blobs for encrypted OAuth token/state storage — no user-managed database. Root `/app/package.json` carries the `@netlify/blobs` dependency. Deploy guide: `/app/netlify/README.md`. The FastAPI backend continues to serve the preview environment unchanged.