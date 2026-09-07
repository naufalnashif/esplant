# NusaArtha MVP Specification

## Product
Local-first personal financial spending and planning dashboard for one person. The UI is bilingual Indonesian/English, responsive, and supports dark/light themes. Financial data stays on the user's device in IndexedDB; the backend is not used for personal data.

## Data model
Accounts, transactions, recurring bills/installments, debts and receivables, savings goals, wishlist items, currency rates, and local report scheduler settings. IDR is the default base currency; USD, EUR, SGD, MYR, JPY, and AUD have editable offline rates.

## Key flows
1. Open dashboard with realistic Indonesian demo data.
2. Add a validated income/expense transaction and see KPIs, recent activity, and category chart update.
3. Filter/sort the transaction ledger by type/category/account/search.
4. Review month-over-month spend/income comparison, installment commitments, debt progress, savings goals, and wishlist.
5. Export local data as JSON/CSV or open a print dialog for PDF.
6. Configure language, theme, manual exchange rates, browser reminder, Gmail setup guidance, and local report schedule.

## Auth and integrations
Single-user, no app login. Gmail OAuth and serverless email delivery are setup-only UI in this MVP and are MOCKED/NOT ACTIVE because credentials and a serverless backend were intentionally deferred.