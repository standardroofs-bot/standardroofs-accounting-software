# Standard Roofs Books (SR-Books) — End-to-End User Guide & Operations Manual 📘

**System Name:** Standard Roofs Books (SR-Books)  
**Enterprise Entity:** Standard Roofs (Erode Headquarters, Tamil Nadu)  
**GSTIN:** `33AEWFS5187G1ZD` | **Active Financial Year:** FY 2026-27  
**Official Currency:** Indian Rupee (INR - ₹) | **Precision Engine:** `Decimal.js` (Zero float loss)  
**Document Version:** 2.0 (Enterprise SaaS Edition)  

---

## 📑 Table of Contents

1. [System Access, Security & User Roles](#1-system-access-security--user-roles)
2. [Executive Command Center & Visual Dashboard](#2-executive-command-center--visual-dashboard)
3. [Sales & Invoicing Workflows (Zoho Books Standard)](#3-sales--invoicing-workflows-zoho-books-standard)
4. [Purchases & Accounts Payable (AP) Workflows](#4-purchases--accounts-payable-ap-workflows)
5. [Banking, ICICI Reconciliation & Cash Book](#5-banking-icici-reconciliation--cash-book)
6. [General Ledger, Chart of Accounts & Vouchers](#6-general-ledger-chart-of-accounts--vouchers)
7. [Site Operations, Projects & Material Inventory](#7-site-operations-projects--material-inventory)
8. [Heavy Machinery, Fleet Vehicles & Asset Custody](#8-heavy-machinery-fleet-vehicles--asset-custody)
9. [Labour Muster, Contractors & Payroll Management](#9-labour-muster-contractors--payroll-management)
10. [Universal Bulk Excel Import & Export Engine](#10-universal-bulk-excel-import--export-engine)
11. [Soft-Delete (Archive) & 1-Click Restoration Lifecycle](#11-soft-delete-archive--1-click-restoration-lifecycle)
12. [Financial Year Period Locking, Backups & System Settings](#12-financial-year-period-locking-backups--system-settings)
13. [Troubleshooting & Frequently Asked Questions (FAQ)](#13-troubleshooting--frequently-asked-questions-faq)

---

## 1. System Access, Security & User Roles

### 1.1 Secure Login & Session Guard
1. Navigate to the login portal at `http://localhost:3000/login` (or the secure Cloudflare tunnel URL).
2. Enter your authorized corporate email and password.
3. Upon authentication, the system issues an HTTP-only secure JWT token with encrypted session state.
4. **Zero BFcache Leak Security:** If you log out and press the browser Back (`←`) button, the browser is strictly forbidden from displaying cached financial or customer records—it immediately redirects to `/login`.

### 1.2 User Role Hierarchy & Permissions

| Role Name | Scope of Authority | Key Permissions |
| :--- | :--- | :--- |
| **Super Admin (`SUPER_ADMIN`)** | Master Control across all 4 Workspaces | Period locking, system configuration, user role granting/revocation, full audit log access, JSON database backup. |
| **Managing Director (`MANAGING_DIRECTOR`)** | High-level Executive Financial Oversight | Financial dashboard, executive P&L, balance sheets, bank liquidity, and project budget authorizations. |
| **Senior Accountant (`ACCOUNTANT`)** | Accounting, GST & Treasury Operations | Tax invoices, vendor bills, ICICI bank reconciliation, cash book closings, journal entries, GSTR reports. |
| **HR Manager (`HR_MANAGER`)** | Workforce & Sub-Contractor Management | Daily labour muster, staff payroll, contractor agreements, milestone claim verification, wage advances. |
| **Site Supervisor (`SITE_SUPERVISOR`)** | On-Site Operations & Asset Tracking | Daily site disbursements, heavy tool custody check-in/out, material issuance, cargo vehicle trip logs. |

---

## 2. Executive Command Center & Visual Dashboard

The home dashboard (`/`) delivers real-time visibility into the financial pulse of Standard Roofs:

### 2.1 The 4 Primary Fintech KPI Cards
* **Total Receivables (AR):** Total unpaid and draft invoices (e.g. Sabari Invoices `#33` and `#34`). Features an inline upward billing sparkline and 0-15d vs 16-30d aging indicators.
* **Cash & Bank Liquidity:** Current verified balance across all bank accounts and physical cash (ICICI Bank A/C `155205003161` balance of ₹ 24,03,272.00). Shows estimated operational runway (e.g. 18.4 months).
* **Works Turnover (FYTD):** Year-to-date invoiced contract collections.
* **Net Operating Profit:** Gross site revenue minus direct material, equipment diesel, crane hiring, and labour costs.

### 2.2 Cash Flow & Working Capital Trajectory (Cubic Spline Chart)
* **Smooth Cubic Curve:** Plots monthly closing liquidity across all 12 months (Apr 2026 to Mar 2027) with seasonal industrial roofing variations.
* **Interactive Tooltip:** Hover over any node to view Inflows (Client Collections), Outflows (Site Disbursements), Net Cash Surplus, and Closing Liquidity.
* **Time Range Switcher:** Toggle between `12M (Full Year)`, `6M (Half Year)`, and `Quarters (Q1-Q4)`.
* **Verified vs Projected Indicator:** The active month (November) displays an emerald pulsing node indicating verified ledger records.

### 2.3 Income vs. Direct Site Costs & Operating Expense Allocation
* **Dual-Column Bar Chart:** Prominently displays monthly invoiced collections (green bars) alongside direct site costs (rose/amber bars).
* **Radial Donut Chart:** Breaks down company expenditure into standard industrial roofing categories:
  * Raw Material (PEB Coils, HR Plates, Color Coated Sheets): **45%**
  * Labour Muster & Skilled Erection Charges: **24%**
  * Logistics, Heavy Crane & Trailer Hiring: **14%**
  * Machinery Diesel, Generator Fuel & Site Power: **10%**
  * Consumables, Self-Drilling Screws & Fasteners: **7%**

### 2.4 Summary Table vs. Visual View Toggle
Click **Summary Table** in the top action bar to inspect the 12-month financial schedule with Inflows, Outflows, Net Flow, and Closing Reserves. Click **Export Schedule (.xlsx)** to download a spreadsheet for CA review.

---

## 3. Sales & Invoicing Workflows (Zoho Books Standard)

### 3.1 Creating a New Tax Invoice
1. Go to **Accounting & GST > Invoices & GST (`/invoices`)** or click **+ Tax Invoice** on the top toolbar.
2. The system auto-generates the next sequential invoice number (e.g. `SR/26-27/0033`).
3. Select or type the **Customer Name** (e.g., `Sabari`). The billing address, state, and GSTIN auto-populate.
4. Set the **Invoice Date** and **Payment Terms** (e.g., *Due on Receipt* or *15 Days Credit*).
5. Add items from the **Price Catalog** (e.g. `Welded Link Chain`, `HR Plate`, `SS Pipe`):
   * Unit rate and HSN/SAC code auto-populate.
   * Enter quantity. Total taxable value is automatically calculated.
6. The tax engine automatically applies:
   * **Intra-State (Tamil Nadu to Tamil Nadu):** CGST (9%) + SGST (9%)
   * **Inter-State (Outside Tamil Nadu):** IGST (18%)
7. Any rounding fraction is posted to the **Round Off / Adjustment Account (5999)**.
8. Click **Save & Send** to post the double-entry transaction to the General Ledger.

### 3.2 Printing Official Zoho Books A4 Tax Invoices
1. On the invoice list or detail view, click the **Print / PDF (Printer)** icon.
2. A print-ready view opens at `/invoices/[id]/print` featuring:
   * Standard Roofs official logo (top-left).
   * Company GSTIN `33AEWFS5187G1ZD`, Erode address, and email.
   * Right-aligned `TAX INVOICE` header.
   * Uniform `1px solid #8c8c8c` closed outer frame and internal grid dividers.
   * Zoho Books light grey shaded section bars (`#f3f4f6`) on `Bill To | Ship To` and items table header.
   * Amount in Words (Indian Currency Standard).
   * ICICI Bank Details (`Branch: Kagam, Erode`).
   * Authorized signatory box (`Sivakumar D - Manager`).
3. Press `Ctrl + P` to print or save as an official PDF.

---

## 4. Purchases & Accounts Payable (AP) Workflows

### 4.1 Purchase Orders & Vendor Bills
1. Navigate to **Purchases > Purchase Orders (`/purchase-orders`)**.
2. Create a PO with required roofing steel coils, screws, or safety harnesses.
3. Upon receipt of goods, click **Convert to Vendor Bill**.
4. Review the vendor's tax invoice number, input tax credit (ITC) eligibility, and due date.
5. Saving the bill updates creditor balance (Account `2010 - Creditor Accounts Payable`) and debits Raw Material Purchases (Account `5010`).

### 4.2 Recording Payments to Vendors
1. Navigate to **Purchases > Payments Made (`/payments-made`)**.
2. Select the vendor and enter payment amount.
3. Choose payment mode: **ICICI Bank Transfer (NEFT/RTGS/IMPS)**, **Cheque**, or **Cash**.
4. The system automatically reconciles the payment against outstanding bills and updates bank balances.

---

## 5. Banking, ICICI Reconciliation & Cash Book

### 5.1 ICICI Bank Ledger & Statement Reconciliation
1. Navigate to **Banking & ICICI (`/banking`)**.
2. View live statement for ICICI Bank A/C `155205003161`.
3. To record contra entries:
   * **Cash Deposit:** Dr ICICI Bank (1020) | Cr Daily Cash Book (1010)
   * **Cash Withdrawal:** Dr Daily Cash Book (1010) | Cr ICICI Bank (1020)
   * **Inter-Bank Transfer:** Dr Target Bank | Cr Source Bank

### 5.2 Daily Cash Book & Physical Cash Count
1. Navigate to **Daily Cash Book (`/cashbook`)**.
2. The module tracks morning opening cash, daily site collections, petty disbursements, and evening closing cash.
3. Enter physical denomination count (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10).
4. If physical count matches ledger balance, status shows **Balanced & Verified**.

---

## 6. General Ledger, Chart of Accounts & Vouchers

### 6.1 Chart of Accounts Structure
The General Ledger is pre-configured with standard Indian CA numbering:
* **1000 Series (Assets):** Cash in Hand (1010), ICICI Bank (1020), Accounts Receivable (1030), Input CGST (1050), Input SGST (1060), Fixed Machinery Assets (1200).
* **2000 Series (Liabilities):** Accounts Payable (2010), Output CGST (2020), Output SGST (2030), Customer Advances (2050), Director Loans (2100).
* **3000 Series (Equity):** Partner Capital Account (3010), Retained Earnings (3020).
* **4000 Series (Income):** Works Contract Revenue (4010), Scrap Material Sales (4020).
* **5000 Series (Direct Site Expenses):** Raw Material Purchases (5010), Labour Charges (5020), Freight & Logistics (5030), Machinery Diesel (5040), Fasteners & Consumables (5050), Round Off Adjustment (5999).
* **6000 Series (Indirect Administrative Overheads):** Office Rent, Utilities, Legal, Software Subscriptions.

---

## 7. Site Operations, Projects & Material Inventory

### 7.1 Managing Projects & Site Costing
1. Go to **Site Operations > Projects & Costing (`/projects`)**.
2. Track contract value, mobilization advance, milestone billing, and material consumption per site.
3. Compare actual material and labour spend against budgeted margins.

### 7.2 Yard Stock Inventory & Minimum Level Alerts
1. Go to **Yard Stock Inventory (`/inventory`)**.
2. Track physical stock of color coated coils, ridge caps, polycarbonate sheets, and self-drilling screws.
3. Items reaching minimum reorder levels trigger automated procurement notices.

---

## 8. Heavy Machinery, Fleet Vehicles & Asset Custody

### 8.1 SRM Tools & Equipment Custody Tracking
1. Go to **SRM Machines & Tools (`/machines`)**.
2. Track location and team custody for welding sets, cutting machines, breakers, testers, and generators.
3. Record site-to-site equipment handovers with signature acknowledgment.

### 8.2 Cargo Fleet & Vehicle Trip Logging
1. Go to **Fleet & Vehicles (`/fleet`)**.
2. Log delivery trips, driver assignments, odometer readings, and diesel consumption.

---

## 9. Labour Muster, Contractors & Payroll Management

### 9.1 Daily Labour Muster Rolls
1. Go to **Labour Master & Muster (`/labour`)**.
2. Record daily site attendance for skilled welders, fitters, and helpers.
3. Track daily wage rates, overtime hours, and cash advances.

### 9.2 Contractor Milestone Progress Claims
1. Go to **Contractors Master (`/contractors`)**.
2. Track structural fabrication and sheeting sub-contractors.
3. Approve milestone completion certificates and deduct statutory TDS (Section 194C) before disbursement.

---

## 10. Universal Bulk Excel Import & Export Engine

Every module features a standardized toolbar with Excel/PDF capabilities:

### 10.1 Bulk Importing from Excel (.xlsx)
1. On any module page, click **Import Excel**.
2. Click **Download Sample Template** to receive a verified `.xlsx` spreadsheet matching that module's columns.
3. Fill in your records and drag the file into the upload dropzone.
4. Review the **Interactive Preview Table** showing parsed records.
5. Click **Confirm Import** to execute safe bulk upserting.

### 10.2 Exporting Data
* **Export (.xlsx):** Downloads all currently filtered records as an Excel file with auto-fitted column widths and formatted numbers.
* **Print / PDF:** Opens a clean landscape A4 PDF report with company letterhead, GSTIN, record count, and timestamp.

---

## 11. Soft-Delete (Archive) & 1-Click Restoration Lifecycle

To protect statutory ledger integrity, SR-Books enforces **Non-Destructive Data Protection**:

1. **Archiving a Record:**
   * Clicking **Archive / Delete** on any row opens the `ArchiveConfirmModal`.
   * Confirming soft-deletes the record (`isArchived = true`). It is immediately hidden from active views but never wiped from the database.
2. **Restoring an Archived Record:**
   * In the module toolbar, switch the view dropdown to **Archived**.
   * Click **Restore** on the desired record.
   * The record instantly returns to active status with all historical transactions intact.

---

## 12. Financial Year Period Locking, Backups & System Settings

### 12.1 Period Locking (`/settings`)
* Super Admins can lock closed financial quarters or past financial years.
* Once locked, no user can backdate invoices, modify posted journal entries, or edit cash receipts for that period.

### 12.2 JSON Database Backup
* Go to **Settings > Database Backup**.
* Click **Generate Full System Backup** to download an encrypted JSON file containing the complete relational database snapshot.

---

## 13. Troubleshooting & Frequently Asked Questions (FAQ)

**Q: Why does the login screen appear when I press the browser Back button?**  
*A: This is an enterprise security feature. The application enforces anti-cache headers so confidential financial data is never exposed via browser history on shared workstations.*

**Q: How do I change the next invoice number?**  
*A: Navigate to **Settings > Company Profile & Invoicing**. Update the Last Invoice Number (e.g. set to `32` so the next invoice is `#33`).*

**Q: Can I restore a deleted customer or machine?**  
*A: Yes! Filter the view to "Archived", find the record, and click "Restore".*

**Q: Why are amounts showing formatted with commas like ₹ 24,03,272.00?**  
*A: The system uses the official Indian numbering system (Lakhs and Crores) with `tabular-nums` typography for CA-standard accounting clarity.*
