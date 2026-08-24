import { z } from "zod";

export const invoiceLineItemSchema = z.object({
    productId: z.string().optional().nullable(),
    description: z.string().min(1, "Description is required"),
    hsn: z.string().optional().nullable(),
    qty: z.coerce.number().positive("Quantity must be greater than 0"),
    rate: z.coerce.number().min(0, "Rate cannot be negative"),
    taxPercent: z.coerce.number().min(0, "GST % cannot be negative"),
    taxAmount: z.coerce.number().min(0).optional().default(0),
    unit: z.string().optional().default("NOS"),
    pkgCount: z.coerce.number().int().min(0).optional().default(0),
    pkgType: z.string().optional().default("BOX"),
    qtyPerBox: z.coerce.number().min(0).optional().default(0),
    showPkgDetails: z.preprocess((val) => {
        if (val === "false" || val === false || val === "off" || val === 0 || val === "0" || val === null || val === undefined) return false;
        if (val === "true" || val === true || val === "on" || val === 1 || val === "1") return true;
        return Boolean(val);
    }, z.boolean().default(false)),
    totalAmount: z.coerce.number().min(0).optional().default(0),
});

export const invoiceSchema = z.object({
    clientId: z.string().min(1, "Please select a client"),
    date: z.string().min(1, "Date is required"),
    invoiceNo: z.string().optional().nullable(),
    gstType: z.enum(["CGST_SGST", "IGST", "NONE"]),

    // Totals
    subTotal: z.coerce.number().min(0).optional().default(0),
    taxTotal: z.coerce.number().min(0).optional().default(0),
    grandTotal: z.coerce.number().min(0).optional().default(0),

    notes: z.string().optional().nullable(),

    // Logistics
    ewayBill: z.string().optional().nullable(),
    ewayBillUrl: z.string().optional().nullable(),
    vehicleNo: z.string().optional().nullable(),
    dispatchedThrough: z.string().optional().nullable(),
    isFreightCollect: z.boolean().default(false),
    freightAmount: z.coerce.number().min(0).optional().default(0),
    freightTaxPercent: z.coerce.number().min(0).max(100).optional().default(0),

    // Address Snapshots
    billingAddress: z.object({
        name: z.string().optional().nullable(),
        address1: z.string().optional().nullable(),
        address2: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        pinCode: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        gst: z.string().optional().nullable()
    }).optional().nullable(),
    shippingAddress: z.object({
        name: z.string().optional().nullable(),
        address1: z.string().optional().nullable(),
        address2: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        pinCode: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        gst: z.string().optional().nullable()
    }).optional().nullable(),
    shippingSameAsBilling: z.boolean().default(true),

    items: z.array(invoiceLineItemSchema).min(1, "At least one item is required"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
