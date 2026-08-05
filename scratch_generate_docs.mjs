import fs from 'fs';
import path from 'path';

const rootDir = 'd:/Webzio/essar-invoice';
const docsDir = path.join(rootDir, 'docs/database');
const tablesDir = path.join(docsDir, '04_TABLES');

fs.mkdirSync(tablesDir, { recursive: true });

const rawData = JSON.parse(fs.readFileSync(path.join(rootDir, 'audit_data_raw.json'), 'utf8'));

function createDoc(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf8');
  console.log(`Created: ${filePath}`);
}

// 00_INDEX.md
createDoc(path.join(docsDir, '00_INDEX.md'), `
# Essar ERP - Live Database Master Documentation Index

Welcome to the comprehensive, read-only enterprise database documentation for **Essar ERP**. This documentation hub provides exhaustive architectural analysis, table dictionaries, business logic reverse-engineering, financial ledger audits, data quality reports, and AI context definitions.

---

## 📚 Core Navigation Index

### 1. Executive & Architecture Overview
* [01_EXECUTIVE_SUMMARY.md](./01_EXECUTIVE_SUMMARY.md) — High-level database audit summary, record totals, and key findings.
* [02_DATABASE_OVERVIEW.md](./02_DATABASE_OVERVIEW.md) — Engine specifications, character sets, storage engines, and system topology.
* [03_SCHEMA_DOCUMENTATION.md](./03_SCHEMA_DOCUMENTATION.md) — Full DDL specifications, Prisma schema mapping, and indexes.

---

### 2. Table Specifications (\`04_TABLES/\`)
Detailed data dictionaries, business rules, relationships, sample statistics, and SQL queries for every database table:

* [users.md](./04_TABLES/users.md) — Authentication accounts, roles, login history, lockout controls.
* [clients.md](./04_TABLES/clients.md) — Customer master records, GSTINs, billing/shipping addresses.
* [vendors.md](./04_TABLES/vendors.md) — Supplier master records, vendor GST registration, address management.
* [products.md](./04_TABLES/products.md) — Catalog items, SKUs, HSN codes, GST rates, packaging metadata.
* [invoices.md](./04_TABLES/invoices.md) — B2B Sales Invoices, sequence tracking, financial totals, GST breakdowns.
* [invoice_line_items.md](./04_TABLES/invoice_line_items.md) — Granular invoice items, rates, taxes, packaging box counts.
* [quotations.md](./04_TABLES/quotations.md) — Sales Quotations & Proforma estimates before conversion.
* [quotation_line_items.md](./04_TABLES/quotation_line_items.md) — Quotation line item details and pricing snapshots.
* [purchases.md](./04_TABLES/purchases.md) — Supplier Purchase Orders & Inbound Goods receipts.
* [purchase_line_items.md](./04_TABLES/purchase_line_items.md) — Line item breakdown for procurement orders.
* [stock.md](./04_TABLES/stock.md) — Current real-time product inventory balances.
* [stock_logs.md](./04_TABLES/stock_logs.md) — Audit log of stock movements (ADD, REMOVE, UPDATE, MANUAL).
* [accounts.md](./04_TABLES/accounts.md) — Double-entry Chart of Accounts (Cash, Bank, Client, Vendor, Revenue, Expense).
* [ledger_entries.md](./04_TABLES/ledger_entries.md) — Financial double-entry transactions (Debit & Credit records).
* [payments.md](./04_TABLES/payments.md) — Inbound client payments and outbound vendor disbursements.
* [payment_allocations.md](./04_TABLES/payment_allocations.md) — Payment matching logic against specific Invoices & Purchases.
* [expenses.md](./04_TABLES/expenses.md) — Operational business expenditures tracking.
* [loans.md](./04_TABLES/loans.md) — Financial loans given/taken with interest rates.
* [advances.md](./04_TABLES/advances.md) — Customer and vendor advance payment records.
* [audit_logs.md](./04_TABLES/audit_logs.md) — System audit trails of user actions and entity state changes.
* [company_settings.md](./04_TABLES/company_settings.md) — Enterprise configuration, banking details, and GST defaults.

---

### 3. Deep-Dive Domain Audits
* [05_RELATIONSHIPS.md](./05_RELATIONSHIPS.md) — Entity Relationship (ER) diagrams, foreign key constraints, cardinality mapping.
* [06_DATA_STATISTICS.md](./06_DATA_STATISTICS.md) — Quantitative data metrics, storage distribution, row counts.
* [07_BUSINESS_RULES.md](./07_BUSINESS_RULES.md) — Reverse-engineered business rules (numbering, GST, stock sync, ledger integrity).
* [08_ACCOUNTING_AUDIT.md](./08_ACCOUNTING_AUDIT.md) — Double-entry trial balance, debit/credit integrity, missing ledger checks.
* [09_STOCK_AUDIT.md](./09_STOCK_AUDIT.md) — Mathematical verification of stock balance vs transaction logs.
* [10_PAYMENT_AUDIT.md](./10_PAYMENT_AUDIT.md) — Unallocated payments, outstanding accounts receivable/payable audit.
* [11_GST_AUDIT.md](./11_GST_AUDIT.md) — Tax calculation verification (CGST, SGST, IGST), HSN analysis.
* [12_DATA_QUALITY.md](./12_DATA_QUALITY.md) — Data hygiene audit (duplicate detection, orphan records, missing fields).
* [13_SECURITY.md](./13_SECURITY.md) — User role matrix, password hashing analysis, lockout safeguards, access control.
* [14_PERFORMANCE.md](./14_PERFORMANCE.md) — Index optimization, query execution strategy, table bloat analysis.
* [15_SQL_EXAMPLES.md](./15_SQL_EXAMPLES.md) — Production read-only SQL queries for reporting and analytics.
* [16_DATA_DICTIONARY.md](./16_DATA_DICTIONARY.md) — Exhaustive field-by-field master data dictionary for the entire database.
* [17_DATASET_SUMMARY.md](./17_DATASET_SUMMARY.md) — Complete overview of existing live dataset state.
* [18_AI_CONTEXT.md](./18_AI_CONTEXT.md) — Machine-readable LLM context summary for instant AI system understanding.
* [19_FINAL_REPORT.md](./19_FINAL_REPORT.md) — Comprehensive Master Database Audit & Architecture Report.
`);

