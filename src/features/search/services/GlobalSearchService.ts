import { db } from "@/db/prisma/client";
import { serializePrisma } from "@/utils/serialization";

export interface SearchResultItem {
  id: string;
  type: 'CLIENT' | 'VENDOR' | 'INVOICE' | 'PURCHASE' | 'PRODUCT' | 'PAYMENT';
  title: string;
  subtitle: string;
  amount?: string;
  status?: string;
  date?: string;
  url: string;
}

export class GlobalSearchService {
  static async search(query: string): Promise<SearchResultItem[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();

    const [clients, vendors, invoices, purchases, products, payments] = await Promise.all([
      db.client.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { gst: { contains: q } }
          ]
        },
        take: 5
      }),

      db.vendor.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { email: { contains: q } },
            { gst: { contains: q } }
          ]
        },
        take: 5
      }),

      db.invoice.findMany({
        where: {
          deletedAt: null,
          OR: [
            { invoiceNo: { contains: q } },
            { billingName: { contains: q } },
            { vehicleNo: { contains: q } }
          ]
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      }),

      db.purchase.findMany({
        where: {
          deletedAt: null,
          OR: [
            { purchaseNo: { contains: q } },
            { vendor: { name: { contains: q } } }
          ]
        },
        include: { vendor: { select: { name: true } } },
        take: 6,
        orderBy: { createdAt: 'desc' }
      }),

      db.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { description: { contains: q } },
            { sku: { contains: q } },
            { hsn: { contains: q } }
          ]
        },
        take: 5
      }),

      db.payment.findMany({
        where: {
          deletedAt: null,
          OR: [
            { reference: { contains: q } },
            { notes: { contains: q } }
          ]
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const results: SearchResultItem[] = [];

    // Format Clients
    clients.forEach(c => {
      results.push({
        id: c.id,
        type: 'CLIENT',
        title: c.name,
        subtitle: `Client • ${c.phone || c.email || (c.gst ? `GST: ${c.gst}` : 'No contact details')}`,
        url: `/accounts/${c.id}`
      });
    });

    // Format Vendors
    vendors.forEach(v => {
      results.push({
        id: v.id,
        type: 'VENDOR',
        title: v.name,
        subtitle: `Vendor • ${v.phone || v.email || (v.gst ? `GST: ${v.gst}` : 'No contact details')}`,
        url: `/accounts/${v.id}?type=SUPPLIER`
      });
    });

    // Format Sales Invoices
    invoices.forEach(inv => {
      results.push({
        id: inv.id,
        type: 'INVOICE',
        title: `Invoice #${inv.invoiceNo}`,
        subtitle: inv.billingName || 'Client Invoice',
        amount: `₹${Number(inv.grandTotal).toLocaleString('en-IN')}`,
        status: inv.status,
        date: new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        url: `/invoices/${inv.id}`
      });
    });

    // Format Purchase Bills
    purchases.forEach(p => {
      results.push({
        id: p.id,
        type: 'PURCHASE',
        title: `Purchase #${p.purchaseNo}`,
        subtitle: p.vendor?.name || 'Vendor Bill',
        amount: `₹${Number(p.grandTotal).toLocaleString('en-IN')}`,
        status: p.status,
        date: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        url: `/purchases/${p.id}`
      });
    });

    // Format Products
    products.forEach(prod => {
      results.push({
        id: prod.id,
        type: 'PRODUCT',
        title: prod.description,
        subtitle: `Product • SKU: ${prod.sku || 'N/A'} • Rate: ₹${Number(prod.sellingRate).toLocaleString('en-IN')}`,
        url: `/products`
      });
    });

    // Format Payments
    payments.forEach(pay => {
      results.push({
        id: pay.id,
        type: 'PAYMENT',
        title: `Payment ${pay.reference ? `#${pay.reference}` : ''}`,
        subtitle: `Method: ${pay.method}`,
        amount: `₹${Number(pay.amount).toLocaleString('en-IN')}`,
        date: new Date(pay.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        url: `/payments`
      });
    });

    return serializePrisma(results);
  }
}
