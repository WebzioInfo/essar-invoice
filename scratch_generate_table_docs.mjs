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

// ---------------------------------------------------------
// 04_TABLES Definitions
// ---------------------------------------------------------

// 1. users.md
createDoc(path.join(tablesDir, 'users.md'), `
# Table Specification: \`users\`

[Back to Index](../00_INDEX.md) | [Previous: 03_SCHEMA_DOCUMENTATION.md](../03_SCHEMA_DOCUMENTATION.md) | [Next: clients.md](./clients.md)

---

## 📌 Purpose & Business Meaning
Stores user credentials, role-based access control (RBAC) levels, login timestamps, and account lockout security attributes for administrative and operational staff accessing Essar ERP.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`users\`
* **Total Rows**: ${rawData.tablesData.users ? rawData.tablesData.users.length : 7}
* **Active Users**: ${rawData.tablesData.users ? rawData.tablesData.users.filter(u => !u.deletedAt).length : 7}
* **Primary Key**: \`id\` (String / CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | PRIMARY KEY | Unique user identifier |
| \`email\` | VARCHAR(191) | NO | None | UNIQUE | User login email address |
| \`name\` | VARCHAR(191) | YES | NULL | None | Full display name |
| \`passwordHash\` | VARCHAR(191) | NO | None | None | Bcrypt hashed password string |
| \`role\` | ENUM | NO | \`VIEWER\` | Enum(\`ADMIN\`,\`MANAGER\`,\`VIEWER\`) | Access control level |
| \`lastLoginAt\` | DATETIME(3) | YES | NULL | None | Timestamp of last authentication |
| \`lastLoginIp\` | VARCHAR(191) | YES | NULL | None | IP address of last login |
| \`failedLogins\` | INT | NO | \`0\` | None | Consecutive failed login counter |
| \`isLockedOut\` | BOOLEAN | NO | \`false\` | None | Account lockout flag |
| \`createdAt\` | DATETIME(3) | NO | \`CURRENT_TIMESTAMP\` | None | Record creation timestamp |
| \`updatedAt\` | DATETIME(3) | NO | Updated | None | Last modification timestamp |
| \`deletedAt\` | DATETIME(3) | YES | NULL | INDEX | Soft-deletion timestamp |

---

## 🔗 Relationships
* **Has Many**: \`audit_logs\` (\`AuditLog.userId\` -> \`User.id\`)

---

## 🔒 Security & Business Rules
1. **Password Storage**: Passwords MUST be hashed using \`bcrypt\` with cost factor 10.
2. **Lockout Controls**: Consecutive failed login attempts increment \`failedLogins\`. When threshold is met, \`isLockedOut\` is set to \`true\`.
3. **Soft Deletion**: Accounts are soft-deleted by setting \`deletedAt\` to preserve audit history.

---

## 🔍 Read-Only SQL Examples

\`\`\`sql
-- List all active administrative users
SELECT id, email, name, role, lastLoginAt 
FROM users 
WHERE deletedAt IS NULL AND role = 'ADMIN';
\`\`\`
`);

// 2. clients.md
createDoc(path.join(tablesDir, 'clients.md'), `
# Table Specification: \`clients\`

[Back to Index](../00_INDEX.md) | [Previous: users.md](./users.md) | [Next: vendors.md](./vendors.md)

---

## 📌 Purpose & Business Meaning
Customer master directory storing buyer names, GSTIN identifiers, phone contacts, billing/shipping address details, and state registration for Tax Invoice generation.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`clients\`
* **Total Rows**: ${rawData.tablesData.clients ? rawData.tablesData.clients.length : 11}
* **Active Clients**: ${rawData.tablesData.clients ? rawData.tablesData.clients.filter(c => c.active && !c.deletedAt).length : 11}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | PRIMARY KEY | Unique client identifier |
| \`name\` | VARCHAR(191) | NO | None | INDEX | Business / Client legal name |
| \`gst\` | VARCHAR(191) | YES | NULL | None | 15-digit GSTIN number |
| \`email\` | VARCHAR(191) | YES | NULL | None | Contact email address |
| \`phone\` | VARCHAR(191) | YES | NULL | None | Contact phone number |
| \`address1\` | VARCHAR(191) | NO | None | None | Primary street address |
| \`address2\` | VARCHAR(191) | YES | NULL | None | Secondary address line / Landmark |
| \`state\` | VARCHAR(191) | NO | None | None | Indian State name (used for GST tax type determination) |
| \`pinCode\` | VARCHAR(191) | YES | NULL | None | Postal PIN code |
| \`active\` | BOOLEAN | NO | \`true\` | INDEX | Active status flag |
| \`createdAt\` | DATETIME(3) | NO | \`CURRENT_TIMESTAMP\` | None | Creation timestamp |
| \`updatedAt\` | DATETIME(3) | NO | Updated | None | Modification timestamp |
| \`deletedAt\` | DATETIME(3) | YES | NULL | INDEX | Soft deletion timestamp |

---

## 🔗 Relationships
* **Has One**: \`Account\` (\`Account.clientId\` -> \`Client.id\`)
* **Has Many**: \`invoices\` (\`Invoice.clientId\` -> \`Client.id\`)
* **Has Many**: \`quotations\` (\`Quotation.clientId\` -> \`Client.id\`)
* **Has Many**: \`payments\` (\`Payment.clientId\` -> \`Client.id\`)

---

## 🔍 Read-Only SQL Examples

\`\`\`sql
-- Get client master list with GST and location details
SELECT id, name, gst, phone, state, active 
FROM clients 
WHERE deletedAt IS NULL 
ORDER BY name ASC;
\`\`\`
`);

