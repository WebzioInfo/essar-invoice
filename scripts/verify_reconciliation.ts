import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db/prisma/client";

const MIGRATION_DIR = path.resolve(__dirname, "../migration/essar-enterprises");

async function verify() {
  console.log("=================================================");
  console.log("POST-MIGRATION INDEPENDENT VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Table Counts
  console.log("--- 1. Table Counts Verification ---");
  const models = [
    { name: "user", expectedMin: 1 },
    { name: "client", expectedMin: 8 },
    { name: "product", expectedMin: 42 },
    { name: "invoice", expectedMin: 25 },
    { name: "invoiceLineItem", expectedMin: 41 },
    { name: "quotation", expectedMin: 3 },
    { name: "quotationLineItem", expectedMin: 7 },
    { name: "stock", expectedMin: 38 },
    { name: "stockLog", expectedMin: 114 },
    { name: "auditLog", expectedMin: 167 },
    { name: "companySetting", expectedMin: 1 },
  ];

  for (const m of models) {
    // @ts-ignore
    const count = await db[m.name].count();
    assert(count >= m.expectedMin, `Table '${m.name}' has ${count} records (expected >= ${m.expectedMin})`);
  }

  // 2. Authoritative Client Updates Verification
  console.log("\n--- 2. Client Authoritative State Verification ---");
  const greenmountClient = await db.client.findFirst({
    where: { name: "GREENMOUNT AQUA PRODUCT" }
  });
  assert(
    greenmountClient?.address1 === "BUILDING NO.13/323/K, NEAR MYG WAR HOUSE, VARNAKKARA",
    `GREENMOUNT AQUA PRODUCT address updated to authoritative migration uppercase value: '${greenmountClient?.address1}'`
  );

  // 3. Authoritative Product Updates Verification
  console.log("\n--- 3. Product Authoritative State Verification ---");
  const carbonFilter = await db.product.findFirst({
    where: { description: "CARBON FILTER - SS 304" }
  });
  assert(
    carbonFilter?.hsn === "84198990",
    `CARBON FILTER - SS 304 HSN updated to authoritative migration value: '${carbonFilter?.hsn}'`
  );

  // 4. Authoritative Invoice Updates Verification
  console.log("\n--- 4. Invoice Authoritative State Verification ---");
  const inv13 = await db.invoice.findFirst({
    where: { invoiceNo: "SRB2B-26-27-013" }
  });
  assert(
    inv13?.billingAddress1 === "BUILDING NO.13/323/K, NEAR MYG WAR HOUSE, VARNAKKARA",
    `Invoice SRB2B-26-27-013 billing address updated to authoritative migration value: '${inv13?.billingAddress1}'`
  );

  // 5. Production-Only Data Integrity Verification
  console.log("\n--- 5. Production-Only Data Integrity Verification ---");
  const prodOnlyInvoices = await db.invoice.findMany({
    where: { sequenceNumber: { gte: 14 } }
  });
  assert(
    prodOnlyInvoices.length === 12,
    `All 12 production-only invoices (sequence 14-25) exist and are preserved (found ${prodOnlyInvoices.length})`
  );

  const prodQuotations = await db.quotation.findMany();
  assert(
    prodQuotations.length === 3,
    `All 3 production quotations exist and are preserved (found ${prodQuotations.length})`
  );

  // 6. Referential Integrity & Foreign Key Verification
  console.log("\n--- 6. Referential Integrity Verification ---");
  const allClients = await db.client.findMany({ select: { id: true } });
  const clientIds = new Set(allClients.map(c => c.id));
  const allInvs = await db.invoice.findMany({ select: { id: true, clientId: true, invoiceNo: true } });
  const invIds = new Set(allInvs.map(i => i.id));
  
  const orphanedInvoices = allInvs.filter(i => !clientIds.has(i.clientId));
  assert(orphanedInvoices.length === 0, `0 invoices with missing client references (found ${orphanedInvoices.length})`);

  const allLineItems = await db.invoiceLineItem.findMany({ select: { id: true, invoiceId: true } });
  const orphanedLineItems = allLineItems.filter(li => !invIds.has(li.invoiceId));
  assert(orphanedLineItems.length === 0, `0 invoice line items with missing invoice references (found ${orphanedLineItems.length})`);

  // 7. Financial Calculations & Totals Verification
  console.log("\n--- 7. Financial Totals Verification ---");
  const allInvoices = await db.invoice.findMany();
  let financialValid = true;
  for (const inv of allInvoices) {
    if (inv.grandTotal.toNumber() <= 0) {
      financialValid = false;
      console.error(`Invalid grand total on invoice ${inv.invoiceNo}: ${inv.grandTotal}`);
    }
  }
  assert(financialValid, `All ${allInvoices.length} invoices have valid, positive financial grand totals`);

  // 8. Stock Consistency Verification
  console.log("\n--- 8. Stock Consistency Verification ---");
  const stocks = await db.stock.findMany();
  assert(stocks.length >= 38, `All ${stocks.length} stock tracking records are present`);

  console.log("\n=================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  await db.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
