// scripts/sync_d1_diff.mjs
// EatSafe HK - Automated Daily Incremental Diff Synchronization for Cloudflare D1
// 1. Fetches official daily FEHD open datasets (EN + TC) and suspensions
// 2. Reads the current rows straight from D1 (the source of truth, so no baseline file can drift)
// 3. Geocodes new / moved addresses with the HKSAR Address Lookup Service; unchanged addresses keep
//    the coordinates already stored in D1
// 4. Writes ONLY the changed columns of changed rows, plus inserts and deletes
//
// Usage: node scripts/sync_d1_diff.mjs [--dry-run] [--local]
//   --dry-run  compute and report the diff, write nothing
//   --local    read from / write to the local wrangler D1 (for testing) instead of --remote

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fetchAndParseAllFehdRecords } from "../lib/fehd-sync.mjs";
import { geocodeMany, addressKey, isGeocodable } from "../lib/geocode.mjs";

const isDryRun = process.argv.includes("--dry-run");
const retryNullCoords = process.argv.includes("--retry-null-coords");
const target = process.argv.includes("--local") ? "--local" : "--remote";
const DB_NAME = "eatsafe-hk-db";

// Columns that come from FEHD + derived data; compared field by field against D1
const DATA_COLUMNS = [
  "type", "district", "name_en", "address_en", "expiry_date",
  "status", "demerit_points", "past_violations", "suspension_details",
  "category", "endorsements", "name_tc", "address_tc", "lat", "lng",
];
const SUSPENSION_COLUMNS = ["status", "demerit_points", "past_violations", "suspension_details"];
const PLACEHOLDER_LAT = 22.3193;
const PLACEHOLDER_LNG = 114.1694;
const STATEMENTS_PER_FILE = 4000;

// Resume cache so an interrupted first-time backfill does not have to re-query ALS from scratch
const GEOCODE_CACHE_PATH = path.join(process.cwd(), ".geocode_cache.json");

function escapeSql(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Run wrangler's JS entry with this Node binary (no shell), so SQL arguments are never re-split
const WRANGLER_BIN = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function wrangler(args, retries = 4) {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return execFileSync(process.execPath, [WRANGLER_BIN, "d1", "execute", DB_NAME, target, ...args], {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        stdio: ["ignore", "pipe", "inherit"],
      });
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delayMs = 2000 * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [D1 Sync] Wrangler command attempt ${attempt}/${retries} failed (${err.message}). Retrying in ${delayMs}ms...`);
        sleepSync(delayMs);
      }
    }
  }
  throw lastErr;
}

function queryD1(sql) {
  const out = wrangler(["--json", `--command=${sql}`]);
  const parsed = JSON.parse(out.slice(out.indexOf("[")));
  return parsed[0]?.results || [];
}

function readAllD1Rows() {
  const rows = [];
  let after = "";
  for (;;) {
    const page = queryD1(
      `SELECT license_no, ${DATA_COLUMNS.join(", ")} FROM restaurants WHERE license_no > '${after.replace(/'/g, "''")}' ORDER BY license_no LIMIT 5000`
    );
    // Local wrangler returns SQL NULL in REAL columns as the string "null"; normalise numerics
    for (const row of page) {
      for (const c of ["lat", "lng", "demerit_points"]) {
        const n = row[c] === null || row[c] === "null" || row[c] === "" ? null : Number(row[c]);
        row[c] = Number.isFinite(n) ? n : null;
      }
    }
    rows.push(...page);
    if (page.length < 5000) break;
    after = page[page.length - 1].license_no;
  }
  return rows;
}

function hasPlaceholderCoords(row) {
  return (
    row &&
    row.lat != null &&
    row.lng != null &&
    Number(row.lat) === PLACEHOLDER_LAT &&
    Number(row.lng) === PLACEHOLDER_LNG
  );
}

function hasRealCoords(row) {
  return row && row.lat != null && row.lng != null && !hasPlaceholderCoords(row);
}

