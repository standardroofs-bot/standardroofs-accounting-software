# Standard Roofs Books (SR-Books) 🏗️📊

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5.29-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#)

> **Standard Roofs Books (SR-Books)** is a commercial-grade, full-stack enterprise Cloud ERP and Indian GST Accounting Suite specifically engineered for **Standard Roofs** (Erode Headquarters, Tamil Nadu). Inspired by the ergonomic workflow of **Zoho Books** and the modular scale of **Zoho One**, SR-Books combines statutory double-entry bookkeeping, precision tax invoicing, site costing, equipment fleet tracking, and contractor/labour management into an unbreakable, responsive web application.

---

### 📚 Official Documentation & Manuals
* 📘 **[End-to-End User Guide & Operations Manual (USER_GUIDE.md)](./USER_GUIDE.md):** Complete operational handbook for Super Admin, Managing Director, Accountant, HR Manager, and Site Supervisors with step-by-step invoice printing, bank reconciliation, muster rolls, and Excel import guides.
* 🏛️ **[Technical Architecture & Project Documentation (PROJECT_DOCUMENTATION.md)](./PROJECT_DOCUMENTATION.md):** Comprehensive engineering documentation covering full-stack data flow, 60-model relational schema, double-entry CA journal engine, GST taxation math, and API endpoint specifications.

---

## 🌟 Key Highlights & Architectural Capabilities

* **Zoho Books Pixel-Exact GST Tax Invoicing:** Full GST compliance with automatic CGST, SGST, IGST calculations, reverse charge, HSN/SAC codes, and print-ready A4 landscape/portrait invoices matching official Zoho Books formats.
* **Chartered Accountant (CA) Double-Entry Bookkeeping:** Powered by `Decimal.js` for zero floating-point precision loss. Automatically generates balanced debit/credit journal vouchers for sales, vendor bills, payments, advances, and bank transactions.
* **Executive Financial Command Center:** High-definition interactive dashboard featuring smooth **Cubic Bézier Spline Curves** for cash flow forecasting, fintech KPI cards with inline SVG sparklines, dual-column income vs. site expense bar charts, and radial cost allocation donut visualizations.
* **Universal 28-Module Analytics & Toolbar:** Every single module across all 4 workspaces includes collapsible real-time visual charts (`ModuleHeaderWithAnalytics`), instant debounce search, status filtering, and bulk tools.
* **Turnkey Universal Excel & CSV Import/Export:**
  * **Drag-and-Drop Bulk Upload:** Ingests spreadsheets with client-side preview tables and safe upsert validations.
  * **Downloadable Sample Templates:** 1-click tailored `.xlsx` sample templates for each module.
  * **Universal Export:** Instant `.xlsx` download with auto-fitted column widths and branded landscape A4 PDF reports with official company letterhead and GSTIN.
* **Non-Destructive Soft-Delete Lifecycle:** `ArchiveConfirmModal` ensures no financial, tax, or operational records are ever destroyed. Soft-deleted records are safely preserved in dedicated "Archived" tabs with 1-click administrative restoration.
* **Enterprise Security & Zero BFcache Leak:** Strict HTTP `no-store, no-cache` anti-cache headers, session guards against browser back-button leaks, and multi-tier Role-Based Access Control (RBAC) managed by the Super Admin.

---

## 🏢 Workspaces & Modules (28 Modules Across 4 Workspaces)

The application is structured into four specialized operational workspaces accessible from the ergonomic left navigation:

### 1. 💼 Accounting & GST Workspace
* **Executive Dashboard (`/`):** Financial command center with live working capital curves, KPI sparklines, cash flow trajectories, and recent billing activity.
* **Invoices & GST (`/invoices`):** Works contract tax invoices, sequence control (`#33`, `#34`, etc.), printable Zoho format (`/invoices/[id]/print`), and payment status tracking.
* **Quotes & Estimates (`/estimates`):** Pre-construction estimates with 1-click conversion to Sales Orders or Tax Invoices.
* **Sales Orders (`/sales-orders`):** Confirmed client purchase commitments with delivery tracking and partial invoicing.
* **Customers & AR (`/customers`):** Accounts Receivable register, GSTIN validation, credit terms, and 5-tier ageing breakdown.
* **Credit & Debit Notes (`/credit-notes`):** Sales return adjustments and input tax credit debit adjustments.
* **Price Catalog (`/price-catalog`):** 290+ roofing materials, PEB structural items, fasteners, and accessories with HSN codes and unit pricing.
* **Recurring Templates (`/recurring`):** Automated recurring billings for periodic maintenance and leasing contracts.
* **Vendors Master (`/vendors`):** Creditor directory, bank details, GSTIN, and credit period tracking.
* **Purchase Orders (`/purchase-orders`):** Material procurement orders with status lifecycles (`DRAFT`, `ISSUED`, `BILLED`).
* **Vendor Bills (`/bills`):** Accounts Payable bill register with GST input tax credit tracking and dueDate reminders.
* **Payments Made (`/payments-made`):** Direct vendor disbursements, advance payments, and reconciliation with purchase bills.
* **Banking & ICICI (`/banking`):** Direct ledger reconciliation for ICICI Bank A/C `155205003161`, contra entries, and live balance monitoring.
* **Daily Cash Book (`/cashbook`):** Petty cash register with daily shift opening/closing verification and physical cash verification.
* **Chart of Accounts (`/accounts`):** Full 5-category hierarchical General Ledger (Assets, Liabilities, Equity, Income, Expenses).
* **Vouchers & Journals (`/vouchers`):** Manual journal entries, year-end adjustments, and depreciation entries.
* **Capital & Loans (`/capital`):** Director loans, partner equity injections, and debt repayment amortization schedules.
* **Financial & GST Reports (`/reports`):** Multi-chart CA-standard Profit & Loss statement, Balance Sheet, Trial Balance, GSTR-1, and GSTR-3B summary schedules.

