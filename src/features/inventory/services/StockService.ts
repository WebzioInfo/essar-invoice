import { db } from "@/db/prisma/client";
import { Prisma } from "@prisma/client";
import { serializePrisma } from "@/utils/serialization";

// Re-defining StockLogType locally because the Prisma generator is failing to export it on Windows
export type StockLogType = 'ADD' | 'REMOVE' | 'UPDATE' | 'MANUAL' | 'ADJUSTMENT' | 'RETURN';
export const StockLogType = {
  ADD: 'ADD' as const,
  REMOVE: 'REMOVE' as const,
  UPDATE: 'UPDATE' as const,
  MANUAL: 'MANUAL' as const,
  ADJUSTMENT: 'ADJUSTMENT' as const,
  RETURN: 'RETURN' as const,
};

export interface ProductInventorySummary {
  id: string;
  sku: string | null;
  description: string;
  hsn: string | null;
  unit: string;
  pkgType: string | null;
  qtyPerBox: number;
  showPkgDetails: boolean;
  purchaseRate: number;
  sellingRate: number;
  gstRate: number;
  active: boolean;
  notes: string | null;
  currentStock: number;
  totalPackages: number;
  looseUnits: number;
  packageDisplay: string;
  costValue: number;
  retailValue: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE";
  lastMovementDate: string | null;
}

export interface InventoryLedgerMetrics {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  negativeStockCount: number;
  totalStockUnits: number;
  totalPackagesCount: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  movements24h: number;
  movements30d: number;
  stockIn30d: number;
  stockOut30d: number;
}

export interface StockDiscrepancyItem {
  productId: string;
  sku: string | null;
  description: string;
  unit: string;
  storedStock: number;
  calculatedStock: number;
  discrepancy: number;
  totalLogs: number;
  hasMismatch: boolean;
}

export class StockService {
  /**
   * Records a stock movement and updates the current stock level.
   */
  static async recordChange(params: {
    productId: string;
    type: StockLogType;
    quantityChange: number;
    referenceId?: string;
    notes?: string;
    tx?: Prisma.TransactionClient;
  }) {
    const { productId, type, quantityChange, referenceId, notes, tx } = params;
    const prisma: any = tx || db;

    // 1. Get current stock
    const currentStock = await prisma.stock.findUnique({
      where: { productId }
    });

    const quantityBefore = currentStock ? Number(currentStock.quantity) : 0;
    const quantityAfter = quantityBefore + quantityChange;

    // 2. Update or Create Stock
    await prisma.stock.upsert({
      where: { productId },
      create: { 
        productId, 
        quantity: quantityAfter 
      },
      update: { 
        quantity: quantityAfter 
      }
    });

    // 3. Create Log
    const log = await prisma.stockLog.create({
      data: {
        productId,
        type,
        quantityBefore,
        quantityChange,
        quantityAfter,
        referenceId,
        notes
      }
    });

    return { quantityAfter, logId: log.id };
  }

  /**
   * Fetches current stock levels for all products.
   */
  static async getInventoryLevels() {
    const stocks = await (db as any).stock.findMany();
    const stockMap: Record<string, number> = {};
    stocks.forEach((s: any) => {
      stockMap[s.productId] = Number(s.quantity);
    });
    return stockMap;
  }

