// scripts/build_hashes.mjs
// Builds the initial fehd_hashes.json from current baseline data
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { findD1SqliteFile } from "../lib/fehd-sync.mjs";

const dbPath = findD1SqliteFile();
console.log("Reading baseline records from:", dbPath);
const db = new DatabaseSync(dbPath, { readOnly: true });

const rows = db.prepare(`
  SELECT license_no, expiry_date, status, name_en, address_en, name_tc, address_tc
  FROM restaurants
`).all();

function computeHash(r) {
  return crypto
    .createHash("md5")
    .update(`${r.expiry_date}|${r.status}|${r.name_en}|${r.address_en}|${r.name_tc || ""}|${r.address_tc || ""}`)
    .digest("hex")
    .slice(0, 12);
}

const hashes = {};
for (const r of rows) {
  hashes[r.license_no] = computeHash(r);
}

const outPath = path.join(process.cwd(), "fehd_hashes.json");
fs.writeFileSync(outPath, JSON.stringify(hashes), "utf8");
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`✅ Generated fehd_hashes.json with ${rows.length} hashes (${sizeKb} KB)`);
db.close();
