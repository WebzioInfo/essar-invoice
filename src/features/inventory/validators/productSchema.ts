import { z } from "zod";

const coerceRate = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? 0 : val),
  z.coerce.number().min(0)
);

export const productSchema = z.object({
  sku: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  hsn: z.string().optional().nullable(),
  purchaseRate: coerceRate,
  sellingRate: coerceRate,
  gstRate: z.coerce.number().min(0, "GST rate must be positive"),
  unit: z.string().optional().default("NOS"),
  notes: z.string().optional().nullable(),
  pkgType: z.string().optional().default("BOX"),
  qtyPerBox: z.coerce.number().min(0).default(0),
  showPkgDetails: z.preprocess((val) => {
    if (val === "false" || val === false || val === "off" || val === 0 || val === "0" || val === null || val === undefined) {
      return false;
    }
    if (val === "true" || val === true || val === "on" || val === 1 || val === "1") {
      return true;
    }
    return Boolean(val);
  }, z.boolean().default(false)),
  active: z.boolean().optional().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
