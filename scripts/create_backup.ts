import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db/prisma/client";
import { BackupService } from "../src/features/data-management/services/BackupService";
import { ALL_MODELS_META } from "../src/lib/backup/dependencyGraph";

async function createPreMigrationBackup() {
  console.log("=================================================");
  console.log("CREATING PRE-MIGRATION PRODUCTION BACKUP");
  console.log("=================================================\n");

  const backupDir = path.resolve(__dirname, "../backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, "-");
  
  // 1. Full .essar-backup archive
  const adminUser = { id: "system-dba", name: "DBA Reconciliation", email: "admin@essar.com" };
  console.log("Generating full .essar-backup ZIP archive...");
  const fullBackup = await BackupService.createBackup(adminUser, "FULL");

  const zipFilename = `essar-production-before-reconciliation-${timestampStr}.essar-backup`;
  const zipPath = path.join(backupDir, zipFilename);
  fs.writeFileSync(zipPath, fullBackup.buffer);
  console.log(`Saved backup archive to: ${zipPath} (${fullBackup.buffer.byteLength} bytes)`);

  // 2. Validate archive
  console.log("Validating backup archive...");
  const validation = await BackupService.inspectAndValidateArchive(fullBackup.buffer);
  if (!validation.isValid || !validation.checksumsValid) {
    throw new Error("Backup archive validation failed: " + JSON.stringify(validation.errors));
  }
  console.log(`✅ Backup archive validated successfully! Total records captured: ${validation.totalRecords}`);

  // 3. Raw JSON snapshot of all 21 models for additional human-readable safety
  console.log("Generating raw JSON dump of all 21 tables...");
  const rawData: Record<string, any[]> = {};
  for (const meta of ALL_MODELS_META) {
    // @ts-ignore
    const rows = await db[meta.modelName.charAt(0).toLowerCase() + meta.modelName.slice(1)].findMany();
    rawData[meta.modelName] = rows;
  }

  const jsonFilename = `essar-production-before-reconciliation-${timestampStr}.json`;
  const jsonPath = path.join(backupDir, jsonFilename);
  fs.writeFileSync(jsonPath, JSON.stringify(rawData, null, 2), "utf-8");
  console.log(`Saved raw JSON dump to: ${jsonPath}`);

  console.log("\n=================================================");
  console.log("BACKUP COMPLETED AND VERIFIED SUCCESSFULLY");
  console.log(`Archive: ${zipFilename}`);
  console.log(`JSON:    ${jsonFilename}`);
  console.log("=================================================\n");

  await db.$disconnect();
}

createPreMigrationBackup().catch(err => {
  console.error("❌ Backup failed:", err);
  process.exit(1);
});
