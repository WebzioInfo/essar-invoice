import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('audit_data_raw.json', 'utf8'));

console.log("Keys in raw:", Object.keys(raw));
console.log("Tables in raw tablesData:", Object.keys(raw.tablesData));

for (const [tbl, rows] of Object.entries(raw.tablesData)) {
  console.log(`Table '${tbl}': ${Array.isArray(rows) ? rows.length : 'error'} rows`);
}
