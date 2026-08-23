import { Prisma } from "@prisma/client";
import { StockLogType } from "@/features/inventory/services/StockService";

// Local Enum Overrides (Hard Fix for Prisma Stale-ness on Windows)
import { InvoiceStatus } from "../types";
import { InvoiceRepository } from "../repositories/InvoiceRepository";
import { validateData } from "@/lib/validation";
import { invoiceSchema } from "../validators/invoiceSchema";
import { serializePrisma } from "@/utils/serialization";
import { db } from "@/db/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { StockService } from "@/features/inventory/services/StockService";
import { determinePlaceOfSupplyState, determineGstType } from "@/utils/gst";
import { calculateBillingTotals } from "@/utils/financials";

const invoiceRepo = new InvoiceRepository();

export class InvoiceService {
  async createInvoice(userId: string, rawData: any) {
    // 1. Validation
    const validatedData = await validateData(invoiceSchema, rawData);

    const posState = determinePlaceOfSupplyState({
      billingAddress: validatedData.billingAddress,
      shippingAddress: validatedData.shippingAddress,
      shippingSameAsBilling: validatedData.shippingSameAsBilling
    });
    const effectiveGstType = validatedData.gstType === "NONE" ? "NONE" : determineGstType(posState);

    const computedTotals = calculateBillingTotals(
      validatedData.items.map((i: any) => ({ qty: Number(i.qty), rate: Number(i.rate), taxPercent: Number(i.taxPercent) })),
      Number(validatedData.freightAmount || 0),
      Number(validatedData.freightTaxPercent || 0)
    );

    return await invoiceRepo.db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 2. Sequence Generation
      const lastSequence = await tx.invoice.findFirst({
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true },
      });
      
      const nextSequence = (lastSequence?.sequenceNumber || 0) + 1;
      
      let invoiceNo = validatedData.invoiceNo;
      if (!invoiceNo) {
        const settings = await tx.companySetting.findFirst();
        const prefix = settings?.invoicePrefix || "B2B";
        
        // Indian FY runs April 1 -> March 31
        const docDate = new Date(validatedData.date);
        const year = docDate.getFullYear();
        const month = docDate.getMonth(); // 0-indexed; March = 2, April = 3
        const fyStartYear = month >= 3 ? year : year - 1;
        const fyEndYear = fyStartYear + 1;
        const fy = `${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`;
        const fyStart = new Date(fyStartYear, 3, 1);
        const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);

        // Count invoices in this FY to get next sequence
        const countThisFY = await tx.invoice.count({
            where: {
                date: { gte: fyStart, lte: fyEnd },
                deletedAt: null
            }
        });

