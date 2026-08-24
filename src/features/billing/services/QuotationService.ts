import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";
import { recordAuditLog } from "@/lib/audit";
import { validateData } from "@/lib/validation";
import { quotationSchema } from "../validators/quotationSchema";
import { calculateBillingTotals } from "@/utils/financials";
import { determinePlaceOfSupplyState, determineGstType } from "@/utils/gst";

// Local Enum Overrides (Hard Fix for Prisma Stale-ness on Windows)
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
export const QuotationStatus = {
  DRAFT: 'DRAFT' as const,
  SENT: 'SENT' as const,
  ACCEPTED: 'ACCEPTED' as const,
  REJECTED: 'REJECTED' as const,
  CONVERTED: 'CONVERTED' as const,
  EXPIRED: 'EXPIRED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export const InvoiceStatus = {
  DRAFT: 'DRAFT' as const,
  SENT: 'SENT' as const,
  PARTIAL: 'PARTIAL' as const,
  PAID: 'PAID' as const,
  OVERDUE: 'OVERDUE' as const,
  CANCELLED: 'CANCELLED' as const,
};

export type GstType = 'CGST_SGST' | 'IGST' | 'NONE';
export const GstType = {
  CGST_SGST: 'CGST_SGST' as const,
  IGST: 'IGST' as const,
  NONE: 'NONE' as const,
};

