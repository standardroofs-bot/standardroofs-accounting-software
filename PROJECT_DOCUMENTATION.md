# Standard Roofs Books (SR-Books) — Project Architecture & Technical Documentation 🏛️⚙️

**Application Name:** Standard Roofs Books (SR-Books)  
**Target Enterprise:** Standard Roofs, Erode, Tamil Nadu  
**GSTIN:** `33AEWFS5187G1ZD` | **State Code:** `33 (Tamil Nadu)`  
**Architecture Standard:** Commercial SaaS ERP & Double-Entry Accounting System  
**Technical Document Version:** 2.0 (Enterprise Specification)  

---

## 📑 Table of Contents

1. [Executive Summary & Architectural Overview](#1-executive-summary--architectural-overview)
2. [Full-Stack Architecture & Data Flow](#2-full-stack-architecture--data-flow)
3. [Database Schema & Entity-Relationship (ER) Dictionary](#3-database-schema--entity-relationship-er-dictionary)
4. [Indian GST Calculation & Double-Entry Accounting Engine](#4-indian-gst-calculation--double-entry-accounting-engine)
5. [Security, Session Guard & Zero BFcache Architecture](#5-security-session-guard--zero-bfcache-architecture)
6. [Complete API Endpoints Specification](#6-complete-api-endpoints-specification)
7. [Universal UI Components & Visual Analytics Architecture](#7-universal-ui-components--visual-analytics-architecture)
8. [Data Protection, Backup & Disaster Recovery Guide](#8-data-protection-backup--disaster-recovery-guide)
9. [Deployment, Environment Setup & Cloudflare Tunneling](#9-deployment-environment-setup--cloudflare-tunneling)

---

## 1. Executive Summary & Architectural Overview

Standard Roofs Books (SR-Books) is an in-house enterprise ERP and Indian GST accounting web application built specifically for **Standard Roofs**, a premier industrial roofing and pre-engineered building (PEB) contractor based in Erode, Tamil Nadu.

The application combines the ease-of-use and aesthetic clarity of **Zoho Books** with the operational depth of **Zoho One**, delivering:
* **Statutory Compliance:** Full compliance with Central Goods and Services Tax Act, 2017 (CGST, SGST, IGST, HSN/SAC codes, reverse charge mechanism, and state code 33 validation).
* **Double-Entry General Ledger:** Instant balanced debit and credit journal generation for every transaction without manual posting.
* **Operational Workspaces:** Unifies Accounting, Site Operations, Heavy Machinery & Fleet Vehicles, Labour Muster & Sub-Contractor Management, and Corporate Security under a single responsive interface.

---

## 2. Full-Stack Architecture & Data Flow

```mermaid
flowchart TD
    Client["Browser Client (Desktop, Tablet, Mobile)"]
    Edge["Edge Middleware (Anti-Cache Headers & Session Verification)"]
    NextServer["Next.js 15 Server (React 19 Server Components & Actions)"]
    Prisma["Prisma ORM 6.5 (Decimal.js Arithmetic)"]
    NeonDB[("Neon Cloud PostgreSQL (High Availability Pooler)")]
    Tunnel["Cloudflare Zero-Trust Secure Tunnel"]

    Client -->|HTTPS / WSS| Edge
    Edge --> NextServer
    NextServer --> Prisma
    Prisma --> NeonDB
    NextServer <--> Tunnel
    Tunnel <--> Client
```

### Key Architectural Layers
1. **Presentation Layer (React 19 & Tailwind CSS v4):** Pure server-rendered pages by default with client-side interactive islands (`"use client"`) for charts, filter toolbars, and modals.
2. **Security & Routing Layer (Next.js Middleware):** Enforces strict anti-cache HTTP headers on all `/invoices`, `/banking`, `/customers`, etc., and intercepts unauthorized requests.
3. **Business Logic & Accounting Engine:** Encapsulated within server actions and route handlers using `Decimal.js` to ensure zero rounding or floating-point discrepancy.
4. **Persistence Layer (Prisma 6.5 on Neon PostgreSQL):** Serverless PostgreSQL database hosted on Neon Cloud with automated connection pooling (`DATABASE_URL`) and direct migrations (`DIRECT_URL`).

---

## 3. Database Schema & Entity-Relationship (ER) Dictionary

The database schema (`prisma/schema.prisma`) comprises 60 distinct models partitioned into core operational domains:

```mermaid
erDiagram
    FinancialYear ||--o{ VoucherSequence : contains
    FinancialYear ||--o{ Invoice : records
    Customer ||--o{ Invoice : bills
    Customer ||--o{ Project : owns
    Project ||--o{ Invoice : generates
    Invoice ||--o{ InvoiceItem : lists
    Invoice ||--o{ InvoicePayment : collects
    Account ||--o{ JournalLine : tracks
    JournalEntry ||--o{ JournalLine : balances
    BankAccount ||--o{ BankTransaction : records
    Supplier ||--o{ PurchaseOrder : receives
    PurchaseOrder ||--o{ PurchaseBill : converts
    Contractor ||--o{ ContractorMilestone : assigns
```

### Domain Model Specifications

#### 1. Core & Accounting Ledger
* **`User`:** Corporate identity, hashed password (bcrypt), role enum (`SUPER_ADMIN`, `MANAGING_DIRECTOR`, `ACCOUNTANT`, `HR_MANAGER`, `SITE_SUPERVISOR`), and active status.
* **`Account`:** General ledger chart of accounts. Includes code (`1010`, `1020`, `2010`, etc.), name, type (`ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`), subtype, opening balance, and current balance.
* **`JournalEntry` & `JournalLine`:** The core double-entry foundation. Every entry carries an auto-generated entry number, date, voucher type, status (`POSTED`, `DRAFT`, `REVERSED`), and child lines with debit and credit amounts.
* **`FinancialYear` & `VoucherSequence`:** Controls fiscal period bounds (e.g. `2026-27`), period lock status (`isLocked`), and per-voucher sequential numbering.

#### 2. Sales & Accounts Receivable (AR)
* **`Customer`:** Client profile, legal business name, GSTIN, PAN, state code, credit terms, and opening receivables.
* **`Invoice`:** Works contract tax invoice. Tracks `invoiceNumber` (e.g. `SR/26-27/0033`), customer relation, project relation, subtotal, CGST, SGST, IGST, adjustment, total amount, balance due, and status (`DRAFT`, `UNPAID`, `PARTIAL`, `PAID`, `VOID`).
* **`InvoiceItem`:** Line item with description, HSN/SAC code, quantity, unit rate, tax rate, and computed taxable value.
* **`Estimate` & `SalesOrder`:** Pre-billing workflow records with status lifecycle and 1-click conversion to invoices.
* **`CreditDebitNote`:** Downward tax and price adjustments referencing original invoices.

#### 3. Banking, Liquidity & Cash Flow
* **`BankAccount`:** Bank accounts (primarily ICICI Bank `155205003161`). Stores branch, IFSC, account type, opening balance, and live ledger balance.
* **`BankTransaction`:** Inflow/outflow entries with voucher reference, payee/payer details, and reconciliation status.
* **`CashBookEntry` & `DailyCashClosing`:** Petty cash register with physical denomination validation and shift balance verification.

#### 4. Site Operations, Inventory & Heavy Machinery
* **`Project`:** Site profile, location, contract value, customer, status (`PLANNING`, `IN_PROGRESS`, `COMPLETED`), and milestone costing.
* **`MachineAsset`:** Heavy equipment (Welding Sets, Cutting Machines, Breakers, Screwing Machines, Testers) with serial numbers, count, and custody location.
* **`CargoVehicle` & `VehicleTripLog`:** Logistics vehicles, driver details, odometer readings, and delivery fuel logs.
* **`RoofingPriceItem`:** 290 standard pre-configured catalog items with HSN codes, default rates, and category classifications.

---

## 4. Indian GST Calculation & Double-Entry Accounting Engine

### 4.1 Statutory GST Taxation Math
* **Place of Supply Rule:**
  * When `Customer.stateCode === "33"` (Tamil Nadu):
    $$\text{CGST} = \text{Taxable Value} \times 9\%$$
    $$\text{SGST} = \text{Taxable Value} \times 9\%$$
    $$\text{IGST} = 0$$
  * When `Customer.stateCode !== "33"` (Outside Tamil Nadu):
    $$\text{CGST} = 0, \quad \text{SGST} = 0$$
    $$\text{IGST} = \text{Taxable Value} \times 18\%$$
* **Rounding / Adjustment (5999):**
  $$\text{Invoice Total} = \text{Round}(\text{SubTotal} + \text{Taxes})$$
  $$\text{Adjustment} = \text{Invoice Total} - (\text{SubTotal} + \text{Taxes})$$

### 4.2 Standard Double-Entry Ledger Posting Rules

| Transaction Type | Debit Leg (Dr) | Credit Leg (Cr) | Purpose |
| :--- | :--- | :--- | :--- |
| **Sales Works Tax Invoice** | **Dr** Debtors Control (1030) | **Cr** Works Contract Revenue (4010)<br>**Cr** Output CGST (2020)<br>**Cr** Output SGST (2030)<br>**Cr/Dr** Round Off (5999) | Recognizes sales revenue and statutory GST output liability. |
| **Client Invoice Payment** | **Dr** ICICI Bank (1020) or Cash (1010) | **Cr** Debtors Control (1030) | Extinguishes customer receivable upon receipt. |
| **Vendor Purchase Bill** | **Dr** Raw Material Purchases (5010)<br>**Dr** Input CGST (1050)<br>**Dr** Input SGST (1060) | **Cr** Creditors Control (2010) | Records procurement expense and claims statutory ITC. |
| **Bank Contra (Cash Deposit)** | **Dr** ICICI Bank (1020) | **Cr** Cash in Hand (1010) | Transfers physical petty cash into bank account. |
| **Site Expense Claim** | **Dr** Relevant Direct Site Expense (50XX) | **Cr** Cash (1010) or Employee Payable | Records daily site operational costs. |

---

## 5. Security, Session Guard & Zero BFcache Architecture

### 5.1 HTTP Anti-Cache Edge Security (`src/middleware.ts`)
To protect financial confidentiality on shared or office desktop terminals, the application intercepts all requests to protected routes (`/invoices`, `/banking`, `/customers`, etc.) and attaches strict HTTP response headers:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
Surrogate-Control: no-store
```

### 5.2 Client Session Guard (`src/components/layout/AppShell.tsx`)
A client-side listener listens to browser navigation events:
```typescript
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from bfcache (Back/Forward cache)
    window.location.reload();
  }
});
```
When a user logs out, the authentication cookie is destroyed, local cache is flushed, and `window.location.replace('/login')` replaces browser history. Pressing the Back arrow immediately forces a server re-validation which redirects to `/login`.

---

## 6. Complete API Endpoints Specification

| Endpoint | Method | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates credentials, sets HTTP-only session cookie. |
| `/api/auth/logout` | `POST` | Authenticated | Clears JWT session cookie and invalidates session. |
| `/api/invoices` | `GET, POST` | Accountant+ | Lists invoices or creates a new GST tax invoice with journal posting. |
| `/api/invoices/[id]` | `GET, PUT, DELETE`| Accountant+ | Retrieves, updates, or soft-deletes (archives) an invoice. |
| `/api/banking/contra` | `POST` | Accountant+ | Executes cash-to-bank or bank-to-bank double-entry contra transfer. |
| `/api/banking/reconcile`| `POST` | Accountant+ | Matches ledger records against imported bank statements. |
| `/api/cashbook/closing`| `POST` | Accountant+ | Records physical denomination count and shift verification. |
| `/api/import/[entity]` | `POST` | Accountant+ | Bulk spreadsheet parser and dry-run upsert validator. |
| `/api/reports/export` | `GET` | Accountant+ | Generates downloadable Excel reports for P&L, Balance Sheet, GSTR. |
| `/api/settings/backup` | `GET` | Super Admin | Generates encrypted full JSON snapshot of all database tables. |
| `/api/settings/fy-lock`| `POST` | Super Admin | Toggles period lock status for closed financial quarters. |

---

## 7. Universal UI Components & Visual Analytics Architecture

### 7.1 Universal Module Header (`ModuleHeaderWithAnalytics.tsx`)
A shared component deployed across all 28 modules providing:
* 4 mini trend cards with positive/negative delta badges.
* Collapsible charts section with `Show / Hide Analytics` toggle.
* Standardized Zoho module toolbar with status dropdown, search bar, bulk import, Excel export, and PDF print buttons.

### 7.2 Mathematical Cubic Bézier Spline Chart Engine
Used in the home financial command center for silky, organic cash flow curves:
```typescript
function getSmoothSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}
```

---

## 8. Data Protection, Backup & Disaster Recovery Guide

1. **Strict Soft-Delete Principle:** No row in `Invoice`, `Customer`, `Project`, `Account`, or `MachineAsset` is ever permanently deleted via standard UI actions. Every model implements `isArchived: Boolean @default(false)` and `archivedAt: DateTime?`.
2. **Neon Cloud Automated Snapshots:** Neon PostgreSQL provides point-in-time recovery (PITR) with continuous write-ahead log (WAL) archiving.
3. **JSON Database Export:** The Super Admin can trigger `/api/settings/backup` at any time to receive a single portable JSON file containing all relational table rows for cold offline storage.

---

## 9. Deployment, Environment Setup & Cloudflare Tunneling

### 9.1 Environment Configuration (`.env`)
```env
# Neon Cloud Serverless PostgreSQL connection
DATABASE_URL="postgresql://[user]:[password]@ep-sample-pooler.us-east-2.aws.neon.tech/standardroofs_db?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@ep-sample.us-east-2.aws.neon.tech/standardroofs_db?sslmode=require"

# JWT Secret for Session Cookies
JWT_SECRET="e9a71b...min-32-chars-hex..."

# Application Public Hostname
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 9.2 Build & Execution
```bash
# Compile optimized production bundle
npm run build

# Start production server
npm run start
```

### 9.3 Cloudflare Zero-Trust Secure Tunnelling
```bash
cloudflared tunnel --url http://localhost:3000
```
Provides an encrypted public URL with DDoS mitigation and SSL termination without opening local router firewall ports.