  /**
   * Fetches detailed inventory summaries with package breakdowns and valuations.
   */
  static async getDetailedInventory(): Promise<{
    items: ProductInventorySummary[];
    metrics: InventoryLedgerMetrics;
  }> {
    const [products, stocks, stockLogs] = await Promise.all([
      (db as any).product.findMany({
        where: { deletedAt: null },
        orderBy: { description: 'asc' }
      }),
      (db as any).stock.findMany(),
      (db as any).stockLog.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const stockMap = new Map<string, number>();
    stocks.forEach((s: any) => stockMap.set(s.productId, Number(s.quantity)));

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    let movements24h = 0;
    let movements30d = stockLogs.length;
    let stockIn30d = 0;
    let stockOut30d = 0;

    const lastMovementMap = new Map<string, string>();

    stockLogs.forEach((log: any) => {
      const logTime = new Date(log.createdAt).getTime();
      if (logTime >= oneDayAgo) movements24h++;

      const change = Number(log.quantityChange);
      if (change > 0) stockIn30d += change;
      else stockOut30d += Math.abs(change);

      if (!lastMovementMap.has(log.productId)) {
        lastMovementMap.set(log.productId, log.createdAt.toISOString());
      }
    });

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let negativeStockCount = 0;
    let totalStockUnits = 0;
    let totalPackagesCount = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const items: ProductInventorySummary[] = products.map((p: any) => {
      const stockQty = stockMap.get(p.id) || 0;
      const qtyPerBox = Number(p.qtyPerBox) || 0;
      const purchaseRate = Number(p.purchaseRate) || 0;
      const sellingRate = Number(p.sellingRate) || 0;
      const gstRate = Number(p.gstRate) || 0;

      // Package & loose unit calculations
      let totalPackages = 0;
      let looseUnits = stockQty;
      let packageDisplay = `${stockQty} ${p.unit}`;

      if (qtyPerBox > 0) {
        const fullPkg = Math.floor(Math.abs(stockQty) / qtyPerBox) * Math.sign(stockQty);
        const loose = stockQty % qtyPerBox;
        totalPackages = fullPkg;
        looseUnits = loose;

        const pkgUnit = p.pkgType || "BOX";
        if (loose === 0) {
          packageDisplay = `${fullPkg} ${pkgUnit} (${stockQty} ${p.unit})`;
        } else {
          packageDisplay = `${fullPkg} ${pkgUnit} + ${loose} ${p.unit}`;
        }
      }

      const costValue = stockQty > 0 ? stockQty * purchaseRate : 0;
      const retailValue = stockQty > 0 ? stockQty * sellingRate : 0;

      let status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NEGATIVE" = "IN_STOCK";
      if (stockQty < 0) {
        status = "NEGATIVE";
        negativeStockCount++;
      } else if (stockQty === 0) {
        status = "OUT_OF_STOCK";
        outOfStockCount++;
      } else if (stockQty <= 5) {
        status = "LOW_STOCK";
        lowStockCount++;
        inStockCount++;
      } else {
        inStockCount++;
      }

      totalStockUnits += stockQty;
      totalPackagesCount += totalPackages;
      totalCostValuation += costValue;
      totalRetailValuation += retailValue;

      return {
        id: p.id,
        sku: p.sku || null,
        description: p.description,
        hsn: p.hsn || null,
        unit: p.unit || "NOS",
        pkgType: p.pkgType || "BOX",
        qtyPerBox,
        showPkgDetails: p.showPkgDetails ?? true,
        purchaseRate,
        sellingRate,
        gstRate,
        active: p.active ?? true,
        notes: p.notes || null,
        currentStock: stockQty,
        totalPackages,
        looseUnits,
        packageDisplay,
        costValue,
        retailValue,
        status,
        lastMovementDate: lastMovementMap.get(p.id) || null
      };
    });

    const metrics: InventoryLedgerMetrics = {
      totalProducts: products.length,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      negativeStockCount,
      totalStockUnits,
      totalPackagesCount,
      totalCostValuation,
      totalRetailValuation,
      movements24h,
      movements30d,
      stockIn30d,
      stockOut30d
    };

    return { items, metrics };
  }

  /**
   * Fetches stock logs for a specific product or all products with enriched metadata.
   */
  static async getStockLogs(productId?: string, limit = 100) {
    const logs = await (db as any).stockLog.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: {
          select: { description: true, sku: true, unit: true, pkgType: true, qtyPerBox: true }
        }
      }
    });
    return serializePrisma(logs);
  }

  /**
   * Checks inventory consistency and flags any discrepancy between recorded stock and movement logs.
   */
  static async checkStockDiscrepancies(): Promise<StockDiscrepancyItem[]> {
    const [products, stocks, allLogs] = await Promise.all([
      (db as any).product.findMany({ where: { deletedAt: null }, select: { id: true, sku: true, description: true, unit: true } }),
      (db as any).stock.findMany(),
      (db as any).stockLog.findMany()
    ]);

    const stockMap = new Map<string, number>();
    stocks.forEach((s: any) => stockMap.set(s.productId, Number(s.quantity)));

    const logSumMap = new Map<string, { sum: number; count: number }>();
    allLogs.forEach((l: any) => {
      const current = logSumMap.get(l.productId) || { sum: 0, count: 0 };
      current.sum += Number(l.quantityChange);
      current.count += 1;
      logSumMap.set(l.productId, current);
    });

    return products.map((p: any) => {
      const storedStock = stockMap.get(p.id) || 0;
      const logData = logSumMap.get(p.id) || { sum: 0, count: 0 };
      const calculatedStock = logData.sum;
      const discrepancy = storedStock - calculatedStock;
      const hasMismatch = Math.abs(discrepancy) > 0.001;

      return {
        productId: p.id,
        sku: p.sku || null,
        description: p.description,
        unit: p.unit,
        storedStock,
        calculatedStock,
        discrepancy,
        totalLogs: logData.count,
        hasMismatch
      };
    });
  }

  /**
   * Deletes a stock log entry and reverses its effect on the current stock level.
   */
  static async deleteStockLog(logId: string) {
    return await db.$transaction(async (tx: any) => {
      const log = await tx.stockLog.findUnique({ where: { id: logId } });
      if (!log) throw new Error("Stock log not found");

      // Reverse the change in current stock
      await tx.stock.update({
        where: { productId: log.productId },
        data: {
          quantity: { decrement: Number(log.quantityChange) }
        }
      });

      // Delete the log
      await tx.stockLog.delete({ where: { id: logId } });

      return { success: true };
    }, { timeout: 30000 });
  }

  /**
   * Updates an existing stock log and adjusts the current stock level.
   */
  static async updateStockLog(logId: string, newQuantityChange: number, newNotes?: string) {
    return await db.$transaction(async (tx: any) => {
      const oldLog = await tx.stockLog.findUnique({ where: { id: logId } });
      if (!oldLog) throw new Error("Stock log not found");

      const diff = newQuantityChange - Number(oldLog.quantityChange);

      // Adjust the current stock by the difference
      await tx.stock.update({
        where: { productId: oldLog.productId },
        data: {
          quantity: { increment: diff }
        }
      });

      // Update the log
      const updatedLog = await tx.stockLog.update({
        where: { id: logId },
        data: {
          quantityChange: newQuantityChange,
          quantityAfter: Number(oldLog.quantityAfter) + diff,
          notes: newNotes !== undefined ? newNotes : oldLog.notes
        }
      });

      return serializePrisma(updatedLog);
    }, { timeout: 30000 });
  }

  /**
   * Reconciles and synchronizes inventory records across all catalog items.
   */
  static async syncAllInventory() {
    const discrepancies = await this.checkStockDiscrepancies();
    return {
      totalProducts: discrepancies.length,
      discrepancyCount: discrepancies.filter(d => d.hasMismatch).length,
      timestamp: new Date().toISOString()
    };
  }
}

