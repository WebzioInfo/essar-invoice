// ImportService.ts - Safe, deterministic data import engine with mandatory Dry-Run analysis
import { db } from "@/db/prisma/client";
import { StockService, StockLogType } from "@/features/inventory/services/StockService";
import { serializePrisma } from "@/utils/serialization";

export type ImportEntity = "products" | "clients" | "vendors" | "stock_adjustments";

export interface DryRunItemChange {
    identifier: string;
    action: "INSERT" | "UPDATE" | "UNCHANGED" | "AMBIGUOUS" | "ERROR";
    reason?: string;
    diff?: Record<string, { old: any; new: any }>;
    data: any;
}

export interface DryRunReport {
    entity: ImportEntity;
    totalRecords: number;
    insertCount: number;
    updateCount: number;
    unchangedCount: number;
    ambiguousCount: number;
    errorCount: number;
    changes: DryRunItemChange[];
    canApply: boolean;
}

export interface ImportExecutionResult {
    success: boolean;
    entity: ImportEntity;
    totalProcessed: number;
    inserted: number;
    updated: number;
    unchanged: number;
    failed: number;
    errors: string[];
}

function parseCsvToObjects(csvText: string): Record<string, string>[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]);
    const results: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        if (values.length === 0) continue;
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            const key = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
            obj[key] = (values[idx] || "").trim();
        });
        results.push(obj);
    }
    return results;
}

function parseCsvLine(line: string): string[] {
    const entries: string[] = [];
    let insideQuotes = false;
    let current = "";

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            entries.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    entries.push(current);
    return entries;
}

export class ImportService {
    /**
     * Parses payload (JSON string or CSV text) into standardized record array.
     */
    static parsePayload(rawContent: string, format: "csv" | "json"): any[] {
        if (format === "json") {
            const parsed = JSON.parse(rawContent);
            return Array.isArray(parsed) ? parsed : [parsed];
        }
        return parseCsvToObjects(rawContent);
    }

