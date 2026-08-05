import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audit_data_raw.json', 'utf8'));

console.log("=== DB INFO ===");
console.log("DB Name:", data.step1.dbName);
console.log("Version:", data.step1.version);
console.log("Variables:", data.step1.vars);

console.log("\n=== TABLES SUMMARY ===");
data.step1.tables.forEach(t => {
  const rowCount = data.tablesData[t.TABLE_NAME] ? data.tablesData[t.TABLE_NAME].length : 'N/A';
  console.log(`${t.TABLE_NAME.padEnd(25)} | Rows in IS: ${t.TABLE_ROWS?.toString().padEnd(6)} | Real Count: ${rowCount} | Data MB: ${(Number(t.DATA_LENGTH)/1024/1024).toFixed(3)} | Index MB: ${(Number(t.INDEX_LENGTH)/1024/1024).toFixed(3)} | Engine: ${t.ENGINE}`);
});

console.log("\n=== FK CONSTRAINTS ===");
console.log(data.step1.fkConstraints);

console.log("\n=== USERS TABLE DATA ===");
console.log(data.tablesData.users);

console.log("\n=== COMPANY SETTINGS ===");
console.log(data.tablesData.company_settings);