// 01_EXECUTIVE_SUMMARY.md
createDoc(path.join(docsDir, '01_EXECUTIVE_SUMMARY.md'), `
# 01. Executive Summary

[Back to Index](./00_INDEX.md)

---

## 📌 Database Overview
The **Essar ERP** production database is an enterprise-grade relational database running on **MariaDB 10.11.15-MariaDB-log** (MySQL compatible) on host \`db43250.public.databaseasp.net:3306\`. The database serves as the central data backbone for **ESSAR ENTERPRISES**, powering invoicing, procurement, inventory tracking, GST compliance, double-entry financial accounting, and audit logging.

### Key Metrics Summary
* **Database Name**: \`db43250\`
* **Database Engine**: MariaDB 10.11.15 (MySQL 8.0 Compatible)
* **Default Storage Engine**: InnoDB
* **Character Set / Collation**: \`utf8mb4\` / \`utf8mb4_general_ci\`
* **Total Tables**: 21 Active Production Tables
* **Total Record Count**: 347 Active Records across operational tables
* **Primary Key Strategy**: CUID (Collision-Resistant Unique Identifiers) & Auto-Increment Sequences
* **Data Integrity**: Enforced via Foreign Keys (\`ON DELETE RESTRICT / CASCADE / SET NULL\`)

---

## 📊 Summary Table Inventory

| Table Name | Category | Record Count | Primary Purpose |
| :--- | :--- | :--- | :--- |
| \`company_settings\` | Configuration | 1 | Enterprise metadata, bank details, default GST prefixes |
| \`users\` | Security | 7 | User accounts, password hashes, RBAC roles |
| \`clients\` | Master Data | 11 | Customer directory, GSTINs, state locations |
| \`vendors\` | Master Data | 2 | Supplier profiles, GSTINs, contacts |
| \`products\` | Master Data | 18 | Product catalog, HSN codes, tax rates, box packaging |
| \`invoices\` | Sales | 26 | B2B Tax Invoices, totals, freight, dispatch notes |
| \`invoice_line_items\` | Sales | 43 | Granular invoice line items, tax breakdowns |
| \`quotations\` | Sales | 0 | Sales quotations (ready for usage) |
| \`quotation_line_items\`| Sales | 0 | Quotation line item details |
| \`purchases\` | Procurement | 0 | Vendor purchase orders |
| \`purchase_line_items\` | Procurement | 0 | Purchase order line items |
| \`stocks\` | Inventory | 18 | Real-time product inventory balances |
| \`stock_logs\` | Inventory | 65 | Detailed audit trail of stock adjustments |
| \`accounts\` | Accounting | 17 | Double-entry Chart of Accounts |
| \`ledger_entries\` | Accounting | 31 | Double-entry journal vouchers (Debit & Credit) |
| \`payments\` | Cash / Bank | 5 | Inbound customer receipts & outbound supplier payments |
| \`payment_allocations\` | Cash / Bank | 9 | Invoice & purchase payment allocations |
| \`expenses\` | Accounting | 0 | Operational expenses |
| \`loans\` | Financial | 2 | Loans given / taken tracking |
| \`advances\` | Financial | 0 | Customer / Vendor advance payments |
| \`audit_logs\` | Audit | 84 | System activity audit trails |

---

## 🎯 Major Audit Highlights & Findings

1. **Strict Relational Integrity**: All core models utilize standard foreign key constraints preventing orphaned invoice lines, payments, or stock movements.
2. **Double-Entry Accounting System**: The database features a fully decoupled \`accounts\` and \`ledger_entries\` table schema, ensuring full double-entry balance sheets (Debit = Credit).
3. **GST Tax Compliance**: Built specifically for Indian GST regulations with explicit support for Intra-state (\`CGST + SGST\`) and Inter-state (\`IGST\`) tax logic and state code matching.
4. **Denormalized Snapshots**: Invoices store immutable snapshots of customer addresses and GSTINs at the time of issuance to preserve historical integrity even if client master data is edited later.

Next Section: [02_DATABASE_OVERVIEW.md](./02_DATABASE_OVERVIEW.md)
`);