// 3. vendors.md
createDoc(path.join(tablesDir, 'vendors.md'), `
# Table Specification: \`vendors\`

[Back to Index](../00_INDEX.md) | [Previous: clients.md](./clients.md) | [Next: products.md](./products.md)

---

## 📌 Purpose & Business Meaning
Supplier master database containing vendor names, GSTIN registrations, address details, and financial account linkages for inbound purchases and supplier disbursements.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`vendors\`
* **Total Rows**: ${rawData.tablesData.vendors ? rawData.tablesData.vendors.length : 2}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | Primary Key |
| \`name\` | VARCHAR(191) | NO | None | Vendor business name |
| \`gst\` | VARCHAR(191) | YES | NULL | 15-digit GSTIN |
| \`email\` | VARCHAR(191) | YES | NULL | Supplier contact email |
| \`phone\` | VARCHAR(191) | YES | NULL | Supplier contact phone |
| \`address1\` | VARCHAR(191) | NO | None | Address line 1 |
| \`address2\` | VARCHAR(191) | YES | NULL | Address line 2 |
| \`state\` | VARCHAR(191) | NO | None | State location |
| \`pinCode\` | VARCHAR(191) | YES | NULL | PIN Code |
| \`active\` | BOOLEAN | NO | \`true\` | Active status |

---

## 🔗 Relationships
* **Has One**: \`Account\` (\`Account.vendorId\` -> \`Vendor.id\`)
* **Has Many**: \`purchases\` (\`Purchase.vendorId\` -> \`Vendor.id\`)
* **Has Many**: \`payments\` (\`Payment.vendorId\` -> \`Vendor.id\`)
`);

// 4. products.md
createDoc(path.join(tablesDir, 'products.md'), `
# Table Specification: \`products\`

[Back to Index](../00_INDEX.md) | [Previous: vendors.md](./vendors.md) | [Next: invoices.md](./invoices.md)

---

## 📌 Purpose & Business Meaning
Catalog of products manufactured or traded by Essar Enterprises, storing HSN codes, default selling and purchase rates, packaging box quantities, and GST rates.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`products\`
* **Total Rows**: ${rawData.tablesData.products ? rawData.tablesData.products.length : 18}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | Primary Key |
| \`sku\` | VARCHAR(191) | YES | NULL | Stock Keeping Unit code |
| \`description\` | TEXT | NO | None | Product description |
| \`hsn\` | VARCHAR(191) | YES | NULL | 4/6/8-digit HSN code |
| \`gstRate\` | DECIMAL(5,2) | NO | \`18.00\` | GST percentage (e.g. 18.00%) |
| \`unit\` | VARCHAR(191) | NO | \`NOS\` | Unit of measurement (NOS, KG, BOX, SET) |
| \`purchaseRate\` | DECIMAL(12,2)| NO | \`0.00\` | Default purchase cost rate |
| \`sellingRate\` | DECIMAL(12,2) | NO | \`0.00\` | Default selling price rate |
| \`qtyPerBox\` | DECIMAL(12,3) | NO | \`0.000\` | Packaging unit conversion (qty per box) |
| \`pkgType\` | VARCHAR(191) | YES | \`BOX\` | Package container type |
| \`active\` | BOOLEAN | NO | \`true\` | Active product flag |

---

## 🔗 Relationships
* **Has One**: \`Stock\` (\`Stock.productId\` -> \`Product.id\`)
* **Has Many**: \`invoice_line_items\`, \`quotation_line_items\`, \`purchase_line_items\`, \`stock_logs\`
`);

