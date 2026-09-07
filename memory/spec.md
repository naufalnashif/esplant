# NusaArtha MVP Specification

## Product
Local-first personal financial spending and planning dashboard for one person. The UI is bilingual Indonesian/English, responsive, and supports dark/light themes. Financial data stays on the user's device in IndexedDB; the backend is not used for personal data.

## Data model
Accounts (multiple banks, debit/credit cards, e-wallets, cash, and investments), transactions, recurring bills/installments, debts and receivables, savings goals, wishlist items, per-category monthly budgets, currency rates, and local report scheduler settings. IDR is the default base currency; USD, EUR, SGD, MYR, JPY, and AUD have editable offline rates.

## Key flows
1. Open dashboard with realistic Indonesian demo data.
2. Add a validated income/expense transaction and see KPIs, recent activity, and category chart update.
3. Filter/sort the transaction ledger by type/category/account/search.
4. Review month-over-month spend/income comparison, installment commitments, debt progress, savings goals, and wishlist.
5. Export local data as JSON/CSV or open a print dialog for PDF.
6. Configure language, theme, manual exchange rates, browser reminder, Gmail/Resend setup checklist, and local report schedule.
7. Review and update category budgets with safe/warning/over-budget status and automatic remaining/overage insight.
8. View category trend recommendations, add/adjust/remove accounts, preview normalized QRIS email samples, and preview/print the same monthly report figures as the dashboard.

## Auth and integrations
Single-user, no app login. Gmail OAuth QRIS reading and Resend/Netlify email delivery are setup-only or deferred in this MVP and are MOCKED/NOT ACTIVE because credentials were intentionally deferred. The safe MVP schedule is daily IndexedDB state plus browser reminder; closed-browser email scheduling requires an explicit future server-side payload architecture.