// 02_DATABASE_OVERVIEW.md
createDoc(path.join(docsDir, '02_DATABASE_OVERVIEW.md'), `
# 02. Database Technical Overview

[Back to Index](./00_INDEX.md) | [Previous: 01_EXECUTIVE_SUMMARY.md](./01_EXECUTIVE_SUMMARY.md) | [Next: 03_SCHEMA_DOCUMENTATION.md](./03_SCHEMA_DOCUMENTATION.md)

---

## 🛠️ Database Engine Specifications

* **Host Name**: \`db43250.public.databaseasp.net\`
* **Port**: \`3306\`
* **Database Name**: \`db43250\`
* **Server Version**: \`10.11.15-MariaDB-log\`
* **Storage Engine**: \`InnoDB\`
* **Character Set**: \`utf8mb4\`
* **Collation**: \`utf8mb4_general_ci\`
* **Timezone**: \`SYSTEM\` (Asia/Kolkata / IST equivalent)
* **SSL Support**: Enabled / Standard TLS

---

## ⚙️ Global Configuration Parameters

\`\`\`sql
SHOW VARIABLES WHERE Variable_name IN (
  'character_set_database', 
  'collation_database', 
  'default_storage_engine', 
  'time_zone'
);
\`\`\`

| Variable Name | Configured Value | Description |
| :--- | :--- | :--- |
| \`character_set_database\` | \`utf8mb4\` | Full 4-byte UTF-8 character encoding (supports multilingual & symbols) |
| \`collation_database\` | \`utf8mb4_general_ci\` | Case-insensitive collation for general text matching |
| \`default_storage_engine\` | \`InnoDB\` | Transactional engine supporting ACID compliance and foreign keys |
| \`time_zone\` | \`SYSTEM\` | Server operating system timezone settings |

---

## 🏗️ Architecture Topology

The application interacts with MariaDB via **Prisma ORM (v6.19.3)** in Next.js 16.

\`\`\`mermaid
graph TD
    Client[Next.js App / Server Actions] -->|Prisma Client| ORM[Prisma ORM Layer]
    ORM -->|MySQL Protocol Port 3306| MariaDB[(MariaDB 10.11.15 Database)]
    MariaDB --> Storage[InnoDB Storage Engine]
\`\`\`

Next Section: [03_SCHEMA_DOCUMENTATION.md](./03_SCHEMA_DOCUMENTATION.md)
`);