    /**
     * Executes Dry-Run analysis without modifying the database.
     */
    static async runDryRun(entity: ImportEntity, records: any[]): Promise<DryRunReport> {
        const changes: DryRunItemChange[] = [];
        let insertCount = 0;
        let updateCount = 0;
        let unchangedCount = 0;
        let ambiguousCount = 0;
        let errorCount = 0;

        switch (entity) {
            case "products": {
                const existing = await (db as any).product.findMany({ where: { deletedAt: null } });
                const skuMap = new Map<string, any>();
                const descMap = new Map<string, any>();

                existing.forEach((p: any) => {
                    if (p.sku) skuMap.set(p.sku.trim().toUpperCase(), p);
                    descMap.set(p.description.trim().toUpperCase(), p);
                });

                for (const raw of records) {
                    const desc = raw.description || raw.name || raw.product_description || raw.item_name;
                    const sku = (raw.sku || raw.item_code || raw.product_code || "").trim();

                    if (!desc) {
                        changes.push({
                            identifier: sku || "UNKNOWN",
                            action: "ERROR",
                            reason: "Missing mandatory 'description' or 'name' field",
                            data: raw
                        });
                        errorCount++;
                        continue;
                    }

                    const normalizedSku = sku ? sku.toUpperCase() : null;
                    const normalizedDesc = desc.trim().toUpperCase();

                    const matchedBySku = normalizedSku ? skuMap.get(normalizedSku) : null;
                    const matchedByDesc = descMap.get(normalizedDesc);

                    if (matchedBySku && matchedByDesc && matchedBySku.id !== matchedByDesc.id) {
                        changes.push({
                            identifier: `${sku} / ${desc}`,
                            action: "AMBIGUOUS",
                            reason: `SKU matches product ID ${matchedBySku.id} but description matches product ID ${matchedByDesc.id}`,
                            data: raw
                        });
                        ambiguousCount++;
                        continue;
                    }

                    const match = matchedBySku || matchedByDesc;

                    if (!match) {
                        changes.push({
                            identifier: sku ? `${sku} (${desc})` : desc,
                            action: "INSERT",
                            reason: "New product record will be created",
                            data: raw
                        });
                        insertCount++;
                    } else {
                        // Check diff
                        const diff: Record<string, { old: any; new: any }> = {};
                        const newPurchaseRate = raw.purchase_rate ?? raw.purchaserate ?? raw.purchaseRate;
                        const newSellingRate = raw.selling_rate ?? raw.sellingrate ?? raw.sellingRate;
                        const newHsn = raw.hsn ?? raw.hsn_sac;
                        const newPkgType = raw.package_type ?? raw.pkgtype ?? raw.pkgType;
                        const newQtyPerBox = raw.units_per_pkg ?? raw.qtyperbox ?? raw.qtyPerBox;

                        if (newPurchaseRate !== undefined && Number(newPurchaseRate) !== Number(match.purchaseRate)) {
                            diff.purchaseRate = { old: Number(match.purchaseRate), new: Number(newPurchaseRate) };
                        }
                        if (newSellingRate !== undefined && Number(newSellingRate) !== Number(match.sellingRate)) {
                            diff.sellingRate = { old: Number(match.sellingRate), new: Number(newSellingRate) };
                        }
                        if (newHsn !== undefined && String(newHsn).trim() !== (match.hsn || "")) {
                            diff.hsn = { old: match.hsn, new: String(newHsn).trim() };
                        }
                        if (newPkgType !== undefined && String(newPkgType).trim() !== (match.pkgType || "")) {
                            diff.pkgType = { old: match.pkgType, new: String(newPkgType).trim() };
                        }
                        if (newQtyPerBox !== undefined && Number(newQtyPerBox) !== Number(match.qtyPerBox)) {
                            diff.qtyPerBox = { old: Number(match.qtyPerBox), new: Number(newQtyPerBox) };
                        }

                        if (Object.keys(diff).length > 0) {
                            changes.push({
                                identifier: match.sku ? `${match.sku} (${match.description})` : match.description,
                                action: "UPDATE",
                                reason: `Will update ${Object.keys(diff).length} fields`,
                                diff,
                                data: raw
                            });
                            updateCount++;
                        } else {
                            changes.push({
                                identifier: match.sku ? `${match.sku} (${match.description})` : match.description,
                                action: "UNCHANGED",
                                reason: "Record matches existing database state exactly",
                                data: raw
                            });
                            unchangedCount++;
                        }
                    }
                }
                break;
            }

            case "clients": {
                const existing = await (db as any).client.findMany({ where: { deletedAt: null } });
                const gstMap = new Map<string, any>();
                const nameMap = new Map<string, any>();

                existing.forEach((c: any) => {
                    if (c.gst) gstMap.set(c.gst.trim().toUpperCase(), c);
                    nameMap.set(c.name.trim().toUpperCase(), c);
                });

                for (const raw of records) {
                    const name = raw.name || raw.client_name || raw.company_name;
                    const gst = (raw.gstin || raw.gst || raw.client_gstin || "").trim();

                    if (!name) {
                        changes.push({
                            identifier: gst || "UNKNOWN",
                            action: "ERROR",
                            reason: "Missing mandatory 'name' or 'client_name' field",
                            data: raw
                        });
                        errorCount++;
                        continue;
                    }

                    const normalizedGst = gst ? gst.toUpperCase() : null;
                    const normalizedName = name.trim().toUpperCase();

                    const match = (normalizedGst ? gstMap.get(normalizedGst) : null) || nameMap.get(normalizedName);

                    if (!match) {
                        changes.push({
                            identifier: name,
                            action: "INSERT",
                            reason: "New client will be registered",
                            data: raw
                        });
                        insertCount++;
                    } else {
                        const diff: Record<string, { old: any; new: any }> = {};
                        const newPhone = raw.phone ?? raw.contact_phone;
                        const newEmail = raw.email ?? raw.contact_email;
                        const newAddress = raw.address || raw.address1 || raw.billing_address;

                        if (newPhone !== undefined && String(newPhone).trim() !== (match.phone || "")) {
                            diff.phone = { old: match.phone, new: String(newPhone).trim() };
                        }
                        if (newEmail !== undefined && String(newEmail).trim() !== (match.email || "")) {
                            diff.email = { old: match.email, new: String(newEmail).trim() };
                        }
                        if (newAddress !== undefined && String(newAddress).trim() !== (match.address1 || "")) {
                            diff.address1 = { old: match.address1, new: String(newAddress).trim() };
                        }

                        if (Object.keys(diff).length > 0) {
                            changes.push({
                                identifier: match.name,
                                action: "UPDATE",
                                reason: `Will update ${Object.keys(diff).length} fields`,
                                diff,
                                data: raw
                            });
                            updateCount++;
                        } else {
                            changes.push({
                                identifier: match.name,
                                action: "UNCHANGED",
                                reason: "Existing client identical to import",
                                data: raw
                            });
                            unchangedCount++;
                        }
                    }
                }
                break;
            }

            case "vendors": {
                const existing = await (db as any).vendor.findMany({ where: { deletedAt: null } });
                const nameMap = new Map<string, any>();
                const gstMap = new Map<string, any>();

                existing.forEach((v: any) => {
                    nameMap.set(v.name.trim().toUpperCase(), v);
                    if (v.gst) gstMap.set(v.gst.trim().toUpperCase(), v);
                });

                for (const raw of records) {
                    const name = raw.name || raw.vendor_name;
                    const gst = (raw.gstin || raw.gst || raw.vendor_gstin || "").trim();

                    if (!name) {
                        changes.push({
                            identifier: gst || "UNKNOWN",
                            action: "ERROR",
                            reason: "Missing mandatory 'name' field",
                            data: raw
                        });
                        errorCount++;
                        continue;
                    }

                    const match = (gst ? gstMap.get(gst.toUpperCase()) : null) || nameMap.get(name.trim().toUpperCase());

                    if (!match) {
                        changes.push({
                            identifier: name,
                            action: "INSERT",
                            reason: "New vendor will be registered",
                            data: raw
                        });
                        insertCount++;
                    } else {
                        changes.push({
                            identifier: match.name,
                            action: "UNCHANGED",
                            reason: "Vendor exists in database",
                            data: raw
                        });
                        unchangedCount++;
                    }
                }
                break;
            }

            case "stock_adjustments": {
                const existing = await (db as any).product.findMany({ where: { deletedAt: null } });
                const stockMap = await StockService.getInventoryLevels();
                const descMap = new Map<string, any>();
                const skuMap = new Map<string, any>();

                existing.forEach((p: any) => {
                    descMap.set(p.description.trim().toUpperCase(), p);
                    if (p.sku) skuMap.set(p.sku.trim().toUpperCase(), p);
                });

                for (const raw of records) {
                    const desc = raw.description || raw.product || raw.product_name;
                    const sku = (raw.sku || "").trim();
                    const targetQty = Number(raw.target_quantity ?? raw.current_stock ?? raw.quantity);

                    if (isNaN(targetQty)) {
                        changes.push({
                            identifier: desc || sku || "UNKNOWN",
                            action: "ERROR",
                            reason: "Invalid or missing numeric target quantity",
                            data: raw
                        });
                        errorCount++;
                        continue;
                    }

                    const match = (sku ? skuMap.get(sku.toUpperCase()) : null) || (desc ? descMap.get(desc.trim().toUpperCase()) : null);

                    if (!match) {
                        changes.push({
                            identifier: desc || sku || "UNKNOWN",
                            action: "ERROR",
                            reason: "Product not found in current inventory catalog",
                            data: raw
                        });
                        errorCount++;
                        continue;
                    }

                    const currentStock = stockMap[match.id] || 0;
                    const diff = targetQty - currentStock;

                    if (Math.abs(diff) < 0.0001) {
                        changes.push({
                            identifier: match.description,
                            action: "UNCHANGED",
                            reason: `Stock is already at ${currentStock} ${match.unit}`,
                            data: raw
                        });
                        unchangedCount++;
                    } else {
                        changes.push({
                            identifier: match.description,
                            action: "UPDATE",
                            reason: `Adjustment from ${currentStock} to ${targetQty} (Delta: ${diff > 0 ? '+' : ''}${diff} ${match.unit})`,
                            diff: {
                                stock: { old: currentStock, new: targetQty }
                            },
                            data: raw
                        });
                        updateCount++;
                    }
                }
                break;
            }
        }

        return {
            entity,
            totalRecords: records.length,
            insertCount,
            updateCount,
            unchangedCount,
            ambiguousCount,
            errorCount,
            changes,
            canApply: errorCount === 0 && ambiguousCount === 0 && (insertCount > 0 || updateCount > 0)
        };
    }

