# Essar ERP Live Database Complete Export

This directory contains the **complete live database export** from the **Essar ERP** MariaDB production database (`db43250.public.databaseasp.net:3306`).

---

## 📌 Export Metadata

* **Export Date & Time**: `2026-08-05T20:37:18.692Z`
* **Database Engine**: `MariaDB 10.11.15-MariaDB-log`
* **Database Name**: `db43250`
* **Character Set / Collation**: `utf8mb4` / `utf8mb4_general_ci`
* **Total Exported Tables**: `21`
* **Total Exported Records**: `191`

---

## 📁 Directory Structure

```
database_export/
├── README.md               # Master export report and file manifest
├── metadata.json           # Machine-readable database metadata & record counts
├── schema.sql              # Complete DDL SQL schema (CREATE TABLE, FKs, Indexes)
├── csv/                    # CSV data files for every database table
│   ├── users.csv
│   ├── clients.csv
│   ├── vendors.csv
│   ├── products.csv
│   ├── invoices.csv
│   ├── invoice_line_items.csv
│   ├── quotations.csv
│   ├── quotation_line_items.csv
│   ├── purchases.csv
│   ├── purchase_line_items.csv
│   ├── payments.csv
│   ├── payment_allocations.csv
│   ├── accounts.csv
│   ├── ledger_entries.csv
│   ├── stock.csv
│   ├── stock_logs.csv
│   ├── expenses.csv
│   ├── loans.csv
│   ├── advances.csv
│   ├── company_settings.csv
│   └── audit_logs.csv
├── json/                   # JSON data files for every database table
└── tables/                 # Per-table JSON data files
```

---

## 📊 Table Record Verification Manifest

| Table Name | CSV File | JSON File | Exported Row Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `csv/users.csv` | `json/users.json` | **1** | ✅ Complete |
| `clients` | `csv/clients.csv` | `json/clients.json` | **8** | ✅ Complete |
| `vendors` | `csv/vendors.csv` | `json/vendors.json` | **0** | ✅ Complete |
| `products` | `csv/products.csv` | `json/products.json` | **16** | ✅ Complete |
| `invoices` | `csv/invoices.csv` | `json/invoices.json` | **13** | ✅ Complete |
| `invoice_line_items` | `csv/invoice_line_items.csv` | `json/invoice_line_items.json` | **17** | ✅ Complete |
| `quotations` | `csv/quotations.csv` | `json/quotations.json` | **0** | ✅ Complete |
| `quotation_line_items` | `csv/quotation_line_items.csv` | `json/quotation_line_items.json` | **0** | ✅ Complete |
| `purchases` | `csv/purchases.csv` | `json/purchases.json` | **0** | ✅ Complete |
| `purchase_line_items` | `csv/purchase_line_items.csv` | `json/purchase_line_items.json` | **0** | ✅ Complete |
| `payments` | `csv/payments.csv` | `json/payments.json` | **0** | ✅ Complete |
| `payment_allocations` | `csv/payment_allocations.csv` | `json/payment_allocations.json` | **0** | ✅ Complete |
| `accounts` | `csv/accounts.csv` | `json/accounts.json` | **0** | ✅ Complete |
| `ledger_entries` | `csv/ledger_entries.csv` | `json/ledger_entries.json` | **0** | ✅ Complete |
| `stock` | `csv/stock.csv` | `json/stock.json` | **12** | ✅ Complete |
| `stock_logs` | `csv/stock_logs.csv` | `json/stock_logs.json` | **59** | ✅ Complete |
| `expenses` | `csv/expenses.csv` | `json/expenses.json` | **0** | ✅ Complete |
| `loans` | `csv/loans.csv` | `json/loans.json` | **0** | ✅ Complete |
| `advances` | `csv/advances.csv` | `json/advances.json` | **0** | ✅ Complete |
| `company_settings` | `csv/company_settings.csv` | `json/company_settings.json` | **1** | ✅ Complete |
| `audit_logs` | `csv/audit_logs.csv` | `json/audit_logs.json` | **64** | ✅ Complete |

---

## 🔒 Verification & Compliance
* **Data Completeness**: 100% of records, columns, NULL values, and soft-deleted rows exported.
* **Read-Only Mode**: 0 write queries executed against the live database.
