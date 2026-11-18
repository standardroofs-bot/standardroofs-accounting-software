# Standard Roofs Books (SR-Books) — Project Overview

- **Project Location:** `E:\standardroof accounting software`
- **Client:** Standard Roofs (Erode, Tamil Nadu, India)
- **Local Storage Root:** `E:\standardroof accounting software\public\uploads\2026-27\`
- **Current Financial Year:** 2026-27
- **GST State Code:** 33 (Tamil Nadu)
- **Starting Invoice Sequence:** #33 (`SR/26-27/0033`)
- **System URL:** [http://localhost:3000](http://localhost:3000)

## System Architecture
- **Framework:** Next.js 15 App Router + TypeScript + Tailwind CSS + Shadcn UI
- **Database:** PostgreSQL on `127.0.0.1:54329` (`srbooks`)
- **ORM:** Prisma ORM with strict `Decimal(15,2)` precision
- **Bookkeeping:** Double-Entry General Ledger (`SUM(Debit) == SUM(Credit)`)
- **Storage Service:** Local-first filesystem storage abstraction under `./public/uploads/{financialYear}/{module}/` (ready for Cloudflare R2 switch via `.env`)

## Active Modules & Paths
1. **Dashboard:** `/`
2. **Customers & AR Ageing:** `/customers`
3. **Projects & Profitability Cards:** `/projects`
4. **GST Tax Invoices & A4 Print View:** `/invoices`, `/invoices/new`, `/invoices/[id]/print`
5. **Suppliers & Input Tax Credit (ITC):** `/suppliers`
6. **Site & Office Expenses:** `/expenses`
7. **Contractor Milestones & TDS 194C:** `/contractors`
8. **15-Day Labour Muster & Advances:** `/labour`
9. **Machine & Tool Fleet Tracking (SRM01–SRM06):** `/machines`
10. **Chart of Accounts (34 Accounts):** `/accounts`
11. **Daily Cash Book & Denomination Tally:** `/cashbook`
12. **Bank Accounts (Current & CC Facility):** `/banking`
13. **Vouchers (Debit = Credit Guard):** `/vouchers`
14. **Audit Trail:** `/audit`