### 2. 🏗️ Site Operations, Material & Fleet Workspace
* **Projects & Costing (`/projects`):** Project site costing, contracted values, milestone billing, and material variance tracking.
* **SRM Machines & Tools (`/machines`):** Custody register for welding sets, cutting equipment, breakers, and drills with site transfers.
* **Fleet & Cargo Vehicles (`/fleet`):** Company cargo vehicles, site delivery logs, odometer readings, and maintenance schedules.
* **Yard Stock Inventory (`/inventory`):** Physical yard inventory levels, stock adjustments, batch receipts, and minimum reorder alerts.
* **Site Expenses (`/expenses`):** On-site daily disbursements (diesel, cranes, food, site permits) with approval workflows.

### 3. 👷 Labour & Contractors Workspace
* **Contractors Master (`/contractors`):** Sub-contractor profiles, milestone agreements, TDS rates, and work progress claims.
* **Labour Master & Muster (`/labour`):** Daily shift muster rolls, skilled/unskilled wage registers, and site attendance sheets.

### 4. ⚙️ Operations, Security & Governance Workspace
* **Approvals Queue (`/approvals`):** Multi-level maker-checker approval queue for site expenses, bills, and purchase orders.
* **Advances & Retainers (`/advances`):** Client project advances and supplier material advance tracking.
* **Statutory Audit Trail (`/audit`):** Immutable log of every system transaction, deletion, and role change with timestamps and IP records.
* **Users & Permissions (`/users`):** Granular user management (Super Admin, Managing Director, Accountant, HR Manager, Site Supervisor).
* **Company Settings (`/settings`):** Financial year period locking, invoice numbering sequences, GSTIN defaults, and JSON database backup.

---

## 🛠️ Technology Stack & Architecture

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15.5 (App Router)** | Modern React server components, server actions, and route handlers |
| **UI Library** | **React 19** | Concurrent rendering, modern hooks, and component architecture |
| **Styling** | **Tailwind CSS v4** | Clean slate/blue design system, dark/light theme, and `tabular-nums` |
| **Database & ORM** | **Neon PostgreSQL + Prisma 6.5** | High-availability cloud serverless PostgreSQL with strict relational schemas |
| **Icons & Visuals** | **Lucide React & Custom SVG** | Clean vector iconography and custom mathematical spline chart renderers |
| **Spreadsheet Engine** | **SheetJS (xlsx) + ExcelJS** | High-speed universal `.xlsx` and `.csv` parsing and auto-fitting generation |
| **Authentication** | **Jose JWT + Bcryptjs** | Secure stateless JWT cookies with HTTP-only flags and password hashing |
| **Math Precision** | **Decimal.js** | Arbitrary-precision decimal arithmetic for Indian taxation and financial ledgering |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: `v20.x` or `v22.x` (LTS recommended)
* **npm**: `v10.x` or higher
* **PostgreSQL Database**: Neon Cloud PostgreSQL connection string or local PostgreSQL instance

### 1. Clone the Repository
```bash
git clone https://github.com/Srimani26/standardroof-accounting-software.git
cd standardroof-accounting-software
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Neon Cloud PostgreSQL Connection
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/standardroofs_db?sslmode=require"

# JWT Authentication Secret
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Migrations
```bash
# Push Prisma schema to your database
npx prisma db push

# (Optional) Seed initial chart of accounts, users, and catalog
npm run db:seed
```

### 5. Start the Development Server
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
# Server listens on http://localhost:3000
```

### Exposing via Cloudflare Tunnel (Remote Access)
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 🔐 Security & Governance Model

* **Super Admin Role:** Holds master rights to grant, restrict, or revoke access to specific workspaces or modules.
* **Role-Based Access Control (RBAC):**
  * `SUPER_ADMIN`: Unrestricted master access across all 28 modules, period locking, and company settings.
  * `MANAGING_DIRECTOR`: Full executive oversight, financial reports, banking approvals, and site costing.
  * `ACCOUNTANT`: Full invoicing, GST filings, ledger vouchers, vendor bills, and bank reconciliation.
  * `HR_MANAGER`: Labour muster, staff payroll, contractor agreements, and advances.
  * `SITE_SUPERVISOR`: Mobile-first site expense entry, machine custody check-in/out, and yard inventory issues.
* **Anti-Cache Headers:** Strict `Cache-Control: no-store, no-cache, must-revalidate` attached to protected routes to prevent back-button cache exposure on public computers.

---

## 🏢 Business Entity Information

* **Legal Entity:** Standard Roofs
* **Headquarters:** 144/A, Vellakkal Medu, Villarasampatti, Nasiyanur (Post), Erode, Tamil Nadu – 638107
* **GSTIN:** `33AEWFS5187G1ZD` (Tamil Nadu State Code: 33)
* **Primary Bank:** ICICI Bank (A/C: `155205003161`, IFSC: `ICIC0001552`, Branch: Kagam, Erode)
* **Support Email:** `info@standardroofs.in`
* **Contact Phone:** `+91 86084 75767`

---

## 📄 License

Proprietary enterprise software built exclusively for **Standard Roofs**. All rights reserved. Unauthorized reproduction, modification, distribution, or reverse engineering is strictly prohibited.
