import { PrismaClient } from '@prisma/client';

const dbUrl = process.env.DATABASE_URL || "mysql://db43250:WebzioWeb@db43250.public.databaseasp.net:3306/db43250";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=45'
    }
  }
});

async function main() {
  console.log("=== STEP 1: DATABASE INFORMATION ===");
  try {
    const dbName = await prisma.$queryRaw`SELECT DATABASE() as db;`;
    console.log("Database Name:", dbName);

    const version = await prisma.$queryRaw`SELECT VERSION() as ver;`;
    console.log("Version:", version);

    const vars = await prisma.$queryRaw`SHOW VARIABLES WHERE Variable_name IN ('character_set_database', 'collation_database', 'default_storage_engine', 'time_zone');`;
    console.log("Variables:", vars);

    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME, TABLE_COLLATION, ENGINE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE();
    `;
    console.log("Tables info:", JSON.stringify(tables, null, 2));

    const views = await prisma.$queryRaw`
      SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE();
    `;
    console.log("Views count:", views);

    const procedures = await prisma.$queryRaw`
      SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE();
    `;
    console.log("Routines:", procedures);

    const triggers = await prisma.$queryRaw`
      SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE();
    `;
    console.log("Triggers:", triggers);

  } catch (err) {
    console.error("Error fetching Step 1 info:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