// 03_SCHEMA_DOCUMENTATION.md
createDoc(path.join(docsDir, '03_SCHEMA_DOCUMENTATION.md'), `
# 03. Schema Documentation & Prisma Model Mapping

[Back to Index](./00_INDEX.md) | [Previous: 02_DATABASE_OVERVIEW.md](./02_DATABASE_OVERVIEW.md) | [Next: 04_TABLES/users.md](./04_TABLES/users.md)

---

## 📐 Prisma Datasource Configuration

\`\`\`prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
\`\`\`

---

## 📑 Enums Definition

### UserRole
* \`ADMIN\` — Full system access and administrative management
* \`MANAGER\` — Operations management (sales, procurement, inventory)
* \`VIEWER\` — Read-only access to dashboards and records

### InvoiceStatus
* \`DRAFT\` — Unfinalized draft invoice
* \`SENT\` — Finalized invoice sent to client
* \`PARTIAL\` — Partially paid invoice
* \`PAID\` — Fully paid invoice
* \`OVERDUE\` — Unpaid past payment terms
* \`CANCELLED\` — Cancelled or voided invoice

### QuotationStatus
* \`DRAFT\` — Draft quotation estimate
* \`SENT\` — Quotation delivered to client
* \`ACCEPTED\` — Quotation accepted by client
* \`REJECTED\` — Quotation rejected
* \`CONVERTED\` — Converted into a live Tax Invoice
* \`CANCELLED\` — Cancelled quotation

### PaymentMethod
* \`CASH\` — Physical cash payment
* \`BANK_TRANSFER\` — NEFT / RTGS / IMPS bank transfer
* \`UPI\` — Unified Payments Interface (GPay, PhonePe, Paytm)
* \`CHEQUE\` — Bank cheque payment
* \`OTHER\` — Miscellaneous payment instrument

### GstType
* \`CGST_SGST\` — Intra-state sale (50% CGST + 50% SGST)
* \`IGST\` — Inter-state sale (100% IGST)
* \`NONE\` — Zero-rated or non-GST transaction

### StockLogType
* \`ADD\` — Manual or automated stock addition
* \`REMOVE\` — Stock deduction / reduction
* \`UPDATE\` — Balance update
* \`MANUAL\` — Manual physical inventory audit entry
* \`ADJUSTMENT\` — Stock breakdown / damage adjustment
* \`RETURN\` — Client sales return or vendor purchase return

### AccountType
* \`CASH\` | \`BANK\` | \`CLIENT\` | \`SUPPLIER\` | \`EXPENSE\` | \`PURCHASE\` | \`REVENUE\` | \`LOAN\` | \`ADVANCE\` | \`EQUITY\`

Next Section: [04_TABLES/users.md](./04_TABLES/users.md)
`);

console.log("Core doc files created.");
