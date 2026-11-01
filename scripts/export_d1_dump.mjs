// scripts/export_d1_dump.mjs
// Exports the local SQLite database into SQL batch files formatted for Cloudflare D1

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { findD1SqliteFile } from '../lib/fehd-sync.mjs';

const dbPath = findD1SqliteFile();
if (!dbPath) {
  console.error('❌ Could not find local SQLite database file.');
  process.exit(1);
}

console.log(`📖 Reading local database from: ${dbPath}`);
const db = new DatabaseSync(dbPath, { readOnly: true });

const rows = db.prepare('SELECT * FROM restaurants').all();
console.log(`📊 Found ${rows.length} restaurant records to export.`);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

const outDir = path.join(process.cwd(), 'd1_export');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Split into batches of 1,000 to comply with Cloudflare D1 statement execution size limits
const BATCH_SIZE = 1000;
let fileIndex = 1;

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  const sqlLines = ['BEGIN TRANSACTION;'];

  for (const r of batch) {
    sqlLines.push(
      `INSERT OR REPLACE INTO restaurants (license_no, type, district, name_en, address_en, expiry_date, status, demerit_points, past_violations, suspension_details, category, endorsements, name_tc, address_tc, lat, lng, updated_at) VALUES (${escapeSql(r.license_no)}, ${escapeSql(r.type)}, ${escapeSql(r.district)}, ${escapeSql(r.name_en)}, ${escapeSql(r.address_en)}, ${escapeSql(r.expiry_date)}, ${escapeSql(r.status)}, ${escapeSql(r.demerit_points)}, ${escapeSql(r.past_violations)}, ${escapeSql(r.suspension_details)}, ${escapeSql(r.category)}, ${escapeSql(r.endorsements)}, ${escapeSql(r.name_tc)}, ${escapeSql(r.address_tc)}, ${escapeSql(r.lat)}, ${escapeSql(r.lng)}, ${escapeSql(r.updated_at)});`
    );
  }

  sqlLines.push('COMMIT;');
  const fileName = `batch_${String(fileIndex).padStart(2, '0')}.sql`;
  fs.writeFileSync(path.join(outDir, fileName), sqlLines.join('\n'), 'utf8');
  fileIndex++;
}

console.log(`✅ Exported ${rows.length} records into ${fileIndex - 1} SQL batch files in ./d1_export/`);
console.log('💡 To import a batch into remote Cloudflare D1:');
console.log('   npx wrangler d1 execute eatsafe-hk-db --remote --file=./d1_export/batch_01.sql');
