import { db } from "../src/db/prisma/client";
import { Prisma } from "@prisma/client";
import { BackupService } from "../src/features/data-management/services/BackupService";
import { BackupValidator } from "../src/lib/backup/validation";
import { serializeRecord } from "../src/lib/backup/serializer";
import { deserializeValue } from "../src/lib/backup/deserializer";
import { ALL_MODELS_META } from "../src/lib/backup/dependencyGraph";

async function runBackupRestoreTestSuite() {
    console.log("=================================================");
    console.log("TESTING DATA BACKUP & DISASTER RECOVERY SUITE");
    console.log("=================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, msg: string) {
        if (condition) {
            console.log(`✅ [PASS] ${msg}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${msg}`);
            failed++;
        }
    }

    // -------------------------------------------------------------
    // TEST 1: Check Database Model Coverage (All 21 Models)
    // -------------------------------------------------------------
    console.log("--- TEST 1: Database Model Coverage ---");
    assert(ALL_MODELS_META.length === 21, `All 21 Prisma models registered in dependency graph (got ${ALL_MODELS_META.length})`);

    const stats = await BackupService.getDatabaseStats();
    assert(Object.keys(stats.modelCounts).length === 21, `Database health stats covers all 21 models (total records: ${stats.totalRecords})`);

    // -------------------------------------------------------------
    // TEST 2: Full Backup Generation (.essar-backup ZIP)
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Full Backup Generation ---");
    const mockUser = { id: "test-user-id", name: "System Admin", email: "admin@essar.com" };
    const fullBackup = await BackupService.createBackup(mockUser, "FULL");

    assert(fullBackup.buffer.byteLength > 1000, `Backup ZIP generated (${fullBackup.byteLength} bytes)`);
    assert(fullBackup.fileName.startsWith("ESSAR_BACKUP_"), `File name correctly formatted: ${fullBackup.fileName}`);
    assert(fullBackup.manifest.format === "ESSAR_ERP_BACKUP", `Manifest format identifier matches: ${fullBackup.manifest.format}`);
    assert(fullBackup.manifest.includedModels.length === 21, `Manifest includes all 21 models`);

    // -------------------------------------------------------------
    // TEST 3: Validation of Generated Backup Archive
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Backup Archive Validation ---");
    const validation = await BackupService.inspectAndValidateArchive(fullBackup.buffer);

    assert(validation.isValid === true, "Validation engine verifies backup archive as 100% valid");
    assert(validation.formatValid === true, "Format validation passed");
    assert(validation.checksumsValid === true, "SHA-256 Checksums verified successfully");
    assert(validation.totalRecords === fullBackup.totalRecords, `Total records match: ${validation.totalRecords}`);

    // -------------------------------------------------------------
    // TEST 4: Tamper / Corruption Detection
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Tamper & Corruption Detection ---");
    const corruptedBuffer = Buffer.from("CORRUPTED_NON_ZIP_DATA");

    const corruptedValidation = await BackupService.inspectAndValidateArchive(corruptedBuffer);
    assert(corruptedValidation.isValid === false, "Validation engine correctly rejects invalid/corrupted archive");

    // -------------------------------------------------------------
    // TEST 5: Lossless Decimal, Date, and Enum Serialization
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Lossless Serialization ---");
    const testDecimal = new Prisma.Decimal("1234567.89");
    const testDate = new Date("2026-08-23T10:30:00.000Z");

    const serializedDecimal = serializeRecord(testDecimal);
    assert(serializedDecimal.$decimal === "1234567.89", `Decimal serialized without float rounding ($decimal: ${serializedDecimal.$decimal})`);

    const deserializedDecimal = deserializeValue(serializedDecimal);
    assert(deserializedDecimal instanceof Prisma.Decimal && deserializedDecimal.toString() === "1234567.89", "Decimal deserialized accurately back to Prisma.Decimal");

    const serializedDate = serializeRecord(testDate);
    assert(serializedDate.$date === "2026-08-23T10:30:00.000Z", "Date serialized to exact ISO string");

    const deserializedDate = deserializeValue(serializedDate);
    assert(deserializedDate instanceof Date && deserializedDate.toISOString() === "2026-08-23T10:30:00.000Z", "Date deserialized accurately back to Date object");

    // -------------------------------------------------------------
    // TEST 6: Selective Backup Generation
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Selective Backup Generation ---");
    const selectiveBackup = await BackupService.createBackup(mockUser, "SELECTIVE", ["Client", "Product", "Invoice"]);
    assert(selectiveBackup.manifest.includedModels.length === 3, `Selective manifest contains exactly 3 models: ${selectiveBackup.manifest.includedModels.join(", ")}`);

    const selectiveValidation = await BackupService.inspectAndValidateArchive(selectiveBackup.buffer);
    assert(selectiveValidation.isValid === true, "Selective backup archive validated successfully");

    // -------------------------------------------------------------
    // TEST 7: Safe Merge Restoration Simulation
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Safe Merge Restoration ---");
    const restoreResult = await BackupService.restoreFromArchive(fullBackup.buffer, "SAFE_MERGE", mockUser);
    assert(restoreResult.success === true, `Safe Merge restoration executed with success = true`);
    assert(restoreResult.totalProcessed === fullBackup.totalRecords, `Processed all ${fullBackup.totalRecords} records`);
    assert(restoreResult.verificationReport.isVerified === true, "Post-restore verification report 100% verified");

    console.log(`\n=================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=================================================`);

    if (failed > 0) {
        process.exit(1);
    }
}

runBackupRestoreTestSuite().catch(e => {
    console.error("Test execution failed:", e);
    process.exit(1);
});