export class QuotationService {
  /**
   * Creates a new quotation with line items.
   */
  static async createQuotation(userId: string | null, rawData: any) {
    const data = await validateData(quotationSchema, rawData);

    const posState = determinePlaceOfSupplyState({
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      shippingSameAsBilling: data.shippingSameAsBilling
    });
    const effectiveGstType = data.gstType === "NONE" ? "NONE" : determineGstType(posState);

    const computedTotals = calculateBillingTotals(
      data.items.map((i: any) => ({ qty: Number(i.qty), rate: Number(i.rate), taxPercent: Number(i.taxPercent) })),
      Number(data.freightAmount || 0),
      Number(data.freightTaxPercent || 0)
    );

    const quotation = await db.$transaction(async (tx) => {
      // 1. Get next sequence number for quotations
      const lastQuo = await tx.quotation.findFirst({
        orderBy: { sequenceNumber: "desc" },
      });
      const nextSeq = (lastQuo?.sequenceNumber || 0) + 1;
      
      // Indian FY runs April 1 -> March 31
      const docDate = new Date(data.date);
      const year = docDate.getFullYear();
      const month = docDate.getMonth(); // 0-indexed; March = 2, April = 3
      const fyStartYear = month >= 3 ? year : year - 1;
      const fyEndYear = fyStartYear + 1;
      const fy = `${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`;
      const fyStart = new Date(fyStartYear, 3, 1);
      const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);

      // Count quotations in this FY to get next sequence
      const countThisFY = await tx.quotation.count({
          where: {
              date: { gte: fyStart, lte: fyEnd },
              deletedAt: null
          }
      });

      const seq = String(countThisFY + 1).padStart(2, '0');
      const quoNo = `JE/QUO/${seq}/${fy}`;

      // 2. Create the quotation
      return await tx.quotation.create({
        data: {
          clientId: data.clientId,
          sequenceNumber: nextSeq,
          quotationNo: quoNo,
          date: new Date(data.date),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          gstType: effectiveGstType as any,
          subTotal: computedTotals.subTotal,
          taxTotal: computedTotals.taxTotal,
          grandTotal: computedTotals.grandTotal,
          notes: data.notes ?? null,
          isFreightCollect: data.isFreightCollect || false,
          freightAmount: data.freightAmount || 0,
          freightTaxPercent: data.freightTaxPercent || 0,
          createdById: userId,
          status: QuotationStatus.DRAFT,

          // Address snapshots
          billingName: data.billingAddress?.name || null,
          billingAddress1: data.billingAddress?.address1 || null,
          billingAddress2: data.billingAddress?.address2 || null,
          billingState: data.billingAddress?.state || null,
          billingPinCode: data.billingAddress?.pinCode || null,
          billingPhone: data.billingAddress?.phone || null,
          billingGst: data.billingAddress?.gst || null,
          shippingSameAsBilling: data.shippingSameAsBilling,
          shippingName: data.shippingSameAsBilling ? data.billingAddress?.name : data.shippingAddress?.name,
          shippingAddress1: data.shippingSameAsBilling ? data.billingAddress?.address1 : data.shippingAddress?.address1,
          shippingAddress2: data.shippingSameAsBilling ? data.billingAddress?.address2 : data.shippingAddress?.address2,
          shippingState: data.shippingSameAsBilling ? data.billingAddress?.state : data.shippingAddress?.state,
          shippingPinCode: data.shippingSameAsBilling ? data.billingAddress?.pinCode : data.shippingAddress?.pinCode,

          lineItems: {
            create: data.items.map((item: any) => ({
              product: item.productId ? { connect: { id: item.productId } } : undefined,
              description: item.description,
              hsn: item.hsn || null,
              qty: parseFloat(String(item.qty)),
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount || 0,
              unit: item.unit || "NOS",
              pkgCount: item.pkgCount || 0,
              pkgType: item.pkgType || "BOX",
              qtyPerBox: item.qtyPerBox || 0,
              showPkgDetails: item.showPkgDetails !== undefined && item.showPkgDetails !== null ? Boolean(item.showPkgDetails) : false,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: {
          client: true,
          lineItems: {
            orderBy: { id: "asc" },
            include: { product: true },
          },
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    // 3. Audit Log
    recordAuditLog(db, {
      userId,
      action: "QUOTATION_CREATED",
      entityType: "Quotation",
      entityId: quotation.id,
      details: { quotationNo: quotation.quotationNo, grandTotal: computedTotals.grandTotal },
    }).catch(() => {});

    return serializePrisma(quotation);
  }

  /**
   * Updates an existing quotation and replaces line items transactionally.
   */
  static async updateQuotation(quotationId: string, userId: string | null, rawData: any) {
    const data = await validateData(quotationSchema, rawData);

    const posState = determinePlaceOfSupplyState({
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      shippingSameAsBilling: data.shippingSameAsBilling
    });
    const effectiveGstType = data.gstType === "NONE" ? "NONE" : determineGstType(posState);

    const computedTotals = calculateBillingTotals(
      data.items.map((i: any) => ({ qty: Number(i.qty), rate: Number(i.rate), taxPercent: Number(i.taxPercent) })),
      Number(data.freightAmount || 0),
      Number(data.freightTaxPercent || 0)
    );

    const updated = await db.$transaction(async (tx) => {
      // 1. Ensure quotation exists and is not deleted
      const existing = await tx.quotation.findFirst({
        where: { id: quotationId, deletedAt: null },
      });

      if (!existing) {
        throw new Error("Quotation record not found or inaccessible.");
      }

      if (existing.status === QuotationStatus.CONVERTED) {
        throw new Error("Cannot modify a converted quotation.");
      }

      // 2. Delete existing line items
      await tx.quotationLineItem.deleteMany({
        where: { quotationId },
      });

      // 3. Update quotation record and insert new line items
      return await tx.quotation.update({
        where: { id: quotationId },
        data: {
          clientId: data.clientId,
          date: new Date(data.date),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          gstType: effectiveGstType as any,
          subTotal: computedTotals.subTotal,
          taxTotal: computedTotals.taxTotal,
          grandTotal: computedTotals.grandTotal,
          notes: data.notes ?? null,
          isFreightCollect: data.isFreightCollect || false,
          freightAmount: data.freightAmount || 0,
          freightTaxPercent: data.freightTaxPercent || 0,
          updatedById: userId,

          // Address snapshots
          billingName: data.billingAddress?.name || null,
          billingAddress1: data.billingAddress?.address1 || null,
          billingAddress2: data.billingAddress?.address2 || null,
          billingState: data.billingAddress?.state || null,
          billingPinCode: data.billingAddress?.pinCode || null,
          billingPhone: data.billingAddress?.phone || null,
          billingGst: data.billingAddress?.gst || null,
          shippingSameAsBilling: data.shippingSameAsBilling,
          shippingName: data.shippingSameAsBilling ? data.billingAddress?.name : data.shippingAddress?.name,
          shippingAddress1: data.shippingSameAsBilling ? data.billingAddress?.address1 : data.shippingAddress?.address1,
          shippingAddress2: data.shippingSameAsBilling ? data.billingAddress?.address2 : data.shippingAddress?.address2,
          shippingState: data.shippingSameAsBilling ? data.billingAddress?.state : data.shippingAddress?.state,
          shippingPinCode: data.shippingSameAsBilling ? data.billingAddress?.pinCode : data.shippingAddress?.pinCode,

          lineItems: {
            create: data.items.map((item: any) => ({
              product: item.productId ? { connect: { id: item.productId } } : undefined,
              description: item.description,
              hsn: item.hsn || null,
              qty: parseFloat(String(item.qty)),
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount || 0,
              unit: item.unit || "NOS",
              pkgCount: item.pkgCount || 0,
              pkgType: item.pkgType || "BOX",
              qtyPerBox: item.qtyPerBox || 0,
              showPkgDetails: item.showPkgDetails !== undefined && item.showPkgDetails !== null ? Boolean(item.showPkgDetails) : false,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: {
          client: true,
          lineItems: {
            orderBy: { id: "asc" },
            include: { product: true },
          },
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    // 4. Record Audit Log (non-blocking)
    recordAuditLog(db, {
      userId,
      action: "QUOTATION_UPDATED",
      entityType: "Quotation",
      entityId: quotationId,
      details: { quotationNo: updated.quotationNo, grandTotal: data.grandTotal },
    }).catch(() => {});

    return serializePrisma(updated);
  }

  /**
   * Fetches quotation by ID with client and line items.
   */
  static async getQuotationById(id: string) {
    const quotation = await db.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: true,
        lineItems: {
          orderBy: { id: "asc" },
          include: { product: true },
        },
      },
    });

    if (!quotation) return null;
    return serializePrisma(quotation);
  }

  /**
   * Fetches all quotations including client name.
   */
  static async getAllQuotations() {
    const quotations = await db.quotation.findMany({
      where: { deletedAt: null },
      orderBy: { date: "desc" },
      include: {
        client: { select: { name: true } },
      },
    });
    return serializePrisma(quotations);
  }

  /**
   * Converts a quotation into an invoice.
   */
  static async convertToInvoice(userId: string | null, quotationId: string) {
    const invoice = await db.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: { lineItems: true },
      });

      if (!quotation) throw new Error("Quotation not found");
      if (quotation.status === QuotationStatus.CONVERTED) throw new Error("Already converted");

      // 1. Get next invoice sequence
      const lastInv = await tx.invoice.findFirst({
        orderBy: { sequenceNumber: "desc" },
      });
      const nextSeq = (lastInv?.sequenceNumber || 0) + 1;
      
      const docDate = new Date(); // Use current date for converted invoice
      const year = docDate.getFullYear();
      const month = docDate.getMonth();
      const fyStartYear = month >= 3 ? year : year - 1;
      const fyEndYear = fyStartYear + 1;
      const fy = `${String(fyStartYear).slice(-2)}-${String(fyEndYear).slice(-2)}`;
      const fyStart = new Date(fyStartYear, 3, 1);
      const fyEnd = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);

      // Count invoices in this FY to get next sequence
      const countThisFY = await tx.invoice.count({
          where: {
              date: { gte: fyStart, lte: fyEnd }
          }
      });

      const seq = String(countThisFY + 1).padStart(2, '0');
      const settings = await tx.companySetting.findFirst();
      const prefix = settings?.invoicePrefix || "B2B";
      const invNo = `JE/${prefix}/${seq}/${fy}`;

      // 2. Create the Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          clientId: quotation.clientId,
          sequenceNumber: nextSeq,
          invoiceNo: invNo,
          date: new Date(),
          gstType: quotation.gstType,
          subTotal: quotation.subTotal,
          taxTotal: quotation.taxTotal,
          grandTotal: quotation.grandTotal,
          notes: quotation.notes,
          status: InvoiceStatus.DRAFT,
          createdById: userId,

          // Transfer address snapshots from quotation
          billingName: quotation.billingName,
          billingAddress1: quotation.billingAddress1,
          billingAddress2: quotation.billingAddress2,
          billingState: quotation.billingState,
          billingPinCode: quotation.billingPinCode,
          billingPhone: quotation.billingPhone,
          billingGst: quotation.billingGst,
          shippingSameAsBilling: quotation.shippingSameAsBilling,
          shippingName: quotation.shippingName,
          shippingAddress1: quotation.shippingAddress1,
          shippingAddress2: quotation.shippingAddress2,
          shippingState: quotation.shippingState,
          shippingPinCode: quotation.shippingPinCode,
          isFreightCollect: quotation.isFreightCollect,
          freightAmount: quotation.freightAmount,
          freightTaxPercent: quotation.freightTaxPercent,

          lineItems: {
            create: quotation.lineItems.map((item: any) => ({
              product: item.productId ? { connect: { id: item.productId } } : undefined,
              description: item.description,
              qty: item.qty,
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
              hsn: item.hsn,
              unit: item.unit || "NOS",
              pkgCount: item.pkgCount || 0,
              pkgType: item.pkgType || "BOX",
              qtyPerBox: item.qtyPerBox || 0,
            }))
          },
        },
      });

      // 3. Update Quotation status
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: QuotationStatus.CONVERTED,
          convertedInvoiceId: createdInvoice.id,
        },
      });

      return createdInvoice;
    }, { timeout: 30000, maxWait: 10000 });

    // 4. Audit Log
    recordAuditLog(db, {
      userId,
      action: "QUOTATION_CONVERTED",
      entityType: "Quotation",
      entityId: quotationId,
      details: { invoiceNo: invoice.invoiceNo },
    }).catch(() => {});

    return serializePrisma(invoice);
  }

  /**
   * Soft deletes a quotation.
   */
  static async softDeleteQuotation(quotationId: string, userId: string | null) {
    const q = await db.quotation.update({
      where: { id: quotationId },
      data: { deletedAt: new Date() },
    });
    return serializePrisma(q);
  }

  /**
   * Restores a soft-deleted quotation.
   */
  static async restoreQuotation(quotationId: string, userId: string | null) {
    const q = await db.quotation.update({
      where: { id: quotationId },
      data: { deletedAt: null },
    });
    return serializePrisma(q);
  }

  /**
   * Permanently deletes a quotation.
   */
  static async permanentlyDeleteQuotation(quotationId: string, userId: string | null) {
    const q = await db.quotation.delete({
      where: { id: quotationId },
    });
    return serializePrisma(q);
  }
}