function sameValue(a, b) {
  if ((a === null || a === undefined || a === "") && (b === null || b === undefined || b === "")) return true;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a) === String(b);
}

function loadGeocodeCache() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(GEOCODE_CACHE_PATH, "utf8"))));
  } catch (_) {
    return new Map();
  }
}

function saveGeocodeCache(cache) {
  fs.writeFileSync(GEOCODE_CACHE_PATH, JSON.stringify(Object.fromEntries(cache)), "utf8");
}

async function runDiffSync() {
  console.log(`🚀 [EatSafe HK] Starting incremental sync for Cloudflare D1 (${target.slice(2)})...`);
  if (isDryRun) console.log("🔍 DRY-RUN mode: no database changes will be executed.");

  // 1. Fetch and parse latest FEHD data
  const t0 = Date.now();
  const { items, generationDate, suspensionScrapeOk } = await fetchAndParseAllFehdRecords();
  console.log(`📥 Processed ${items.length} premises from FEHD in ${((Date.now() - t0) / 1000).toFixed(1)}s (Master Gen Date: ${generationDate}).`);
  if (items.length < 25000) {
    throw new Error(`CRITICAL: FEHD dataset returned only ${items.length} records (< 25,000 threshold). Aborting sync to prevent data truncation.`);
  }
  if (!suspensionScrapeOk) {
    console.warn("⚠️ FEHD suspension table could not be scraped; existing suspension data in D1 will be kept.");
  }

  // 2. Current D1 state
  const t1 = Date.now();
  const existingRows = readAllD1Rows();
  const existing = new Map(existingRows.map((r) => [r.license_no, r]));
  console.log(`🗄️  Read ${existingRows.length} rows from D1 in ${((Date.now() - t1) / 1000).toFixed(1)}s.`);

  // Coordinates already in D1, keyed by address, are reused for any licence at the same address
  const knownCoords = new Map();
  for (const r of existingRows) {
    if (hasRealCoords(r)) knownCoords.set(addressKey(r.address_en), { lat: Number(r.lat), lng: Number(r.lng) });
  }

  // 3. Merge preserved suspension data and coordinates
  const geocodeCache = loadGeocodeCache();
  const needGeocode = [];
  for (const r of items) {
    const prev = existing.get(r.license_no);
    if (!suspensionScrapeOk && prev) {
      for (const c of SUSPENSION_COLUMNS) r[c] = prev[c];
    }
    if (!isGeocodable(r)) continue;
    const k = addressKey(r.address_en);
    const known = knownCoords.get(k) || geocodeCache.get(k);
    if (known) {
      r.lat = known.lat;
      r.lng = known.lng;
    } else if (!geocodeCache.has(k)) {
      // Only query ALS for newly added premises, premises whose address changed, or legacy placeholder
      // rows (unless --retry-null-coords is passed) so un-geocodable addresses aren't retried daily.
      const alreadyAttemptedInD1 =
        prev && addressKey(prev.address_en) === k && !hasPlaceholderCoords(prev);
      if (!alreadyAttemptedInD1 || retryNullCoords) {
        needGeocode.push(r);
      }
    }
  }

  if (needGeocode.length > 0) {
    const unique = new Set(needGeocode.map((r) => addressKey(r.address_en))).size;
    console.log(`🧭 Geocoding ${unique} new/changed addresses with the HK Address Lookup Service...`);
    const t2 = Date.now();
    let sinceSave = 0;
    const results = await geocodeMany(needGeocode, {
      concurrency: 6,
      onProgress: (done, total) => {
        console.log(`   ${done}/${total} addresses (${((Date.now() - t2) / 1000).toFixed(0)}s)`);
        if (++sinceSave >= 4) {
          sinceSave = 0;
          saveGeocodeCache(geocodeCache);
        }
      },
      onResult: (k, v) => geocodeCache.set(k, v),
    });
    saveGeocodeCache(geocodeCache);
    let accepted = 0;
    for (const v of results.values()) if (v) accepted++;
    console.log(`🧭 Geocoded ${results.size} addresses (${accepted} accepted) in ${((Date.now() - t2) / 1000).toFixed(0)}s.`);
    for (const r of needGeocode) {
      const g = geocodeCache.get(addressKey(r.address_en));
      if (g) {
        r.lat = g.lat;
        r.lng = g.lng;
      }
    }
  }

  // 4. Diff
  const statements = [];
  let inserted = 0;
  let updated = 0;
  const columnChangeCounts = {};
  const seen = new Set();

  for (const r of items) {
    seen.add(r.license_no);
    const prev = existing.get(r.license_no);
    if (!prev) {
      inserted++;
      statements.push(
        `INSERT INTO restaurants (license_no, ${DATA_COLUMNS.join(", ")}, updated_at) VALUES (${escapeSql(r.license_no)}, ${DATA_COLUMNS.map((c) => escapeSql(r[c])).join(", ")}, CURRENT_TIMESTAMP);`
      );
      continue;
    }
    const changed = DATA_COLUMNS.filter((c) => !sameValue(prev[c], r[c]));
    if (changed.length === 0) continue;
    updated++;
    for (const c of changed) columnChangeCounts[c] = (columnChangeCounts[c] || 0) + 1;
    // Only the changed columns are SET, so the FTS update trigger (migration 0004) fires only when a
    // searchable column actually changed
    statements.push(
      `UPDATE restaurants SET ${changed.map((c) => `${c} = ${escapeSql(r[c])}`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE license_no = ${escapeSql(r.license_no)};`
    );
  }

  const deleted = existingRows.filter((r) => !seen.has(r.license_no)).map((r) => r.license_no);
  for (const lic of deleted) statements.push(`DELETE FROM restaurants WHERE license_no = ${escapeSql(lic)};`);

  const today = new Date().toISOString().slice(0, 10);
  statements.push(
    `INSERT OR REPLACE INTO sync_metadata (id, last_sync_date, generation_date, total_records, updated_at) VALUES ('fehd_master', ${escapeSql(today)}, ${escapeSql(generationDate)}, ${items.length}, CURRENT_TIMESTAMP);`
  );

  const withCoords = items.filter((r) => r.lat != null).length;
  console.log("\n📊 [FEHD Diff Summary]:");
  console.log(`   ✨ New premises: ${inserted}`);
  console.log(`   🔄 Updated premises: ${updated} ${JSON.stringify(columnChangeCounts)}`);
  console.log(`   ❌ Removed (no longer licensed): ${deleted.length}`);
  console.log(`   📍 Premises with coordinates: ${withCoords}/${items.length}`);
  console.log(`   ⚡ Statements to apply: ${statements.length}`);

  if (isDryRun) {
    for (const s of statements.slice(0, 5)) console.log(`   sample: ${s.slice(0, 220)}`);
    console.log("🔍 Dry run complete. Nothing written.");
    return;
  }

  // 5. Apply in chunks (D1 has per-request size limits). Each statement is idempotent, so a failed
  //    chunk can simply be retried by re-running the sync.
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), ".d1sync-"));
  try {
    for (let i = 0; i < statements.length; i += STATEMENTS_PER_FILE) {
      const file = path.join(tmpDir, `chunk_${String(i / STATEMENTS_PER_FILE).padStart(3, "0")}.sql`);
      fs.writeFileSync(file, statements.slice(i, i + STATEMENTS_PER_FILE).join("\n"), "utf8");
      console.log(`☁️  Applying statements ${i + 1}-${Math.min(i + STATEMENTS_PER_FILE, statements.length)} of ${statements.length}...`);
      wrangler(["--yes", `--file=${file}`]);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log("🎉 [EatSafe HK] Cloudflare D1 synchronization finished successfully!");
}

runDiffSync().catch((err) => {
  console.error("❌ Fatal sync error:", err);
  process.exit(1);
});
