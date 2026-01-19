import { Product } from "@/app/types/invoice";


export const calculateTotals = (products: Product[]) => {
  const subTotal = products.reduce((s, p) => s + p.qty * p.rate, 0);
  const gstTotal = products.reduce((s, p) => s + (p.qty * p.rate * p.gst) / 100, 0);
  return { subTotal, gstTotal };
};
