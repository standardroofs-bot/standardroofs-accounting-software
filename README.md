# SR-Books ERP — Enterprise Cloud Accounting & Management Suite 🏗️📊

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.29-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Cloud PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud_Serverless-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Author](https://img.shields.io/badge/Author-Srimanikandan_K-8A2BE2?style=for-the-badge&logo=github)](https://github.com/Srimani26)
[![License](https://img.shields.io/badge/License-Proprietary_Commercial-red?style=for-the-badge)](#)

> **SR-Books ERP** is a proprietary full-stack enterprise cloud accounting and operational ERP application designed, architected, and owned by **Srimanikandan K**.  
> **Commercial Deployment:** Licensed for operational use to **Standard Roofs**.

---

### 📚 Project Knowledge Base & Manuals
* 📘 **[End-to-End User Guide & Operations Manual (USER_GUIDE.md)](./USER_GUIDE.md):** Comprehensive operational manual covering all 28 modules, invoice printing, double-entry bookkeeping, muster rolls, and spreadsheet import/export.
* 🏛️ **[Technical Architecture & Project Documentation (PROJECT_DOCUMENTATION.md)](./PROJECT_DOCUMENTATION.md):** Deep technical specifications covering full-stack data flow, 60-model relational schema, double-entry journal engine, GST taxation math, and API endpoint contracts.

---

## 🌟 Key Product Capabilities

* **Zoho Books-Grade GST Tax Invoicing:** Full Indian GST tax engine supporting automatic CGST, SGST, IGST calculations, reverse charge mechanisms, HSN/SAC codes, and print-ready A4 landscape/portrait invoices.
* **Double-Entry General Ledger Engine:** Powered by `Decimal.js` for arbitrary-precision fixed-point arithmetic (zero floating-point discrepancy). Automatically posts balanced debit and credit journal entries for all sales, bills, payments, advances, and bank transactions.
* **Dual Database & Persistence Architecture:**
  * **Cloud Database (Cloud DB):** High-availability, serverless **Neon Cloud PostgreSQL** with automated connection pooling (`DATABASE_URL`), direct migrations (`DIRECT_URL`), and point-in-time recovery.
  * **Local Storage & Hybrid Session Cache:** Client-side local storage resilience for state preservation, temporary offline form persistence, and fast session re-hydration.
* **Executive Financial Command Center:** High-definition interactive dashboard featuring smooth **Cubic Bézier Spline Curves** for cash flow forecasting, fintech KPI cards with inline SVG sparklines, dual-column income vs. site expense bar charts, and radial cost allocation donut visualizations.
* **Universal 28-Module Analytics & Toolbar:** Every module across all 4 workspaces includes collapsible real-time visual charts (`ModuleHeaderWithAnalytics`), instant debounce search, status filtering, and bulk tools.
* **Turnkey Universal Excel & CSV Import/Export:**
  * **Drag-and-Drop Bulk Upload:** Spreadsheet ingestion with client-side preview tables and safe upsert validations.
  * **Downloadable Sample Templates:** 1-click tailored `.xlsx` sample templates for each module.
  * **Universal Export:** Instant `.xlsx` download with auto-fitted column widths and branded landscape A4 PDF reports.
* **Non-Destructive Soft-Delete Lifecycle:** `ArchiveConfirmModal` ensures no financial, tax, or operational records are ever destroyed. Soft-deleted records are safely preserved in dedicated "Archived" tabs with 1-click administrative restoration.
* **Enterprise Security & Zero BFcache Leak:** Strict HTTP `no-store, no-cache` anti-cache headers, session guards against browser back-button leaks, and multi-tier Role-Based Access Control (RBAC).

---

## 🏢 Workspaces & Modules (28 Modules Across 4 Workspaces)

### 1. 💼 Accounting & GST Workspace
* **Executive Dashboard (`/`):** Financial command center with live working capital curves, KPI sparklines, cash flow trajectories, and recent billing activity.
* **Invoices & GST (`/invoices`):** Works contract tax invoices, sequence control, printable format (`/invoices/[id]/print`), and payment status tracking.
* **Quotes & Estimates (`/estimates`):** Pre-construction estimates with 1-click conversion to Sales Orders or Tax Invoices.
* **Sales Orders (`/sales-orders`):** Confirmed client purchase commitments with delivery tracking and partial invoicing.
* **Customers & AR (`/customers`):** Accounts Receivable register, GSTIN validation, credit terms, and 5-tier ageing breakdown.
* **Credit & Debit Notes (`/credit-notes`):** Sales return adjustments and input tax credit debit adjustments.
* **Price Catalog (`/price-catalog`):** 290+ roofing materials, PEB structural items, fasteners, and accessories with HSN codes and unit pricing.
* **Recurring Templates (`/recurring`):** Automated recurring billings for periodic maintenance and leasing contracts.
* **Vendors Master (`/vendors`):** Creditor directory, bank details, GSTIN, and credit period tracking.
* **Purchase Orders (`/purchase-orders`):** Material procurement orders with status lifecycles (`DRAFT`, `ISSUED`, `BILLED`).
* **Vendor Bills (`/bills`):** Accounts Payable bill register with GST input tax credit tracking and due date reminders.
* **Payments Made (`/payments-made`):** Direct vendor disbursements, advance payments, and reconciliation with purchase bills.
* **Banking Treasury (`/banking`):** Direct ledger reconciliation, contra entries (Cash to Bank / Bank to Cash), and live balance monitoring.
* **Daily Cash Book (`/cashbook`):** Petty cash register with daily shift opening/closing verification and physical cash denomination counts.
* **Chart of Accounts (`/accounts`):** Full 5-category hierarchical General Ledger (Assets, Liabilities, Equity, Income, Expenses).
* **Vouchers & Journals (`/vouchers`):** Manual journal entries, year-end adjustments, and depreciation entries.
* **Capital & Loans (`/capital`):** Director loans, partner equity injections, and debt repayment amortization schedules.
* **Financial & GST Reports (`/reports`):** Multi-chart CA-standard Profit & Loss statement, Balance Sheet, Trial Balance, GSTR-1, and GSTR-3B summary schedules.

### 2. 🏗️ Site Operations, Material & Fleet Workspace
* **Projects & Costing (`/projects`):** Project site costing, contracted values, milestone billing, and material variance tracking.
* **SRM Machines & Tools (`/machines`):** Custody register for welding sets, cutting equipment, breakers, and drills with site transfers.
* **Fleet & Cargo Vehicles (`/fleet`):** Commercial cargo vehicles, site delivery logs, odometer readings, and maintenance schedules.
* **Yard Stock Inventory (`/inventory`):** Physical yard inventory levels, stock adjustments, batch receipts, and minimum reorder alerts.
* **Site Expenses (`/expenses`):** On-site daily disbursements (diesel, cranes, food, site permits) with approval workflows.

### 3. 👷 Labour & Contractors Workspace
* **Contractors Master (`/contractors`):** Sub-contractor profiles, milestone agreements, statutory Section 194C TDS rates, and work progress claims.
* **Labour Master & Muster (`/labour`):** Daily shift muster rolls, skilled/unskilled wage registers, advances, and site attendance sheets.

### 4. ⚙️ Operations, Security & Governance Workspace
* **Approvals Queue (`/approvals`):** Multi-level maker-checker approval queue for site expenses, bills, and purchase orders.
* **Advances & Retainers (`/advances`):** Client project advances and supplier material advance tracking.
* **Statutory Audit Trail (`/audit`):** Immutable log of every system transaction, deletion, and role change with timestamps and IP records.
* **Users & Permissions (`/users`):** Granular user management (Super Admin, Managing Director, Accountant, HR Manager, Site Supervisor).
* **Company Settings (`/settings`):** Financial year period locking, invoice numbering sequences, GSTIN defaults, and JSON database backup.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15.5 (App Router)** | Modern React server components, server actions, and route handlers |
| **UI Library** | **React 19** | Concurrent rendering, modern hooks, and component architecture |
| **Styling** | **Tailwind CSS v4** | Clean slate/blue design system, dark/light theme, and `tabular-nums` |
| **Cloud Database** | **Neon Cloud Serverless PostgreSQL** | Cloud-native serverless PostgreSQL with automated pooling and high availability |
| **Local Storage & Cache** | **Browser LocalStorage + Hybrid Session Cache** | Client-side state persistence and offline session resilience |
| **ORM** | **Prisma ORM 6.5** | Type-safe schema definitions, database pooling, and migrations |
| **Math Precision** | **Decimal.js** | Arbitrary-precision decimal arithmetic for Indian taxation and financial ledgering |
| **Icons & Visuals** | **Lucide React & Custom SVG** | Vector iconography and mathematical cubic spline chart renderers |
| **Spreadsheet Engine** | **SheetJS (xlsx) + ExcelJS** | High-speed universal `.xlsx` and `.csv` parsing and auto-fitting generation |
| **Authentication** | **Jose JWT + Bcryptjs** | Secure stateless JWT cookies with HTTP-only flags and password hashing |

---

## 🚀 Setup & Execution Guide

### Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **npm**: `v10.x` or higher
* **PostgreSQL Database**: Cloud Database (Neon Cloud PostgreSQL) or local instance

### 1. Clone the Repository
```bash
git clone https://github.com/Srimani26/standardroof-accounting-software.git
cd standardroof-accounting-software
```

### 2. Configure Environment Variables
Create a `.env` file in the project root with your own connection strings and secret keys:
```env
# Cloud Database (Neon Cloud PostgreSQL connection)
DATABASE_URL="postgresql://your_db_user:your_db_password@your_neon_host.neon.tech/your_database?sslmode=require"
DIRECT_URL="postgresql://your_db_user:your_db_password@your_neon_host.neon.tech/your_database?sslmode=require"

# JWT Authentication Secret (Minimum 32 characters)
JWT_SECRET="your-custom-jwt-secret-key-min-32-characters"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Migrations
```bash
# Push Prisma schema to your Cloud Database
npx prisma db push

# (Optional) Seed initial chart of accounts, sample catalog and master records
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build & Deployment

### Build the Application
```bash
npm run build
```

### Start Production Server
```bash
npm run start
# Server listens on port 3000
```

### Secure Remote Access (Cloudflare Tunnel)
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 🔐 Security & Role-Based Governance Model

* **Super Admin Role:** Holds master rights to grant, restrict, or revoke access to specific workspaces or modules.
* **Role-Based Access Control (RBAC):**
  * `SUPER_ADMIN`: Unrestricted master access across all 28 modules, period locking, and company settings.
  * `MANAGING_DIRECTOR`: Full executive oversight, financial reports, banking approvals, and site costing.
  * `ACCOUNTANT`: Full invoicing, GST filings, ledger vouchers, vendor bills, and bank reconciliation.
  * `HR_MANAGER`: Labour muster, staff payroll, contractor agreements, and advances.
  * `SITE_SUPERVISOR`: Mobile-first site expense entry, machine custody check-in/out, and yard inventory issues.
* **Anti-Cache Headers:** Strict `Cache-Control: no-store, no-cache, must-revalidate` attached to protected routes to prevent back-button cache exposure on public computers.

---

## 👤 Author, Ownership & Commercial License

* **Project Owner & Lead Architect:** (Standardroofs)(standardroofs-bot/standardroofs-accounting-software)
* **Repository:** [https://github.com/standardroofs-bot/standardroofs-accounting-software]
* **Commercial Licensee:** Licensed for commercial operations to **Standard Roofs**.
* **Copyright Notice:** © 2026 Standardroofs. All rights reserved.
