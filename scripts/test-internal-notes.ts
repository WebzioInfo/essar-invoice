// Fallbacks if not set in environment file
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "mysql://db43250:WebzioWeb@db43250.public.databaseasp.net:3306/db43250";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "12345678901234567890123456789012";
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING INTERNAL NOTES END-TO-END INTEGRATION TEST");
  console.log("==================================================\n");

  const { db } = await import("../src/db/prisma/client");
  const { InvoiceService } = await import("../src/features/billing/services/InvoiceService");
  const { QuotationService } = await import("../src/features/billing/services/QuotationService");

  const invoiceService = new InvoiceService();
  const testUserId = "test-user-internal-notes";

  // 1. Get or Create a Test Client
  let client = await db.client.findFirst({ where: { deletedAt: null } });
  if (!client) {
    client = await db.client.create({
      data: {
        name: "Test Client Internal Notes",
        address1: "Test Address",
        state: "Kerala",
      },
    });
  }

  const today = new Date().toISOString().split("T")[0];

  // TEST 1: Create Invoice with Internal Notes
  console.log("TEST 1: Creating invoice with Internal Notes...");
  const initialNote = "TEST NOTE: Internal PO #998877\nHandle with special care.";
  const createPayload = {
    clientId: client.id,
    date: today,
    gstType: "CGST_SGST",
    subTotal: 1000,
    taxTotal: 180,
    grandTotal: 1180,
    notes: initialNote,
    items: [
      {
        description: "Widget A",
        hsn: "8481",
        qty: 10,
        rate: 100,
        taxPercent: 18,
        taxAmount: 180,
        totalAmount: 1180,
      },
    ],
  };

  const invoice1 = await invoiceService.createInvoice(testUserId, createPayload);
  console.log(`✓ Invoice created successfully: ID = ${invoice1.id}, No = ${invoice1.invoiceNo}`);

  // TEST 2: Database Persistence Check
  console.log("TEST 2: Verifying database persistence of Internal Notes...");
  const dbInvoice1 = await db.invoice.findUnique({ where: { id: invoice1.id } });
  if (!dbInvoice1 || dbInvoice1.notes !== initialNote) {
    throw new Error(`❌ Database persistence failed! Expected "${initialNote}", got "${dbInvoice1?.notes}"`);
  }
  console.log("✓ Internal Notes accurately persisted in MySQL database!");

  // TEST 3: Invoice Service findById
  console.log("TEST 3: Verifying invoiceService.findById returns Internal Notes...");
  const fetched1 = await invoiceService.findById(invoice1.id);
  if (!fetched1 || fetched1.notes !== initialNote) {
    throw new Error(`❌ findById failed to return internal notes! Got "${fetched1?.notes}"`);
  }
  console.log("✓ invoiceService.findById correctly returns Internal Notes!");

  // TEST 4: Search Queries
  console.log("TEST 4: Verifying search query matches Internal Notes...");
  const searchResults = await invoiceService.getInvoices({ q: "PO #998877" });
  const foundInSearch = searchResults.invoices.some((inv: any) => inv.id === invoice1.id);
  if (!foundInSearch) {
    throw new Error("❌ Search query failed to find invoice by internal note text!");
  }
  console.log("✓ Search query successfully finds invoice by Internal Notes text!");

  // TEST 5: Edit / Update Invoice
  console.log("TEST 5: Updating invoice Internal Notes...");
  const updatedNote = "UPDATED NOTE: Revised Internal PO #998877 - Finalized";
  const updatePayload = {
    ...createPayload,
    notes: updatedNote,
    invoiceNo: invoice1.invoiceNo,
  };

  const invoice1Updated = await invoiceService.updateInvoice(invoice1.id, testUserId, updatePayload);
  if (invoice1Updated.notes !== updatedNote) {
    throw new Error(`❌ Invoice update failed! Expected "${updatedNote}", got "${invoice1Updated.notes}"`);
  }

  const dbInvoice1Updated = await db.invoice.findUnique({ where: { id: invoice1.id } });
  if (dbInvoice1Updated?.notes !== updatedNote) {
    throw new Error(`❌ DB update check failed! Expected "${updatedNote}", got "${dbInvoice1Updated?.notes}"`);
  }
  console.log("✓ Invoice update successfully updated Internal Notes in DB!");

  // TEST 6: Duplicate Invoice Logic
  console.log("TEST 6: Duplicating invoice and verifying Internal Notes copy...");
  const duplicatedInvoice = await invoiceService.duplicateInvoice(invoice1.id, testUserId);
  if (duplicatedInvoice.notes !== updatedNote) {
    throw new Error(`❌ Duplicate invoice failed to copy internal notes! Got "${duplicatedInvoice.notes}"`);
  }
  console.log(`✓ Duplicated invoice ${duplicatedInvoice.invoiceNo} successfully preserved Internal Notes!`);

  // TEST 7: Soft Delete & Restore
  console.log("TEST 7: Testing Soft Delete and Restore with Internal Notes...");
  await invoiceService.softDeleteInvoice(invoice1.id, testUserId);
  const trashedInvoice = await db.invoice.findUnique({ where: { id: invoice1.id } });
  if (!trashedInvoice?.deletedAt) {
    throw new Error("❌ Soft delete failed!");
  }

  const restoredInvoice = await invoiceService.restoreInvoice(invoice1.id, testUserId);
  if (restoredInvoice.notes !== updatedNote) {
    throw new Error(`❌ Restore invoice failed to preserve notes! Got "${restoredInvoice.notes}"`);
  }
  console.log("✓ Soft Delete & Restore preserved Internal Notes perfectly!");

  // TEST 8: Quotation Conversion with Internal Notes
  console.log("TEST 8: Testing Quotation creation and conversion to Invoice...");
  const quotationNote = "QUOTATION NOTE: Special discount agreed internally.";
  const quotation = await QuotationService.createQuotation(testUserId, {
    clientId: client.id,
    date: today,
    gstType: "CGST_SGST",
    subTotal: 500,
    taxTotal: 90,
    grandTotal: 590,
    notes: quotationNote,
    items: [
      {
        description: "Widget B",
        hsn: "8481",
        qty: 5,
        rate: 100,
        taxPercent: 18,
        taxAmount: 90,
        totalAmount: 590,
      },
    ],
  });

  const convertedInvoice = await QuotationService.convertToInvoice(testUserId, quotation.id);
  if (convertedInvoice.notes !== quotationNote) {
    throw new Error(`❌ Quotation conversion failed to transfer internal notes! Expected "${quotationNote}", got "${convertedInvoice.notes}"`);
  }
  console.log(`✓ Quotation converted to Invoice ${convertedInvoice.invoiceNo} with Internal Notes preserved!`);

  // CLEANUP TEST DATA
  console.log("\nCleaning up test records...");
  await db.invoiceLineItem.deleteMany({
    where: { invoiceId: { in: [invoice1.id, duplicatedInvoice.id, convertedInvoice.id] } },
  });
  await db.invoice.deleteMany({
    where: { id: { in: [invoice1.id, duplicatedInvoice.id, convertedInvoice.id] } },
  });
  await db.quotationLineItem.deleteMany({ where: { quotationId: quotation.id } });
  await db.quotation.delete({ where: { id: quotation.id } });

  console.log("\n==================================================");
  console.log("🎉 ALL INTERNAL NOTES TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ TEST FAILED WITH ERROR:", err);
    process.exit(1);
  });