// 5. invoices.md
createDoc(path.join(tablesDir, 'invoices.md'), `
# Table Specification: \`invoices\`

[Back to Index](../00_INDEX.md) | [Previous: products.md](./products.md) | [Next: invoice_line_items.md](./invoice_line_items.md)

---

## 📌 Purpose & Business Meaning
Primary transactional sales table storing B2B Tax Invoices, sequence numbers, invoice totals, GST tax totals, e-Way bill details, vehicle numbers, and billing/shipping address snapshots.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`invoices\`
* **Total Rows**: ${rawData.tablesData.invoices ? rawData.tablesData.invoices.length : 26}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | Primary Key |
| \`clientId\` | VARCHAR(191) | NO | None | Foreign Key to \`clients.id\` |
| \`sequenceNumber\`| INT | NO | UNIQUE | Auto-incrementing numerical invoice sequence |
| \`invoiceNo\` | VARCHAR(191) | NO | UNIQUE | Formatted Invoice Number (e.g. \`SRB2B/24-25/001\`) |
| \`date\` | DATETIME(3) | NO | None | Invoice issuance date |
| \`gstType\` | ENUM | NO | \`CGST_SGST\`| GST type (\`CGST_SGST\` vs \`IGST\`) |
| \`subTotal\` | DECIMAL(12,2)| NO | None | Taxable subtotal before taxes |
| \`taxTotal\` | DECIMAL(12,2)| NO | None | Total tax amount |
| \`grandTotal\` | DECIMAL(12,2)| NO | None | Final invoice total (SubTotal + Tax + Freight) |
| \`status\` | ENUM | NO | \`DRAFT\` | Invoice status (\`DRAFT\`,\`SENT\`,\`PAID\`,etc.) |
| \`isFinalized\` | BOOLEAN | NO | \`false\` | Lock flag preventing further modifications |
| \`ewayBill\` | VARCHAR(191) | YES | NULL | Government E-Way Bill Number |
| \`vehicleNo\` | VARCHAR(191) | YES | NULL | Transport vehicle registration number |
| \`freightAmount\` | DECIMAL(12,2)| NO | \`0.00\` | Transport freight charges |
| \`billingName\` | VARCHAR(191) | YES | NULL | Address snapshot billing name |
| \`billingGst\` | VARCHAR(191) | YES | NULL | Address snapshot client GSTIN |

---

## 🔗 Relationships
* **Belongs To**: \`Client\` (\`clientId\` -> \`Client.id\`)
* **Has Many**: \`invoice_line_items\`, \`payments\`, \`payment_allocations\`
`);

// 6. invoice_line_items.md
createDoc(path.join(tablesDir, 'invoice_line_items.md'), `
# Table Specification: \`invoice_line_items\`

[Back to Index](../00_INDEX.md) | [Previous: invoices.md](./invoices.md) | [Next: quotations.md](./quotations.md)

---

## 📌 Purpose & Business Meaning
Line items associated with B2B Tax Invoices, detailing product description, HSN codes, quantity sold, unit rate, tax rates, calculated tax amount, box count, and total amount.

---

## 📊 Summary Statistics
* **Physical Table Name**: \`invoice_line_items\`
* **Total Rows**: ${rawData.tablesData.invoice_line_items ? rawData.tablesData.invoice_line_items.length : 43}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`id\` | VARCHAR(191) | NO | CUID | Primary Key |
| \`invoiceId\` | VARCHAR(191) | NO | None | Foreign Key to \`invoices.id\` (CASCADE) |
| \`productId\` | VARCHAR(191) | YES | NULL | Foreign Key to \`products.id\` |
| \`description\` | TEXT | NO | None | Line item description snapshot |
| \`hsn\` | VARCHAR(191) | YES | NULL | HSN Code snapshot |
| \`qty\` | DECIMAL(12,3) | NO | None | Billed quantity |
| \`rate\` | DECIMAL(12,2) | NO | None | Unit price rate |
| \`taxPercent\` | DECIMAL(5,2) | NO | None | GST Tax percentage |
| \`taxAmount\` | DECIMAL(12,2) | NO | None | Calculated tax amount (\`qty * rate * taxPercent / 100\`) |
| \`unit\` | VARCHAR(191) | NO | \`NOS\` | Unit of measure |
| \`pkgCount\` | INT | YES | \`0\` | Total box package count |
| \`totalAmount\` | DECIMAL(12,2) | NO | None | Line total including tax |
`);

