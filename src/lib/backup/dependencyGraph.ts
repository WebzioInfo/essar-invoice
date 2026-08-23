// dependencyGraph.ts - Comprehensive metadata and topological ordering for all 21 Prisma models

export interface ModelMeta {
    modelName: string;            // e.g. "InvoiceLineItem"
    prismaDelegate: string;       // e.g. "invoiceLineItem"
    fileName: string;             // e.g. "invoiceLineItems.json"
    label: string;                // e.g. "Invoice Line Items"
    category: "SETTINGS" | "MASTER" | "TRANSACTION_HEADER" | "TRANSACTION_LINE" | "FINANCE" | "SYSTEM";
    primaryKey: string;           // e.g. "id"
    uniqueKeys: string[];         // e.g. ["invoiceNo"]
    foreignKeys: { field: string; parentModel: string }[];
    supportsSoftDelete: boolean;
}

export const ALL_MODELS_META: ModelMeta[] = [
    // --- TIER 1: Settings & Independent Masters ---
    {
        modelName: "CompanySetting",
        prismaDelegate: "companySetting",
        fileName: "companySettings.json",
        label: "Company Settings",
        category: "SETTINGS",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: false,
    },
    {
        modelName: "User",
        prismaDelegate: "user",
        fileName: "users.json",
        label: "Users & Staff",
        category: "SYSTEM",
        primaryKey: "id",
        uniqueKeys: ["email"],
        foreignKeys: [],
        supportsSoftDelete: true,
    },
    {
        modelName: "Client",
        prismaDelegate: "client",
        fileName: "clients.json",
        label: "Clients & Customers",
        category: "MASTER",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: true,
    },
    {
        modelName: "Vendor",
        prismaDelegate: "vendor",
        fileName: "vendors.json",
        label: "Vendors & Suppliers",
        category: "MASTER",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: true,
    },
    {
        modelName: "Expense",
        prismaDelegate: "expense",
        fileName: "expenses.json",
        label: "Operating Expenses",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: false,
    },
    {
        modelName: "Loan",
        prismaDelegate: "loan",
        fileName: "loans.json",
        label: "Loans & Borrowings",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: false,
    },
    {
        modelName: "Advance",
        prismaDelegate: "advance",
        fileName: "advances.json",
        label: "Advances & Deposits",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [],
        supportsSoftDelete: false,
    },

    // --- TIER 2: Entity-Linked Masters ---
    {
        modelName: "Account",
        prismaDelegate: "account",
        fileName: "accounts.json",
        label: "Chart of Accounts",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: ["name", "clientId", "vendorId"],
        foreignKeys: [
            { field: "clientId", parentModel: "Client" },
            { field: "vendorId", parentModel: "Vendor" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "Product",
        prismaDelegate: "product",
        fileName: "products.json",
        label: "Product Catalog",
        category: "MASTER",
        primaryKey: "id",
        uniqueKeys: ["sku"],
        foreignKeys: [],
        supportsSoftDelete: true,
    },

    // --- TIER 3: Product-Linked & Transaction Headers ---
    {
        modelName: "Stock",
        prismaDelegate: "stock",
        fileName: "stocks.json",
        label: "Inventory Balances",
        category: "MASTER",
        primaryKey: "id",
        uniqueKeys: ["productId"],
        foreignKeys: [
            { field: "productId", parentModel: "Product" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "StockLog",
        prismaDelegate: "stockLog",
        fileName: "stockLogs.json",
        label: "Stock Movement Logs",
        category: "MASTER",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "productId", parentModel: "Product" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "Invoice",
        prismaDelegate: "invoice",
        fileName: "invoices.json",
        label: "Tax Invoices",
        category: "TRANSACTION_HEADER",
        primaryKey: "id",
        uniqueKeys: ["sequenceNumber", "invoiceNo"],
        foreignKeys: [
            { field: "clientId", parentModel: "Client" },
        ],
        supportsSoftDelete: true,
    },
    {
        modelName: "Quotation",
        prismaDelegate: "quotation",
        fileName: "quotations.json",
        label: "Quotations & Estimates",
        category: "TRANSACTION_HEADER",
        primaryKey: "id",
        uniqueKeys: ["sequenceNumber", "quotationNo"],
        foreignKeys: [
            { field: "clientId", parentModel: "Client" },
        ],
        supportsSoftDelete: true,
    },
    {
        modelName: "Purchase",
        prismaDelegate: "purchase",
        fileName: "purchases.json",
        label: "Purchase Orders & Inwards",
        category: "TRANSACTION_HEADER",
        primaryKey: "id",
        uniqueKeys: ["sequenceNumber", "purchaseNo"],
        foreignKeys: [
            { field: "vendorId", parentModel: "Vendor" },
        ],
        supportsSoftDelete: true,
    },

    // --- TIER 4: Transaction Line Items & Payments ---
    {
        modelName: "InvoiceLineItem",
        prismaDelegate: "invoiceLineItem",
        fileName: "invoiceLineItems.json",
        label: "Invoice Line Items",
        category: "TRANSACTION_LINE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "invoiceId", parentModel: "Invoice" },
            { field: "productId", parentModel: "Product" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "QuotationLineItem",
        prismaDelegate: "quotationLineItem",
        fileName: "quotationLineItems.json",
        label: "Quotation Line Items",
        category: "TRANSACTION_LINE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "quotationId", parentModel: "Quotation" },
            { field: "productId", parentModel: "Product" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "PurchaseLineItem",
        prismaDelegate: "purchaseLineItem",
        fileName: "purchaseLineItems.json",
        label: "Purchase Line Items",
        category: "TRANSACTION_LINE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "purchaseId", parentModel: "Purchase" },
            { field: "productId", parentModel: "Product" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "Payment",
        prismaDelegate: "payment",
        fileName: "payments.json",
        label: "Payments Received & Made",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "clientId", parentModel: "Client" },
            { field: "vendorId", parentModel: "Vendor" },
            { field: "invoiceId", parentModel: "Invoice" },
            { field: "purchaseId", parentModel: "Purchase" },
        ],
        supportsSoftDelete: true,
    },

    // --- TIER 5: Financial Allocations, Ledger & Audit Logs ---
    {
        modelName: "PaymentAllocation",
        prismaDelegate: "paymentAllocation",
        fileName: "paymentAllocations.json",
        label: "Payment Invoicing Allocations",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "paymentId", parentModel: "Payment" },
            { field: "invoiceId", parentModel: "Invoice" },
            { field: "purchaseId", parentModel: "Purchase" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "LedgerEntry",
        prismaDelegate: "ledgerEntry",
        fileName: "ledgerEntries.json",
        label: "General Ledger Entries",
        category: "FINANCE",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "debitAccountId", parentModel: "Account" },
            { field: "creditAccountId", parentModel: "Account" },
        ],
        supportsSoftDelete: false,
    },
    {
        modelName: "AuditLog",
        prismaDelegate: "auditLog",
        fileName: "auditLogs.json",
        label: "Security & Audit Logs",
        category: "SYSTEM",
        primaryKey: "id",
        uniqueKeys: [],
        foreignKeys: [
            { field: "userId", parentModel: "User" },
        ],
        supportsSoftDelete: false,
    },
];

/**
 * Ordered list of models for RESTORATION (parents before children).
 */
export const RESTORE_TOPOLOGICAL_ORDER = ALL_MODELS_META.map(m => m.modelName);

/**
 * Ordered list of models for DELETION (children before parents).
 */
export const DELETION_TOPOLOGICAL_ORDER = [...ALL_MODELS_META].reverse().map(m => m.modelName);

export function getModelMeta(modelName: string): ModelMeta | undefined {
    return ALL_MODELS_META.find(m => m.modelName === modelName || m.prismaDelegate === modelName);
}
