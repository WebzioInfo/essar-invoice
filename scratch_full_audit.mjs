import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const dbUrl = process.env.DATABASE_URL || "mysql://db43250:WebzioWeb@db43250.public.databaseasp.net:3306/db43250";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=60'
    }
  }
});

function safeJson(obj) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );
}

async function runAudit() {
  const report = {};

  try {
    console.log("--> Step 1: DB Info...");
    const dbName = await prisma.$queryRaw`SELECT DATABASE() as db;`;
    const version = await prisma.$queryRaw`SELECT VERSION() as ver;`;
    const vars = await prisma.$queryRaw`SHOW VARIABLES WHERE Variable_name IN ('character_set_database', 'collation_database', 'default_storage_engine', 'time_zone');`;
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME, TABLE_COLLATION, ENGINE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE();
    `;
    const views = await prisma.$queryRaw`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE();`;
    const routines = await prisma.$queryRaw`SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE();`;
    const triggers = await prisma.$queryRaw`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();`;
    const events = await prisma.$queryRaw`SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE();`;
    const fkConstraints = await prisma.$queryRaw`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;
    `;
    const indexStats = await prisma.$queryRaw`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX, CARDINALITY, NULLABLE, INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE();
    `;

    report.step1 = {
      dbName: dbName[0]?.db,
      version: version[0]?.ver,
      vars,
      tables,
      viewsCount: views.length,
      views,
      routinesCount: routines.length,
      routines,
      triggersCount: triggers.length,
      triggers,
      eventsCount: events.length,
      events,
      fkConstraints,
      indexStats
    };

    console.log("--> Step 2 & 3: Columns Inventory...");
    const columns = await prisma.$queryRaw`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `;
    report.columns = columns;

    console.log("--> Step 4 & 5: Raw Table Data Extraction...");
    const tableNames = tables.map(t => t.TABLE_NAME);
    report.tablesData = {};

    for (const t of tableNames) {
      try {
        console.log(`Extracting raw data from table: ${t}`);
        const rows = await prisma.$queryRawUnsafe(`SELECT * FROM \`${t}\``);
        report.tablesData[t] = rows;
      } catch (e) {
        console.error(`Error querying table ${t}:`, e.message);
        report.tablesData[t] = { error: e.message };
      }
    }

    fs.writeFileSync('audit_data_raw.json', safeJson(report));
    console.log("--> Audit Raw Data written successfully to audit_data_raw.json");

  } catch (err) {
    console.error("Fatal Audit Execution Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
