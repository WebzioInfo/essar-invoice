import { Prisma } from "@prisma/client";
import { InvoiceRepository } from "../repositories/InvoiceRepository";
import { validateData } from "@/lib/validation";
import { invoiceSchema } from "../validators/invoiceSchema";
import { serializePrisma } from "@/utils/serialization";
import { db } from "@/db/prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { nextInvoiceNumber } from "@/lib/utils/documentNumber";

const invoiceRepo = new InvoiceRepository();

export class InvoiceService {
  async createInvoice(userId: string, rawData: any) {
    // 1. Validation
    const validatedData = await validateData(invoiceSchema, rawData);

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
        // Format: SRB2B-26-27-001 (prefix from settings, Indian FY, 3-digit seq per FY)
        const prefix = settings?.invoicePrefix || "SRB2B";
        const docDate = new Date(validatedData.date);
        invoiceNo = await nextInvoiceNumber(tx, prefix, docDate);
      }

      // 3. Persistence
      const invoice = await tx.invoice.create({
        data: {
          createdById: userId,
          clientId: validatedData.clientId,
          sequenceNumber: nextSequence,
          invoiceNo: invoiceNo,
          date: new Date(validatedData.date),
          gstType: validatedData.gstType,
          subTotal: validatedData.subTotal,
          taxTotal: validatedData.taxTotal,
          grandTotal: validatedData.grandTotal,
          ewayBill: validatedData.ewayBill,
          vehicleNo: validatedData.vehicleNo,
          dispatchedThrough: validatedData.dispatchedThrough,

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
              productId: item.productId,
              description: item.description,
              hsn: item.hsn,
              qty: item.qty,
              rate: item.rate,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              unit: item.unit || "NOS",
              pkgCount: item.pkgCount || 0,
              pkgType: item.pkgType || "BOX",
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

      return serializePrisma(invoice);
    }, { timeout: 15000 });
  }

  async getInvoices(page?: number, limit?: number) {
    const result = await invoiceRepo.findPaginated({
      page,
      limit,
      include: { client: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
    return serializePrisma(result);
  }

  async updateInvoice(invoiceId: string, userId: string, rawData: any) {
    const validatedData = await validateData(invoiceSchema, rawData);
    
    const invoice = await invoiceRepo.updateWithItems(invoiceId, {
      clientId: validatedData.clientId,
      date: new Date(validatedData.date),
      gstType: validatedData.gstType,
      subTotal: validatedData.subTotal,
      taxTotal: validatedData.taxTotal,
      grandTotal: validatedData.grandTotal,
      ewayBill: validatedData.ewayBill,
      vehicleNo: validatedData.vehicleNo,
      invoiceNo: validatedData.invoiceNo,
      dispatchedThrough: validatedData.dispatchedThrough,

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
        productId: item.productId,
        description: item.description,
        hsn: item.hsn,
        qty: item.qty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        taxAmount: item.taxAmount,
        unit: item.unit || "NOS",
        pkgCount: item.pkgCount || 0,
        pkgType: item.pkgType || "BOX",
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

    return serializePrisma(invoice);
  }

  async softDeleteInvoice(invoiceId: string, userId: string) {
    const invoice = await invoiceRepo.softDelete(invoiceId, userId);
    
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
    const invoice = await invoiceRepo.model.update({
      where: { id: invoiceId },
      data: { deletedAt: null, updatedById: userId }
    });

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

  async getDeletedInvoices(page?: number, limit?: number) {
    const result = await invoiceRepo.findPaginated({
      page,
      limit,
      where: { deletedAt: { not: null } },
      include: { client: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' }
    });
    return serializePrisma(result);
  }
}