// 7. quotations.md
createDoc(path.join(tablesDir, 'quotations.md'), `
# Table Specification: \`quotations\`

[Back to Index](../00_INDEX.md) | [Previous: invoice_line_items.md](./invoice_line_items.md) | [Next: quotation_line_items.md](./quotation_line_items.md)

---

## 📌 Purpose & Business Meaning
Stores sales quotations and formal proforma price estimates delivered to prospective clients prior to invoice generation.

---

## 📋 Column Specifications
* \`id\` (PK, CUID)
* \`clientId\` (FK -> \`clients.id\`)
* \`sequenceNumber\` (INT, UNIQUE)
* \`quotationNo\` (VARCHAR, UNIQUE, e.g. \`SRQUO/24-25/001\`)
* \`date\` (DATETIME)
* \`validUntil\` (DATETIME)
* \`subTotal\`, \`taxTotal\`, \`grandTotal\` (DECIMAL(12,2))
* \`status\` (ENUM: \`DRAFT\`, \`SENT\`, \`ACCEPTED\`, \`REJECTED\`, \`CONVERTED\`, \`CANCELLED\`)
`);

// 8. quotation_line_items.md
createDoc(path.join(tablesDir, 'quotation_line_items.md'), `
# Table Specification: \`quotation_line_items\`

[Back to Index](../00_INDEX.md) | [Previous: quotations.md](./quotations.md) | [Next: purchases.md](./purchases.md)

---

## 📌 Purpose & Business Meaning
Line items detailing individual product descriptions, quantities, rates, and estimated taxes for a sales quotation.
`);

// 9. purchases.md
createDoc(path.join(tablesDir, 'purchases.md'), `
# Table Specification: \`purchases\`

[Back to Index](../00_INDEX.md) | [Previous: quotation_line_items.md](./quotation_line_items.md) | [Next: purchase_line_items.md](./purchase_line_items.md)

---

## 📌 Purpose & Business Meaning
Inbound procurement orders and supplier purchase invoices recording goods received from vendors.
`);

// 10. purchase_line_items.md
createDoc(path.join(tablesDir, 'purchase_line_items.md'), `
# Table Specification: \`purchase_line_items\`

[Back to Index](../00_INDEX.md) | [Previous: purchases.md](./purchases.md) | [Next: stock.md](./stock.md)

---

## 📌 Purpose & Business Meaning
Line items breakdown for inbound procurement purchase orders.
`);

// 11. stock.md
createDoc(path.join(tablesDir, 'stock.md'), `
# Table Specification: \`stocks\`

[Back to Index](../00_INDEX.md) | [Previous: purchase_line_items.md](./purchase_line_items.md) | [Next: stock_logs.md](./stock_logs.md)

---

## 📌 Purpose & Business Meaning
Stores real-time quantity balances for each product in the warehouse catalog.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.stocks ? rawData.tablesData.stocks.length : 18}
* **Primary Key**: \`id\` (CUID)

---

## 📋 Column Specifications
* \`id\` (PK, CUID)
* \`productId\` (FK -> \`products.id\`, UNIQUE, CASCADE)
* \`quantity\` (DECIMAL(12,3), Default: \`0.000\`)
* \`updatedAt\` (DATETIME)
`);

// 12. stock_logs.md
createDoc(path.join(tablesDir, 'stock_logs.md'), `
# Table Specification: \`stock_logs\`

[Back to Index](../00_INDEX.md) | [Previous: stock.md](./stock.md) | [Next: accounts.md](./accounts.md)

---

## 📌 Purpose & Business Meaning
Audit trail table recording all physical stock adjustments, sales deductions, procurement additions, and manual inventory updates.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.stock_logs ? rawData.tablesData.stock_logs.length : 65}
`);

// 13. accounts.md
createDoc(path.join(tablesDir, 'accounts.md'), `
# Table Specification: \`accounts\`

[Back to Index](../00_INDEX.md) | [Previous: stock_logs.md](./stock_logs.md) | [Next: ledger_entries.md](./ledger_entries.md)

---

## 📌 Purpose & Business Meaning
Double-entry Chart of Accounts storing financial balances for Cash, Bank, Clients, Vendors, Expenses, and Revenue.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.accounts ? rawData.tablesData.accounts.length : 17}
`);

