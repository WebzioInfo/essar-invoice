import { db } from "@/db/prisma/client";

export class ReportService {
  /**
   * Aggregates revenue and tax totals for a given date range.
   */
  static async getRevenueSummary(startDate: Date, endDate: Date) {
    const aggregate = await db.invoice.aggregate({
      where: {
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        status: { in: ["PAID", "PARTIAL", "SENT"] },
      },
      _sum: {
        grandTotal: true,
        subTotal: true,
        taxTotal: true,
      },
      _count: {
        id: true,
      },
    });

    // For GST breakdown, we still might need a more granular view 
    // but we can use groupBy for that if needed. 
    // For now, let's get the grouped sums for CGST/SGST/IGST
    const gstGroups = await db.invoice.groupBy({
      by: ["gstType"],
      where: {
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        status: { in: ["PAID", "PARTIAL", "SENT"] },
      },
      _sum: {
        taxTotal: true,
      },
    });

    const summary = {
      totalRevenue: aggregate._sum.grandTotal?.toNumber() || 0,
      totalTax: aggregate._sum.taxTotal?.toNumber() || 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      count: aggregate._count.id || 0,
    };

    gstGroups.forEach((group) => {
      const tax = group._sum.taxTotal?.toNumber() || 0;
      if (group.gstType === "CGST_SGST") {
        summary.cgst += tax / 2;
        summary.sgst += tax / 2;
      } else if (group.gstType === "IGST") {
        summary.igst += tax;
      }
    });

    return summary;
  }

  /**
   * Generates monthly revenue data for charts.
   */
  static async getMonthlyRevenue(year: number) {
    const invoices = await db.invoice.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31),
        },
      },
      select: {
        grandTotal: true,
        date: true,
      },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(year, i, 1)),
      revenue: 0,
    }));

    invoices.forEach((inv) => {
      const month = new Date(inv.date).getMonth();
      monthlyData[month].revenue += inv.grandTotal.toNumber();
    });

    return monthlyData;
  }

  /**
   * Aggregates revenue by client.
   */
  static async getClientRevenue(limit: number = 10) {
    const clients = await db.client.findMany({
      where: { deletedAt: null },
      include: {
        invoices: {
          where: { deletedAt: null },
          select: { grandTotal: true },
        },
      },
    });

    const clientData = clients.map((c: any) => ({
      name: c.name,
      value: c.invoices.reduce((sum: number, inv: any) => sum + inv.grandTotal.toNumber(), 0),
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

    return clientData;
  }

  /**
   * Calculates GST Reconciliation (Output vs Input Tax).
   */
  static async getGstReconciliation(startDate: Date, endDate: Date) {
    const [invoices, purchases] = await Promise.all([
      db.invoice.findMany({
        where: { deletedAt: null, date: { gte: startDate, lte: endDate } },
        select: { taxTotal: true, gstType: true }
      }),
      db.purchase.findMany({
        where: { deletedAt: null, date: { gte: startDate, lte: endDate } },
        select: { taxTotal: true, gstType: true }
      })
    ]);

    const reconciliation = {
      outputTax: 0,
      outputCgst: 0,
      outputSgst: 0,
      outputIgst: 0,
      inputTax: 0,
      inputCgst: 0,
      inputSgst: 0,
      inputIgst: 0,
      netTaxPayable: 0
    };

    invoices.forEach((inv: any) => {
      const tax = inv.taxTotal.toNumber();
      reconciliation.outputTax += tax;
      if (inv.gstType === "CGST_SGST") {
        reconciliation.outputCgst += tax / 2;
        reconciliation.outputSgst += tax / 2;
      } else {
        reconciliation.outputIgst += tax;
      }
    });

    purchases.forEach((pur: any) => {
      const tax = pur.taxTotal.toNumber();
      reconciliation.inputTax += tax;
      if (pur.gstType === "CGST_SGST") {
        reconciliation.inputCgst += tax / 2;
        reconciliation.inputSgst += tax / 2;
      } else {
        reconciliation.inputIgst += tax;
      }
    });

    reconciliation.netTaxPayable = reconciliation.outputTax - reconciliation.inputTax;

    return reconciliation;
  }
}