        const seq = String(countThisFY + 1).padStart(3, '0');
        invoiceNo = `${prefix}-${fy}-${seq}`;
      }

      // 3. Persistence
      const invoice = await tx.invoice.create({
        data: {
          createdById: userId,
          clientId: validatedData.clientId,
          sequenceNumber: nextSequence,
          invoiceNo: invoiceNo,
          date: new Date(validatedData.date),
          gstType: effectiveGstType,
          subTotal: computedTotals.subTotal,
          taxTotal: computedTotals.taxTotal,
          grandTotal: computedTotals.grandTotal,
          notes: validatedData.notes ?? null,
          ewayBill: validatedData.ewayBill,
          ewayBillUrl: validatedData.ewayBillUrl,
          vehicleNo: validatedData.vehicleNo,
          dispatchedThrough: validatedData.dispatchedThrough,
          isFreightCollect: validatedData.isFreightCollect,
          freightAmount: validatedData.freightAmount ?? 0,
          freightTaxPercent: validatedData.freightTaxPercent ?? 0,

          // Address snapshots
          billingName: validatedData.billingAddress?.name,
          billingAddress1: validatedData.billingAddress?.address1,
          billingAddress2: validatedData.billingAddress?.address2,
          billingState: validatedData.billingAddress?.state,
          billingPinCode: validatedData.billingAddress?.pinCode,
          billingPhone: validatedData.billingAddress?.phone,
          billingGst: validatedData.billingAddress?.gst,
          shippingSameAsBilling: validatedData.shippingSameAsBilling,
          shippingName: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.name : validatedData.shippingAddress?.name,
          shippingAddress1: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.address1 : validatedData.shippingAddress?.address1,
          shippingAddress2: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.address2 : validatedData.shippingAddress?.address2,
          shippingState: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.state : validatedData.shippingAddress?.state,
          shippingPinCode: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.pinCode : validatedData.shippingAddress?.pinCode,

          lineItems: {
            create: validatedData.items.map((item: any) => ({
              product: item.productId ? { connect: { id: item.productId } } : undefined,
              description: item.description,
              hsn: item.hsn,
              qty: item.qty,
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              unit: item.unit || "NOS",
              pkgCount: item.pkgCount || 0,
              pkgType: item.pkgType || "BOX",
              qtyPerBox: item.qtyPerBox || 0,
              showPkgDetails: item.showPkgDetails !== undefined ? Boolean(item.showPkgDetails) : true,
              totalAmount: item.totalAmount
            }))
          }
        }
      });

      // 4. Audit
      await recordAuditLog(tx, {
        userId,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: { invoiceNo }
      });

      // 5. Stock Movement
      for (const item of validatedData.items) {
        if (item.productId) {
          await StockService.recordChange({
            productId: item.productId,
            type: StockLogType.REMOVE,
            quantityChange: -Number(item.qty),
            referenceId: invoice.id,
            notes: `Invoice ${invoiceNo} Created`,
            tx
          });
        }
      }

      return serializePrisma(invoice);
    }, { timeout: 30000 });
  }

  async getInvoices(params: { page?: number; take?: number; status?: string; q?: string } = {}) {
    const { page = 1, take = 100, status, q } = params;
    const skip = (page - 1) * take;

    const where: any = {};
    if (status === "TRASH") {
        where.deletedAt = { not: null };
    } else {
        where.deletedAt = null;
        if (status) where.status = status;
    }

    if (q) {
        where.OR = [
            { invoiceNo: { contains: q } },
            { client: { name: { contains: q } } },
            { notes: { contains: q } },
        ];
    }

    const [invoices, counts, trashCount] = await Promise.all([
        invoiceRepo.findAll({
            where,
            orderBy: { invoiceNo: 'desc' },
            take,
            skip,
            select: {
                id: true,
                invoiceNo: true,
                date: true,
                grandTotal: true,
                status: true,
                notes: true,
                client: { select: { id: true, name: true } }
            }
        }),
        db.invoice.groupBy({
            by: ["status"],
            where: { deletedAt: null },
            _count: { status: true },
        }),
        db.invoice.count({
            where: { deletedAt: { not: null } }
        })
    ]);

    const countMap: Record<string, number> = {};
    counts.forEach((c) => { countMap[c.status] = c._count.status; });
    const total = counts.reduce((a, c) => a + c._count.status, 0);
    countMap[""] = total;
    countMap["TRASH"] = trashCount;

    return serializePrisma({
        invoices,
        counts: countMap
    });
  }

  async updateInvoice(invoiceId: string, userId: string, rawData: any) {
    const validatedData = await validateData(invoiceSchema, rawData);
    
    const posState = determinePlaceOfSupplyState({
      billingAddress: validatedData.billingAddress,
      shippingAddress: validatedData.shippingAddress,
      shippingSameAsBilling: validatedData.shippingSameAsBilling
    });
    const effectiveGstType = validatedData.gstType === "NONE" ? "NONE" : determineGstType(posState);

    const computedTotals = calculateBillingTotals(
      validatedData.items.map((i: any) => ({ qty: Number(i.qty), rate: Number(i.rate), taxPercent: Number(i.taxPercent) })),
      Number(validatedData.freightAmount || 0),
      Number(validatedData.freightTaxPercent || 0)
    );

    const invoice = await invoiceRepo.updateWithItems(invoiceId, {
      date: new Date(validatedData.date),
      gstType: effectiveGstType,
      subTotal: computedTotals.subTotal,
      taxTotal: computedTotals.taxTotal,
      grandTotal: computedTotals.grandTotal,
      notes: validatedData.notes ?? null,
      ewayBill: validatedData.ewayBill,
      ewayBillUrl: validatedData.ewayBillUrl,
      vehicleNo: validatedData.vehicleNo,
      invoiceNo: validatedData.invoiceNo,
      dispatchedThrough: validatedData.dispatchedThrough,
      isFreightCollect: validatedData.isFreightCollect,
      freightAmount: validatedData.freightAmount ?? 0,
      freightTaxPercent: validatedData.freightTaxPercent ?? 0,

      // Use Prisma relation syntax for client
      client: { connect: { id: validatedData.clientId } },

      // Address snapshots
      billingName: validatedData.billingAddress?.name,
      billingAddress1: validatedData.billingAddress?.address1,
      billingAddress2: validatedData.billingAddress?.address2,
      billingState: validatedData.billingAddress?.state,
      billingPinCode: validatedData.billingAddress?.pinCode,
      billingPhone: validatedData.billingAddress?.phone,
      billingGst: validatedData.billingAddress?.gst,
      shippingSameAsBilling: validatedData.shippingSameAsBilling,
      shippingName: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.name : validatedData.shippingAddress?.name,
      shippingAddress1: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.address1 : validatedData.shippingAddress?.address1,
      shippingAddress2: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.address2 : validatedData.shippingAddress?.address2,
      shippingState: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.state : validatedData.shippingAddress?.state,
      shippingPinCode: validatedData.shippingSameAsBilling ? validatedData.billingAddress?.pinCode : validatedData.shippingAddress?.pinCode,

      lineItems: validatedData.items.map((item: any) => ({
        product: item.productId ? { connect: { id: item.productId } } : undefined,
        description: item.description,
        hsn: item.hsn,
        qty: item.qty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        taxAmount: item.taxAmount,
        unit: item.unit || "NOS",
        pkgCount: item.pkgCount || 0,
        pkgType: item.pkgType || "BOX",
        qtyPerBox: item.qtyPerBox || 0,
        showPkgDetails: item.showPkgDetails !== undefined ? Boolean(item.showPkgDetails) : true,
        totalAmount: item.totalAmount
      }))
    });

    // Audit
    await recordAuditLog(db, {
      userId,
      action: "INVOICE_UPDATED",
      entityType: "Invoice",
      entityId: invoice.id,
      details: { invoiceNo: invoice.invoiceNo }
    });

    // 5. Stock Movement (Update handling)
    // We reverse the old stock and apply the new stock to ensure consistency
    await db.$transaction(async (tx) => {
        const oldInvoice = await tx.invoice.findUnique({
            where: { id: invoiceId },
            include: { lineItems: true }
        });

        if (oldInvoice) {
            // Reverse old stock
            for (const item of oldInvoice.lineItems) {
                if (item.productId) {
                    await StockService.recordChange({
                        productId: item.productId,
                        type: StockLogType.ADD,
                        quantityChange: Number(item.qty),
                        referenceId: invoiceId,
                        notes: `Invoice ${oldInvoice.invoiceNo} Updated (Reversal)`,
                        tx
                    });
                }
            }
        }

        // Apply new stock
        for (const item of validatedData.items) {
            if (item.productId) {
                await StockService.recordChange({
                    productId: item.productId,
                    type: StockLogType.REMOVE,
                    quantityChange: -Number(item.qty),
                    referenceId: invoiceId,
                    notes: `Invoice ${validatedData.invoiceNo || oldInvoice?.invoiceNo} Updated (New Levels)`,
                    tx
                });
            }
        }
    }, { timeout: 30000 });

    return serializePrisma(invoice);
  }

  async softDeleteInvoice(invoiceId: string, userId: string) {
    const invoice = await invoiceRepo.softDelete(invoiceId, userId);
    
    // Reverse Stock
    await db.$transaction(async (tx) => {
        const fullInvoice = await tx.invoice.findUnique({
            where: { id: invoiceId },
            include: { lineItems: true }
        });
        if (fullInvoice) {
            for (const item of fullInvoice.lineItems) {
                if (item.productId) {
                    await StockService.recordChange({
                        productId: item.productId,
                        type: StockLogType.ADD,
                        quantityChange: Number(item.qty),
                        referenceId: invoiceId,
                        notes: `Invoice ${fullInvoice.invoiceNo} Trashed (Stock Restored)`,
                        tx
                    });
                }
            }
        }
    }, { timeout: 30000 });
    
    await recordAuditLog(db, {
      userId,
      action: "INVOICE_TRASHED",
      entityType: "Invoice",
      entityId: invoiceId,
      details: { invoiceNo: invoice.invoiceNo }
    });

    return serializePrisma(invoice);
  }

  async restoreInvoice(invoiceId: string, userId: string) {
    const existing = await invoiceRepo.model.findUnique({
      where: { id: invoiceId }
    });
    if (!existing) throw new Error("Invoice not found");

    // Remove the -DEL- suffix if present
    let originalInvoiceNo = existing.invoiceNo;
    if (originalInvoiceNo.includes("-DEL-")) {
      originalInvoiceNo = originalInvoiceNo.split("-DEL-")[0];
    }

    // Handle sequenceNumber restoration
    // We try to restore to a positive one if it was negative, but we need to find a gap or just use the absolute value if it doesn't conflict
    let restoredSequence = Math.abs(existing.sequenceNumber);
    
    // Check if the number or sequence is already taken
    const conflict = await invoiceRepo.model.findFirst({
      where: {
        OR: [
          { invoiceNo: originalInvoiceNo, deletedAt: null },
          { sequenceNumber: restoredSequence, deletedAt: null }
        ],
        NOT: { id: invoiceId }
      }
    });

    if (conflict) {
      throw new Error(`Cannot restore: Invoice number ${originalInvoiceNo} or sequence ${restoredSequence} is already taken by another active invoice.`);
    }

    const invoice = await invoiceRepo.model.update({
      where: { id: invoiceId },
      data: { 
        deletedAt: null,
        invoiceNo: originalInvoiceNo,
        sequenceNumber: restoredSequence
      } as any,
      include: { lineItems: true }
    });

    // Subtract Stock again
    await db.$transaction(async (tx) => {
        for (const item of (invoice as any).lineItems) {
            if (item.productId) {
                await StockService.recordChange({
                    productId: item.productId,
                    type: StockLogType.REMOVE,
                    quantityChange: -Number(item.qty),
                    referenceId: invoiceId,
                    notes: `Invoice ${invoice.invoiceNo} Restored`,
                    tx
                });
            }
        }
    }, { timeout: 30000 });

    await recordAuditLog(db, {
      userId,
      action: "INVOICE_RESTORED",
      entityType: "Invoice",
      entityId: invoiceId,
      details: { invoiceNo: invoice.invoiceNo }
    });

    return serializePrisma(invoice);
  }

  async permanentlyDeleteInvoice(invoiceId: string, userId: string) {
    // Audit before deletion
    const invoice = await invoiceRepo.model.findUnique({ where: { id: invoiceId } });
    if (invoice) {
        await recordAuditLog(db, {
            userId,
            action: "INVOICE_PERMANENTLY_DELETED",
            entityType: "Invoice",
            entityId: invoiceId,
            details: { invoiceNo: invoice.invoiceNo }
        });
    }

    return await invoiceRepo.model.delete({
      where: { id: invoiceId }
    });
  }

  async findById(invoiceId: string) {
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      include: {
        client: true,
        lineItems: { include: { product: true } }
      }
    });
    return serializePrisma(invoice);
  }

  async duplicateInvoice(invoiceId: string, userId: string) {
    const original = await this.findById(invoiceId);
    if (!original) throw new Error("Invoice not found");

    const duplicateData = {
      clientId: original.clientId,
      date: new Date().toISOString().split("T")[0],
      gstType: original.gstType,
      subTotal: Number(original.subTotal),
      taxTotal: Number(original.taxTotal),
      grandTotal: Number(original.grandTotal),
      notes: original.notes,
      ewayBill: original.ewayBill || undefined,
      ewayBillUrl: original.ewayBillUrl || undefined,
      vehicleNo: original.vehicleNo || undefined,
      dispatchedThrough: original.dispatchedThrough || undefined,
      isFreightCollect: original.isFreightCollect,
      freightAmount: Number(original.freightAmount || 0),
      freightTaxPercent: Number(original.freightTaxPercent || 0),
      billingAddress: {
        name: original.billingName || original.client?.name || "",
        address1: original.billingAddress1 || original.client?.address1 || "",
        address2: original.billingAddress2 || original.client?.address2 || "",
        state: original.billingState || original.client?.state || "",
        pinCode: original.billingPinCode || original.client?.pinCode || "",
        phone: original.billingPhone || original.client?.phone || "",
        gst: original.billingGst || original.client?.gst || ""
      },
      shippingAddress: {
        name: original.shippingName || "",
        address1: original.shippingAddress1 || "",
        address2: original.shippingAddress2 || "",
        state: original.shippingState || "",
        pinCode: original.shippingPinCode || "",
      },
      shippingSameAsBilling: original.shippingSameAsBilling,
      items: (original.lineItems || []).map((item: any) => ({
        productId: item.productId || undefined,
        description: item.description,
        hsn: item.hsn,
        qty: Number(item.qty),
        rate: Number(item.rate),
        taxPercent: Number(item.taxPercent),
        taxAmount: Number(item.taxAmount),
        unit: item.unit || "NOS",
        pkgCount: item.pkgCount || 0,
        pkgType: item.pkgType || "BOX",
        qtyPerBox: item.qtyPerBox || 0,
        totalAmount: Number(item.totalAmount),
      })),
    };

    return await this.createInvoice(userId, duplicateData);
  }
}
