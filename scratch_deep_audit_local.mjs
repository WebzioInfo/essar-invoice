import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('audit_data_raw.json', 'utf8'));

function runLocalAudit() {
  const result = {};

  // STEP 1: DB Info
  result.step1 = {
    dbInfo: { db: raw.step1.dbName, version: raw.step1.version },
    vars: raw.step1.vars,
    tablesCount: raw.step1.tables.length,
    tablesInfo: raw.step1.tables,
    viewsCount: raw.step1.viewsCount,
    routinesCount: raw.step1.routinesCount,
    triggersCount: raw.step1.triggersCount,
    eventsCount: raw.step1.eventsCount,
    fkCount: raw.step1.fkConstraints.length,
    fkInfo: raw.step1.fkConstraints
  };

  // STEP 2 & 3: Columns
  result.columnsInfo = raw.columns;

  // STEP 4: Table Statistics
  result.tableStats = {};
  for (const t of raw.step1.tables) {
    const tblName = t.TABLE_NAME;
    const rows = raw.tablesData[tblName] || [];
    const isArray = Array.isArray(rows);
    const totalRecords = isArray ? rows.length : 0;

    let deletedRecords = 0;
    let activeRecords = totalRecords;
    if (isArray && rows.length > 0 && 'deletedAt' in rows[0]) {
      deletedRecords = rows.filter(r => r.deletedAt !== null).length;
      activeRecords = totalRecords - deletedRecords;
    }

    let oldestRecord = null;
    let newestRecord = null;
    if (isArray && rows.length > 0) {
      const dateKeys = Object.keys(rows[0]).filter(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('createdat'));
      if (dateKeys.length > 0) {
        const key = dateKeys[0];
        const dates = rows.map(r => r[key]).filter(Boolean).map(d => new Date(d));
        if (dates.length > 0) {
          oldestRecord = new Date(Math.min(...dates)).toISOString();
          newestRecord = new Date(Math.max(...dates)).toISOString();
        }
      }
    }

    result.tableStats[tblName] = {
      totalRecords,
      activeRecords,
      deletedRecords,
      oldestRecord,
      newestRecord
    };
  }

  // STEP 6: Real Data Analysis
  const clients = raw.tablesData.clients || [];
  const invoices = raw.tablesData.invoices || [];
  const vendors = raw.tablesData.vendors || [];
  const purchases = raw.tablesData.purchases || [];
  const products = raw.tablesData.products || [];
  const stocks = raw.tablesData.stocks || [];
  const invoiceLines = raw.tablesData.invoice_line_items || [];
  const accounts = raw.tablesData.accounts || [];
  const payments = raw.tablesData.payments || [];

  // Top Clients
  const topClients = clients.filter(c => !c.deletedAt).map(c => {
    const clientInvoices = invoices.filter(i => i.clientId === c.id && !i.deletedAt);
    const invoiceCount = clientInvoices.length;
    const totalInvoiced = clientInvoices.reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
    return {
      id: c.id,
      name: c.name,
      gst: c.gst,
      phone: c.phone,
      address: `${c.address1 || ''} ${c.address2 || ''}, ${c.state || ''} ${c.pinCode || ''}`.trim(),
      invoiceCount,
      totalInvoiced
    };
  }).sort((a, b) => b.totalInvoiced - a.totalInvoiced);

  // Top Products
  const topProducts = products.filter(p => !p.deletedAt).map(p => {
    const stockObj = stocks.find(s => s.productId === p.id);
    const currentStock = stockObj ? Number(stockObj.quantity) : 0;
    const pLines = invoiceLines.filter(l => l.productId === p.id);
    const totalSoldQty = pLines.reduce((sum, l) => sum + Number(l.qty || 0), 0);
    const totalSoldAmount = pLines.reduce((sum, l) => sum + Number(l.totalAmount || 0), 0);
    return {
      id: p.id,
      sku: p.sku,
      description: p.description,
      hsn: p.hsn,
      sellingRate: Number(p.sellingRate),
      purchaseRate: Number(p.purchaseRate),
      gstRate: Number(p.gstRate),
      unit: p.unit,
      currentStock,
      totalSoldQty,
      totalSoldAmount
    };
  }).sort((a, b) => b.totalSoldAmount - a.totalSoldAmount);

  // Payment Methods
  const paymentMethodsMap = {};
  payments.filter(p => !p.deletedAt).forEach(p => {
    const m = p.method || 'OTHER';
    if (!paymentMethodsMap[m]) paymentMethodsMap[m] = { cnt: 0, totalAmount: 0 };
    paymentMethodsMap[m].cnt += 1;
    paymentMethodsMap[m].totalAmount += Number(p.amount || 0);
  });
  const paymentMethods = Object.entries(paymentMethodsMap).map(([method, val]) => ({ method, ...val }));

  result.dataAnalysis = {
    topClients,
    topVendors: vendors,
    topProducts,
    topAccounts: accounts,
    paymentMethods
  };

  // STEP 7: Data Quality Audit
  const dupClientsGstMap = {};
  clients.filter(c => c.gst && !c.deletedAt).forEach(c => {
    dupClientsGstMap[c.gst] = (dupClientsGstMap[c.gst] || 0) + 1;
  });
  const dupClientsGst = Object.entries(dupClientsGstMap).filter(([g, cnt]) => cnt > 1);

  const dupInvoicesMap = {};
  invoices.filter(i => !i.deletedAt).forEach(i => {
    dupInvoicesMap[i.invoiceNo] = (dupInvoicesMap[i.invoiceNo] || 0) + 1;
  });
  const dupInvoices = Object.entries(dupInvoicesMap).filter(([inv, cnt]) => cnt > 1);

  const negativeQtyItems = invoiceLines.filter(l => Number(l.qty) < 0);
  const negativeAmounts = invoices.filter(i => Number(i.grandTotal) < 0);

  result.qualityAudit = {
    dupClientsGst,
    dupInvoices,
    negativeQtyItems,
    negativeAmounts
  };

  // STEP 9: Accounting Audit
  const ledgerEntries = raw.tablesData.ledger_entries || [];
  let totalDebits = 0;
  let totalCredits = 0;
  const accountsMap = {};
  accounts.forEach(a => { accountsMap[a.id] = a.name; });

  const ledgerEntriesList = ledgerEntries.map(le => {
    totalDebits += Number(le.amount || 0); // Each double entry row records debit/credit pair or amount
    totalCredits += Number(le.amount || 0);
    return {
      id: le.id,
      date: le.date,
      referenceType: le.referenceType,
      referenceId: le.referenceId,
      transactionType: le.transactionType,
      amount: Number(le.amount),
      description: le.description,
      debitAccount: accountsMap[le.debitAccountId] || 'N/A',
      creditAccount: accountsMap[le.creditAccountId] || 'N/A'
    };
  });

  result.accountingAudit = {
    totalDebits: ledgerEntries.reduce((sum, le) => sum + (le.debitAccountId ? Number(le.amount) : 0), 0),
    totalCredits: ledgerEntries.reduce((sum, le) => sum + (le.creditAccountId ? Number(le.amount) : 0), 0),
    ledgerEntriesCount: ledgerEntries.length,
    ledgerEntriesList
  };

  // STEP 10: Stock Audit
  const purchaseLines = raw.tablesData.purchase_line_items || [];
  const stockReconciliation = products.filter(p => !p.deletedAt).map(p => {
    const stockObj = stocks.find(s => s.productId === p.id);
    const currentStock = stockObj ? Number(stockObj.quantity) : 0;
    const purchasedQty = purchaseLines.filter(l => l.productId === p.id).reduce((sum, l) => sum + Number(l.qty || 0), 0);
    const soldQty = invoiceLines.filter(l => l.productId === p.id).reduce((sum, l) => sum + Number(l.qty || 0), 0);
    const expectedStock = purchasedQty - soldQty;
    return {
      productId: p.id,
      sku: p.sku,
      description: p.description,
      currentStock,
      purchasedQty,
      soldQty,
      expectedStock,
      variance: currentStock - expectedStock
    };
  });

  const stockLogs = raw.tablesData.stock_logs || [];

  result.stockAudit = {
    stockReconciliation,
    stockLogsCount: stockLogs.length,
    stockLogs
  };

  // STEP 11: Payment Audit
  const totalInvoiceAmount = invoices.filter(i => i.status !== 'CANCELLED' && !i.deletedAt).reduce((sum, i) => sum + Number(i.grandTotal || 0), 0);
  const totalPaymentAmount = payments.filter(p => !p.deletedAt).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const paymentAllocations = raw.tablesData.payment_allocations || [];

  result.paymentAudit = {
    invoiceTotal: totalInvoiceAmount,
    totalPaymentAmount,
    paymentAllocations
  };

  // STEP 12: GST Audit
  const gstTypeSummaryMap = {};
  invoices.filter(i => i.status !== 'CANCELLED' && !i.deletedAt).forEach(i => {
    const type = i.gstType || 'CGST_SGST';
    if (!gstTypeSummaryMap[type]) gstTypeSummaryMap[type] = { totalSubtotal: 0, totalTax: 0, grandTotal: 0 };
    gstTypeSummaryMap[type].totalSubtotal += Number(i.subTotal || 0);
    gstTypeSummaryMap[type].totalTax += Number(i.taxTotal || 0);
    gstTypeSummaryMap[type].grandTotal += Number(i.grandTotal || 0);
  });
  const invoiceGstSummary = Object.entries(gstTypeSummaryMap).map(([gstType, val]) => ({ gstType, ...val }));

  result.gstAudit = {
    invoiceGstSummary,
    purchaseGstSummary: []
  };

  // STEP 13: Document Audit
  const invoicePatterns = invoices.map(i => ({ invoiceNo: i.invoiceNo, sequenceNumber: i.sequenceNumber, date: i.date, grandTotal: Number(i.grandTotal), status: i.status }));
  const quotationPatterns = (raw.tablesData.quotations || []).map(q => ({ quotationNo: q.quotationNo, sequenceNumber: q.sequenceNumber, date: q.date, grandTotal: Number(q.grandTotal), status: q.status }));

  result.documentAudit = {
    invoicePatterns,
    quotationPatterns,
    purchasePatterns: []
  };

  // STEP 15: Security Audit
  const users = raw.tablesData.users || [];
  const auditLogs = raw.tablesData.audit_logs || [];

  result.securityAudit = {
    users,
    auditLogsCount: auditLogs.length,
    auditLogs: auditLogs.slice(0, 20)
  };

  fs.writeFileSync('deep_audit_summary.json', JSON.stringify(result, null, 2));
  console.log("=== LOCAL DEEP AUDIT PROCESSED SUCCESSFULLY. OUTPUT WRITTEN TO deep_audit_summary.json ===");
}

runLocalAudit();
