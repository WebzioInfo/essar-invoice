import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const dbUrl = process.env.DATABASE_URL || "mysql://db43250:WebzioWeb@db43250.public.databaseasp.net:3306/db43250";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=60'
    }
  }
});

async function deepAudit() {
  const result = {};

  try {
    console.log("=== STARTING LIVE DATABASE DEEP AUDIT ===");

    // STEP 1: DB Info
    const dbInfo = await prisma.$queryRaw`SELECT DATABASE() as db, VERSION() as version;`;
    const vars = await prisma.$queryRaw`SHOW VARIABLES WHERE Variable_name IN ('character_set_database', 'collation_database', 'default_storage_engine', 'time_zone');`;
    const tablesInfo = await prisma.$queryRaw`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME, TABLE_COLLATION, ENGINE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE();
    `;
    const viewsInfo = await prisma.$queryRaw`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE();`;
    const routinesInfo = await prisma.$queryRaw`SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE();`;
    const triggersInfo = await prisma.$queryRaw`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();`;
    const eventsInfo = await prisma.$queryRaw`SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE();`;
    const fkInfo = await prisma.$queryRaw`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;
    `;

    result.step1 = {
      dbInfo: dbInfo[0],
      vars,
      tablesCount: tablesInfo.length,
      tablesInfo,
      viewsCount: viewsInfo.length,
      routinesCount: routinesInfo.length,
      triggersCount: triggersInfo.length,
      eventsCount: eventsInfo.length,
      fkCount: fkInfo.length,
      fkInfo
    };

    // STEP 2 & 3: Columns
    const columnsInfo = await prisma.$queryRaw`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `;
    result.columnsInfo = columnsInfo;

    // STEP 4: Live Data Statistics & Exact Record Counts
    const tables = tablesInfo.map(t => t.TABLE_NAME);
    result.tableStats = {};

    for (const t of tables) {
      const totalCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${t}\``);
      let deletedCount = 0;
      let activeCount = totalCount[0].cnt;

      const hasDeletedAt = columnsInfo.some(c => c.TABLE_NAME === t && c.COLUMN_NAME === 'deletedAt');
      if (hasDeletedAt) {
        const delRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${t}\` WHERE deletedAt IS NOT NULL`);
        deletedCount = delRes[0].cnt;
        activeCount = totalCount[0].cnt - deletedCount;
      }

      const dateCols = columnsInfo.filter(c => c.TABLE_NAME === t && (c.COLUMN_NAME.toLowerCase().includes('date') || c.COLUMN_NAME.toLowerCase().includes('createdat')));
      let oldestRecord = null;
      let newestRecord = null;
      if (dateCols.length > 0) {
        const col = dateCols[0].COLUMN_NAME;
        try {
          const range = await prisma.$queryRawUnsafe(`SELECT MIN(\`${col}\`) as minDate, MAX(\`${col}\`) as maxDate FROM \`${t}\``);
          oldestRecord = range[0].minDate;
          newestRecord = range[0].maxDate;
        } catch (e) { }
      }

      result.tableStats[t] = {
        totalRecords: Number(totalCount[0].cnt),
        activeRecords: Number(activeCount),
        deletedRecords: Number(deletedCount),
        oldestRecord,
        newestRecord
      };
    }

    // STEP 6: Real Data Analysis
    const topClients = await prisma.$queryRaw`
      SELECT c.id, c.name, c.gst, COUNT(i.id) as invoiceCount, COALESCE(SUM(i.grandTotal), 0) as totalInvoiced
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.clientId AND i.deletedAt IS NULL
      WHERE c.deletedAt IS NULL
      GROUP BY c.id, c.name, c.gst
      ORDER BY totalInvoiced DESC;
    `;

    const topVendors = await prisma.$queryRaw`
      SELECT v.id, v.name, v.gst, COUNT(p.id) as purchaseCount, COALESCE(SUM(p.grandTotal), 0) as totalPurchased
      FROM vendors v
      LEFT JOIN purchases p ON v.id = p.vendorId AND p.deletedAt IS NULL
      WHERE v.deletedAt IS NULL
      GROUP BY v.id, v.name, v.gst
      ORDER BY totalPurchased DESC;
    `;

    const topProducts = await prisma.$queryRaw`
      SELECT p.id, p.sku, p.description, p.hsn, p.sellingRate, p.gstRate, s.quantity as currentStock,
             COALESCE(SUM(ili.qty), 0) as totalSoldQty, COALESCE(SUM(ili.totalAmount), 0) as totalSoldAmount
      FROM products p
      LEFT JOIN stocks s ON p.id = s.productId
      LEFT JOIN invoice_line_items ili ON p.id = ili.productId
      WHERE p.deletedAt IS NULL
      GROUP BY p.id, p.sku, p.description, p.hsn, p.sellingRate, p.gstRate, s.quantity
      ORDER BY totalSoldAmount DESC;
    `;

    const topAccounts = await prisma.$queryRaw`
      SELECT a.id, a.name, a.type, a.openingBalance
      FROM accounts a
      ORDER BY a.name ASC;
    `;

    const paymentMethods = await prisma.$queryRaw`
      SELECT method, COUNT(*) as cnt, SUM(amount) as totalAmount
      FROM payments
      WHERE deletedAt IS NULL
      GROUP BY method;
    `;

    result.dataAnalysis = {
      topClients,
      topVendors,
      topProducts,
      topAccounts,
      paymentMethods
    };

    // STEP 7: Master Data Quality Audit
    const dupClientsGst = await prisma.$queryRaw`
      SELECT gst, COUNT(*) as cnt FROM clients WHERE gst IS NOT NULL AND gst != '' AND deletedAt IS NULL GROUP BY gst HAVING cnt > 1;
    `;
    const dupVendorsGst = await prisma.$queryRaw`
      SELECT gst, COUNT(*) as cnt FROM vendors WHERE gst IS NOT NULL AND gst != '' AND deletedAt IS NULL GROUP BY gst HAVING cnt > 1;
    `;
    const dupInvoices = await prisma.$queryRaw`
      SELECT invoiceNo, COUNT(*) as cnt FROM invoices WHERE deletedAt IS NULL GROUP BY invoiceNo HAVING cnt > 1;
    `;
    const dupPurchases = await prisma.$queryRaw`
      SELECT purchaseNo, COUNT(*) as cnt FROM purchases WHERE deletedAt IS NULL GROUP BY purchaseNo HAVING cnt > 1;
    `;
    const negativeQtyItems = await prisma.$queryRaw`
      SELECT 'invoice_line_items' as source, id, qty, rate, totalAmount FROM invoice_line_items WHERE qty < 0
      UNION ALL
      SELECT 'purchase_line_items' as source, id, qty, rate, totalAmount FROM purchase_line_items WHERE qty < 0;
    `;
    const negativeAmounts = await prisma.$queryRaw`
      SELECT 'invoices' as source, id, invoiceNo, grandTotal FROM invoices WHERE grandTotal < 0
      UNION ALL
      SELECT 'purchases' as source, id, purchaseNo, grandTotal FROM purchases WHERE grandTotal < 0
      UNION ALL
      SELECT 'payments' as source, id, reference, amount FROM payments WHERE amount < 0;
    `;

    result.qualityAudit = {
      dupClientsGst,
      dupVendorsGst,
      dupInvoices,
      dupPurchases,
      negativeQtyItems,
      negativeAmounts
    };

    // STEP 9: Accounting Audit
    const totalDebits = await prisma.$queryRaw`SELECT SUM(amount) as totalDebit FROM ledger_entries;`;
    const totalCredits = await prisma.$queryRaw`SELECT SUM(amount) as totalCredit FROM ledger_entries;`;
    const ledgerEntriesCount = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM ledger_entries;`;
    const ledgerEntriesList = await prisma.$queryRaw`
      SELECT le.id, le.date, le.referenceType, le.referenceId, le.transactionType, le.amount, le.description,
             da.name as debitAccount, ca.name as creditAccount
      FROM ledger_entries le
      LEFT JOIN accounts da ON le.debitAccountId = da.id
      LEFT JOIN accounts ca ON le.creditAccountId = ca.id
      ORDER BY le.date DESC;
    `;

    result.accountingAudit = {
      totalDebits: totalDebits[0]?.totalDebit,
      totalCredits: totalCredits[0]?.totalCredit,
      ledgerEntriesCount: ledgerEntriesCount[0]?.cnt,
      ledgerEntriesList
    };

    // STEP 10: Stock Audit
    const stockReconciliation = await prisma.$queryRaw`
      SELECT p.id as productId, p.sku, p.description, s.quantity as currentStock,
             COALESCE(SUM(pli.qty), 0) as purchasedQty,
             COALESCE(SUM(ili.qty), 0) as soldQty,
             (COALESCE(SUM(pli.qty), 0) - COALESCE(SUM(ili.qty), 0)) as expectedStock,
             (s.quantity - (COALESCE(SUM(pli.qty), 0) - COALESCE(SUM(ili.qty), 0))) as variance
      FROM products p
      LEFT JOIN stocks s ON p.id = s.productId
      LEFT JOIN purchase_line_items pli ON p.id = pli.productId
      LEFT JOIN invoice_line_items ili ON p.id = ili.productId
      WHERE p.deletedAt IS NULL
      GROUP BY p.id, p.sku, p.description, s.quantity;
    `;

    const stockLogs = await prisma.$queryRaw`
      SELECT sl.id, sl.productId, p.sku, sl.type, sl.quantityBefore, sl.quantityChange, sl.quantityAfter, sl.createdAt
      FROM stock_logs sl
      JOIN products p ON sl.productId = p.id
      ORDER BY sl.createdAt DESC;
    `;

    result.stockAudit = {
      stockReconciliation,
      stockLogsCount: stockLogs.length,
      stockLogs
    };

    // STEP 11: Payment Audit
    const totalInvoiceAmount = await prisma.$queryRaw`SELECT SUM(grandTotal) as total FROM invoices WHERE status != 'CANCELLED' AND deletedAt IS NULL;`;
    const totalPurchaseAmount = await prisma.$queryRaw`SELECT SUM(grandTotal) as total FROM purchases WHERE status != 'CANCELLED' AND deletedAt IS NULL;`;
    const totalPaymentAmount = await prisma.$queryRaw`SELECT SUM(amount) as totalPaid FROM payments WHERE deletedAt IS NULL;`;
    const paymentAllocations = await prisma.$queryRaw`
      SELECT pa.id, pa.paymentId, pa.invoiceId, pa.purchaseId, pa.amount, pa.createdAt
      FROM payment_allocations pa;
    `;

    result.paymentAudit = {
      invoiceTotal: totalInvoiceAmount[0]?.total,
      purchaseTotal: totalPurchaseAmount[0]?.total,
      totalPaymentAmount: totalPaymentAmount[0]?.totalPaid,
      paymentAllocations
    };

    // STEP 12: GST Audit
    const invoiceGstSummary = await prisma.$queryRaw`
      SELECT gstType, SUM(subTotal) as totalSubtotal, SUM(taxTotal) as totalTax, SUM(grandTotal) as grandTotal
      FROM invoices
      WHERE status != 'CANCELLED' AND deletedAt IS NULL
      GROUP BY gstType;
    `;

    const purchaseGstSummary = await prisma.$queryRaw`
      SELECT gstType, SUM(subTotal) as totalSubtotal, SUM(taxTotal) as totalTax, SUM(grandTotal) as grandTotal
      FROM purchases
      WHERE status != 'CANCELLED' AND deletedAt IS NULL
      GROUP BY gstType;
    `;

    result.gstAudit = {
      invoiceGstSummary,
      purchaseGstSummary
    };

    // STEP 13: Document Audit & Pattern Discovery
    const invoicePatterns = await prisma.$queryRaw`SELECT invoiceNo, sequenceNumber, date, grandTotal, status FROM invoices ORDER BY sequenceNumber ASC;`;
    const quotationPatterns = await prisma.$queryRaw`SELECT quotationNo, sequenceNumber, date, grandTotal, status FROM quotations ORDER BY sequenceNumber ASC;`;
    const purchasePatterns = await prisma.$queryRaw`SELECT purchaseNo, sequenceNumber, date, grandTotal, status FROM purchases ORDER BY sequenceNumber ASC;`;

    result.documentAudit = {
      invoicePatterns,
      quotationPatterns,
      purchasePatterns
    };

    // STEP 15: Security Audit
    const users = await prisma.$queryRaw`SELECT id, email, name, role, failedLogins, isLockedOut, createdAt, updatedAt FROM users;`;
    const auditLogsCount = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM audit_logs;`;
    const auditLogs = await prisma.$queryRaw`SELECT * FROM audit_logs ORDER BY createdAt DESC LIMIT 20;`;

    result.securityAudit = {
      users,
      auditLogsCount: auditLogsCount[0]?.cnt,
      auditLogs
    };

    fs.writeFileSync('deep_audit_summary.json', JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    console.log("=== DEEP AUDIT COMPLETED SUCCESSFULLY. OUTPUT WRITTEN TO deep_audit_summary.json ===");

  } catch (err) {
    console.error("Deep Audit Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

deepAudit();