    /**
     * Applies the validated import payload inside a safe database transaction.
     */
    static async applyImport(entity: ImportEntity, records: any[]): Promise<ImportExecutionResult> {
        let inserted = 0;
        let updated = 0;
        let unchanged = 0;
        let failed = 0;
        const errors: string[] = [];

        await db.$transaction(async (tx: any) => {
            switch (entity) {
                case "products": {
                    const existing = await tx.product.findMany({ where: { deletedAt: null } });
                    const skuMap = new Map<string, any>();
                    const descMap = new Map<string, any>();

                    existing.forEach((p: any) => {
                        if (p.sku) skuMap.set(p.sku.trim().toUpperCase(), p);
                        descMap.set(p.description.trim().toUpperCase(), p);
                    });

                    for (const raw of records) {
                        const desc = raw.description || raw.name || raw.product_description;
                        const sku = (raw.sku || "").trim() || null;
                        if (!desc) {
                            failed++;
                            errors.push("Skipped item without description");
                            continue;
                        }

                        const match = (sku ? skuMap.get(sku.toUpperCase()) : null) || descMap.get(desc.trim().toUpperCase());

                        const purchaseRate = raw.purchase_rate ?? raw.purchaseRate ?? 0;
                        const sellingRate = raw.selling_rate ?? raw.sellingRate ?? 0;
                        const gstRate = raw.gst_rate ?? raw.gstRate ?? 18;
                        const hsn = raw.hsn ?? raw.hsn_sac ?? null;
                        const unit = raw.unit || "NOS";
                        const pkgType = raw.package_type ?? raw.pkgType ?? "BOX";
                        const qtyPerBox = raw.units_per_pkg ?? raw.qtyPerBox ?? 0;

                        if (!match) {
                            const newProd = await tx.product.create({
                                data: {
                                    description: desc.trim(),
                                    sku,
                                    hsn: hsn ? String(hsn).trim() : null,
                                    unit,
                                    pkgType,
                                    qtyPerBox: Number(qtyPerBox) || 0,
                                    purchaseRate: Number(purchaseRate) || 0,
                                    sellingRate: Number(sellingRate) || 0,
                                    gstRate: Number(gstRate) || 18,
                                    active: true
                                }
                            });
                            // Create initial zero stock
                            await tx.stock.create({
                                data: {
                                    productId: newProd.id,
                                    quantity: 0
                                }
                            });
                            inserted++;
                        } else {
                            await tx.product.update({
                                where: { id: match.id },
                                data: {
                                    purchaseRate: purchaseRate !== undefined ? Number(purchaseRate) : match.purchaseRate,
                                    sellingRate: sellingRate !== undefined ? Number(sellingRate) : match.sellingRate,
                                    gstRate: gstRate !== undefined ? Number(gstRate) : match.gstRate,
                                    hsn: hsn !== undefined ? String(hsn).trim() : match.hsn,
                                    pkgType: pkgType !== undefined ? String(pkgType).trim() : match.pkgType,
                                    qtyPerBox: qtyPerBox !== undefined ? Number(qtyPerBox) : match.qtyPerBox
                                }
                            });
                            updated++;
                        }
                    }
                    break;
                }

                case "clients": {
                    const existing = await tx.client.findMany({ where: { deletedAt: null } });
                    const gstMap = new Map<string, any>();
                    const nameMap = new Map<string, any>();

                    existing.forEach((c: any) => {
                        if (c.gst) gstMap.set(c.gst.trim().toUpperCase(), c);
                        nameMap.set(c.name.trim().toUpperCase(), c);
                    });

                    for (const raw of records) {
                        const name = raw.name || raw.client_name;
                        const gst = (raw.gstin || raw.gst || "").trim() || null;
                        if (!name) {
                            failed++;
                            continue;
                        }

                        const match = (gst ? gstMap.get(gst.toUpperCase()) : null) || nameMap.get(name.trim().toUpperCase());

                        if (!match) {
                            await tx.client.create({
                                data: {
                                    name: name.trim(),
                                    gst,
                                    phone: raw.phone || null,
                                    email: raw.email || null,
                                    address1: raw.address || raw.address1 || "Main Address",
                                    address2: raw.address2 || null,
                                    state: raw.state || "Default State",
                                    pinCode: raw.pincode || raw.pin_code || raw.pinCode || null,
                                    active: true
                                }
                            });
                            inserted++;
                        } else {
                            await tx.client.update({
                                where: { id: match.id },
                                data: {
                                    phone: raw.phone !== undefined ? String(raw.phone) : match.phone,
                                    email: raw.email !== undefined ? String(raw.email) : match.email,
                                    address1: (raw.address || raw.address1) !== undefined ? String(raw.address || raw.address1) : match.address1
                                }
                            });
                            updated++;
                        }
                    }
                    break;
                }

                case "stock_adjustments": {
                    const existing = await tx.product.findMany({ where: { deletedAt: null } });
                    const descMap = new Map<string, any>();
                    const skuMap = new Map<string, any>();

                    existing.forEach((p: any) => {
                        descMap.set(p.description.trim().toUpperCase(), p);
                        if (p.sku) skuMap.set(p.sku.trim().toUpperCase(), p);
                    });

                    for (const raw of records) {
                        const desc = raw.description || raw.product;
                        const sku = (raw.sku || "").trim();
                        const targetQty = Number(raw.target_quantity ?? raw.current_stock ?? raw.quantity);

                        if (isNaN(targetQty)) {
                            failed++;
                            continue;
                        }

                        const match = (sku ? skuMap.get(sku.toUpperCase()) : null) || (desc ? descMap.get(desc.trim().toUpperCase()) : null);
                        if (!match) {
                            failed++;
                            continue;
                        }

                        const currentStock = await tx.stock.findUnique({ where: { productId: match.id } });
                        const currentQty = currentStock ? Number(currentStock.quantity) : 0;
                        const delta = targetQty - currentQty;

                        if (Math.abs(delta) > 0.0001) {
                            await StockService.recordChange({
                                productId: match.id,
                                type: StockLogType.ADJUSTMENT,
                                quantityChange: delta,
                                notes: `[IMPORT_ADJUSTMENT] Stock aligned from ${currentQty} to ${targetQty}`,
                                tx
                            });
                            updated++;
                        } else {
                            unchanged++;
                        }
                    }
                    break;
                }
            }
        }, { timeout: 60000 });

        return {
            success: true,
            entity,
            totalProcessed: records.length,
            inserted,
            updated,
            unchanged,
            failed,
            errors
        };
    }
}
