// scripts/generate_snapshot.mjs
// Generates compact baseline snapshot from current local database for fast daily diffing
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { findD1SqliteFile } from "../lib/fehd-sync.mjs";

const dbPath = findD1SqliteFile();
console.log("Reading baseline records from:", dbPath);
const db = new DatabaseSync(dbPath, { readOnly: true });

const rows = db.prepare(`
  SELECT license_no, type, district, name_en, address_en, expiry_date, status, suspension_details, category, endorsements, name_tc, address_tc
  FROM restaurants
`).all();

const snapshot = {};
for (const r of rows) {
  snapshot[r.license_no] = {
    expiry_date: r.expiry_date,
    status: r.status,
    name_en: r.name_en,
    address_en: r.address_en,
    type: r.type,
    district: r.district,
    category: r.category,
    endorsements: r.endorsements,
    name_tc: r.name_tc,
    address_tc: r.address_tc,
  };
}

const outPath = path.join(process.cwd(), "fehd_snapshot.json");
fs.writeFileSync(outPath, JSON.stringify(snapshot), "utf8");
const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log(`✅ Exported ${rows.length} baseline records to fehd_snapshot.json (${sizeMb} MB)`);
db.close();
