# Standard Roofs Books (SR-Books) — User & Deployment Manual

**Software Version:** 1.0 (Production Release)  
**Headquarters:** Standard Roofs, 12/4 Perundurai Road, Near Collectorate, Erode – 638011, Tamil Nadu  
**Statutory GST State Code:** 33 (Tamil Nadu)  
**Primary Currency:** Indian Rupee (INR ₹)  
**Voucher Numbering Continuity:** Invoice sequence starts at `#33` (`SR/26-27/0033`)  

---

## 1. System Overview & Architecture

Standard Roofs Books (SR-Books) is an in-house enterprise accounting and roofing ERP system tailored specifically for roofing contractors, PEB (Pre-Engineered Building) manufacturers, and erection specialists in Erode, Tamil Nadu.

### Core Architecture Highlights
- **Framework:** Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS
- **Database:** Local-First Embedded PostgreSQL (Port 54329) or Cloud Neon Serverless
- **ORM & Data Integrity:** Prisma ORM with strict Decimal calculations (`DECIMAL(15,2)` via `decimal.js`) — floats are strictly prohibited.
- **Double-Entry Engine:** Strict balanced accounting (`SUM(Debit) == SUM(Credit)`). Never allows deleting posted vouchers; supports authorized reversals with full audit trail.
- **Storage Service:** Local-first receipt storage under `./public/uploads/{financialYear}/{module}/` with seamless switch to Cloudflare R2 via `.env`.
- **Security:** Signed HTTP-only session cookies via `jose` and granular per-user permissions.

---

## 2. Pre-Seeded User Accounts & Roles

The system is configured with 5 distinct role presets. Every account starts with clean ₹ 0.00 books:

| Role | Email Login | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@standardroofs.com` | `Admin@2026` | Full system access, all 26 modules, user permissions matrix, system settings, database backup & restore. |
| **Managing Director** | `md@standardroofs.com` | `MD@2026` | Executive oversight, Approvals Center (site expenses, contractor payouts, reversals), Capital/Drawings, P&L and Balance Sheet. |
| **Senior Accountant** | `accountant@standardroofs.com` | `Accounts@2026` | Full accounting, GST Invoices (#33+), Cash Book, Bank Reconciliation, Customer & Vendor Ledgers, Vouchers, Tax Reports. |
| **HR & Labour Manager**| `hr@standardroofs.com` | `Labour@2026` | Office Staff Payroll, 15-Day Labour Muster, Contractor Milestones. **Financial totals, Bank balances, Capital & P&L are strictly blocked.** |
| **Site Supervisor** | `supervisor@standardroofs.com` | `Site@2026` | Simplified Mobile Field View: Upload site expense bill photos, view allocated SRM tools, log vehicle trips & diesel. |

*(Alternative email aliases `admin@standardroofs.in` and `accounts@standardroofs.in` are also active).*

---

## 3. Granular Per-User Permission Matrix

In `/users`, Super Admins can customize individual permissions for any staff member across all 26 application modules:

1. Navigate to **Users & Access Control** (`/users`).
2. Click **Permissions** next to any user.
3. Toggle individual checkboxes for **View**, **Create**, **Edit**, and **Approve**.
4. Click **Save Permissions**. The updated privileges take effect immediately on their next page load or API request.

---

## 4. Key Accounting & Operational Workflows

### 4.1 Tax Invoicing Continuing from Invoice #32
- Previous manual/paper invoicing ended at invoice `#32`.
- The system automatically assigns invoice `#33` (`SR/26-27/0033`) for your first digital invoice.
- **GST Calculation (Tamil Nadu Code 33):**
  - Customer in Tamil Nadu (`33`): Automatically applies **9% CGST + 9% SGST** (18% total).
  - Out-of-State Customer: Automatically applies **18% IGST**.
- Form formats: Both formatted display (`SR/26-27/0033`) and plain numeric format (`33`) are supported.

### 4.2 Roofing Price Catalog (`/price-catalog`)
Pre-loaded with 8 standard roofing items for 1-click insertion into quotes and invoices:
1. `RPC-001`: Kerala Clay Tile Roofing (SAC 9954)
2. `RPC-002`: PEB Industrial Warehouse Shed (SAC 9954)
3. `RPC-003`: UPVC 3-Layer Heat Resistant Sheets (SAC 9954)
4. `RPC-004`: Tensile Fabric Canopy (SAC 9954)
5. `RPC-005`: Solar Rooftop Mounting Structure (SAC 9954)
6. `RPC-006`: MS Tubular Truss Work (HSN 7306)
7. `RPC-007`: Galvalume Corrugated Color Coated Sheets (HSN 7210)
8. `RPC-008`: Self-Drilling Hex Washer Screws & Fasteners (HSN 7318)

### 4.3 Approvals Center (`/approvals`)
Authorized queue for Managing Director:
- **Site & Employee Expenses:** Review uploaded receipts and click **Approve & Post Double-Entry** to debit expense and credit cash/bank.
- **Contractor Milestones:** Approve 10% Advance, 40% Progress, 75% Structure, or 100% Completion bills with automatic 1% or 2% TDS withholding u/s 194C.
- **Journal Reversals:** Authorize reversal requests without altering previous voucher history.

### 4.4 Financial Year & Period Locking (`/settings`)
- Prevents back-dated entries or unauthorized alterations once a month or year has been audited.
- **Year-End Closing Wizard:** Rolls net surplus/deficit into **Retained Earnings (Account 3020)** and advances the active year to `2027-28` with clean sequential numbering.

### 4.5 One-Click JSON Backup & Restore (`/settings`)
- **Download Full JSON Backup:** Exports company settings, chart of accounts, customers, projects, invoices, journal entries, machines, fleet, and price catalog into a single timestamped JSON file.
- **Restore from Backup:** Select a previously saved JSON file to instantly verify and restore system records.

---

## 5. Local Windows Startup Instructions

To run SR-Books on any Windows workstation:

1. **Start the Embedded Database:**
   ```powershell
   npm run db:start
   ```
2. **Launch the Application:**
   ```powershell
   npm run start:local
   # Or for development: npm run dev
   ```
3. Open your browser to `http://localhost:3000` and sign in using one of the pre-seeded accounts.

---

## 6. Cloud Deployment Guide (Neon + Cloudflare R2)

To deploy SR-Books to a high-availability cloud environment:

1. **PostgreSQL Database (Neon / Supabase):**
   - Provision a PostgreSQL database on [Neon](https://neon.tech).
   - In `.env`, update `DATABASE_URL`:
     ```env
     DATABASE_URL="postgresql://user:password@ep-standard-roofs.ap-southeast-1.aws.neon.tech/srbooks?sslmode=require"
     ```
   - Run database migrations: `npm run db:push && npm run db:seed`.

2. **File & Receipt Storage (Cloudflare R2):**
   - Create a bucket on Cloudflare R2 (e.g. `standard-roofs-receipts`).
   - In `.env`, set:
     ```env
     STORAGE_DRIVER="r2"
     R2_ACCOUNT_ID="your_account_id"
     R2_ACCESS_KEY_ID="your_access_key"
     R2_SECRET_ACCESS_KEY="your_secret_key"
     R2_BUCKET_NAME="standard-roofs-receipts"
     R2_PUBLIC_URL="https://uploads.standardroofs.in"
     ```

3. **Deploy to Vercel or Self-Hosted Node.js:**
   - Run `npm run build`.
   - Start using `npm start`.