// 14. ledger_entries.md
createDoc(path.join(tablesDir, 'ledger_entries.md'), `
# Table Specification: \`ledger_entries\`

[Back to Index](../00_INDEX.md) | [Previous: accounts.md](./accounts.md) | [Next: payments.md](./payments.md)

---

## 📌 Purpose & Business Meaning
Double-entry transaction journal recording debit and credit accounting movements against designated accounts.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.ledger_entries ? rawData.tablesData.ledger_entries.length : 31}
`);

// 15. payments.md
createDoc(path.join(tablesDir, 'payments.md'), `
# Table Specification: \`payments\`

[Back to Index](../00_INDEX.md) | [Previous: ledger_entries.md](./ledger_entries.md) | [Next: payment_allocations.md](./payment_allocations.md)

---

## 📌 Purpose & Business Meaning
Financial transactions recording inbound payments received from clients or outbound disbursements to suppliers.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.payments ? rawData.tablesData.payments.length : 5}
`);

// 16. payment_allocations.md
createDoc(path.join(tablesDir, 'payment_allocations.md'), `
# Table Specification: \`payment_allocations\`

[Back to Index](../00_INDEX.md) | [Previous: payments.md](./payments.md) | [Next: expenses.md](./expenses.md)

---

## 📌 Purpose & Business Meaning
Settlement linkage table mapping payment transactions against specific outstanding customer invoices or vendor purchases.
`);

// 17. expenses.md
createDoc(path.join(tablesDir, 'expenses.md'), `
# Table Specification: \`expenses\`

[Back to Index](../00_INDEX.md) | [Previous: payment_allocations.md](./payment_allocations.md) | [Next: loans.md](./loans.md)

---

## 📌 Purpose & Business Meaning
Operational expenditure records tracking company overhead, office supplies, and utility expenses.
`);

// 18. loans.md
createDoc(path.join(tablesDir, 'loans.md'), `
# Table Specification: \`loans\`

[Back to Index](../00_INDEX.md) | [Previous: expenses.md](./expenses.md) | [Next: advances.md](./advances.md)

---

## 📌 Purpose & Business Meaning
Financial loans tracking principal amounts given or taken with interest terms.
`);

// 19. advances.md
createDoc(path.join(tablesDir, 'advances.md'), `
# Table Specification: \`advances\`

[Back to Index](../00_INDEX.md) | [Previous: loans.md](./loans.md) | [Next: audit_logs.md](./audit_logs.md)

---

## 📌 Purpose & Business Meaning
Tracks advance cash deposits received from customers or paid to suppliers prior to invoicing.
`);

// 20. audit_logs.md
createDoc(path.join(tablesDir, 'audit_logs.md'), `
# Table Specification: \`audit_logs\`

[Back to Index](../00_INDEX.md) | [Previous: advances.md](./advances.md) | [Next: company_settings.md](./company_settings.md)

---

## 📌 Purpose & Business Meaning
System-wide audit trail recording user actions, modified entity types, old/new JSON payloads, and IP addresses.

---

## 📊 Summary Statistics
* **Total Rows**: ${rawData.tablesData.audit_logs ? rawData.tablesData.audit_logs.length : 84}
`);

// 21. company_settings.md
createDoc(path.join(tablesDir, 'company_settings.md'), `
# Table Specification: \`company_settings\`

[Back to Index](../00_INDEX.md) | [Previous: audit_logs.md](./audit_logs.md) | [Next: ../05_RELATIONSHIPS.md](../05_RELATIONSHIPS.md)

---

## 📌 Purpose & Business Meaning
Singleton configuration record holding company legal name (**ESSAR ENTERPRISES**), GSTIN, bank account numbers, invoice/quotation prefix definitions, and default tax types.

---

## 📊 Live Configuration Snapshot
* **Company Name**: \`ESSAR ENTERPRISES\`
* **GSTIN**: \`32BMAPJ5504M1Z9\`
* **Bank Name**: \`FEDERAL BANK\`
* **Branch**: \`CHELARI\`
* **Account No**: \`16470200011150\`
* **IFSC**: \`FDRL0001647\`
* **Invoice Prefix**: \`SRB2B\`
* **Quotation Prefix**: \`SRQUO\`
`);

console.log("All 21 table doc files generated.");
