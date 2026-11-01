import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";

export const FEHD_FEEDS = {
  restaurants_en: "https://www.fehd.gov.hk/english/licensing/license/text/LP_Restaurants_EN.XML",
  other_food_en: "https://www.fehd.gov.hk/english/licensing/license/text/LP_OtherFood_EN.XML",
  permits_en: "https://www.fehd.gov.hk/english/licensing/license/text/LP_Permits_EN.XML",
  restaurants_tc: "https://www.fehd.gov.hk/tc_chi/licensing/license/text/LP_Restaurants_TC.XML",
  other_food_tc: "https://www.fehd.gov.hk/tc_chi/licensing/license/text/LP_OtherFood_TC.XML",
  permits_tc: "https://www.fehd.gov.hk/tc_chi/licensing/license/text/LP_Permits_TC.XML",
};

export const FEHD_SUSPENSIONS_URL = "https://www.fehd.gov.hk/english/licensing/list_premises_suspended.html";

export const CODE_TO_DISTRICT = {
  "11": "EASTERN",
  "12": "WAN CHAI",
  "15": "SOUTHERN",
  "17": "ISLANDS",
  "18": "CENTRAL/WESTERN",
  "31": "FOOD TRUCK",
  "51": "KWUN TONG",
  "52": "KOWLOON CITY",
  "53": "WONG TAI SIN",
  "61": "YAU TSIM",
  "62": "MONG KOK",
  "63": "SHAM SHUI PO",
  "91": "KWAI TSING",
  "92": "TSUEN WAN",
  "93": "TUEN MUN",
  "94": "YUEN LONG",
  "95": "TAI PO",
  "96": "NORTH",
  "97": "SHA TIN",
  "98": "SAI KUNG",
};

export const CODE_TO_TYPE = {
  // Restaurant Licences
  RL: "General Restaurant Licence",
  RR: "Light Refreshment Restaurant Licence",
  MR: "Marine Restaurant Licence",

  // Other Food Licences (including Bakeries)
  FB: "Bakery Licence",
  FF: "Food Factory Licence",
  FE: "Factory Canteen Licence",
  FP: "Fresh Provision Shop Licence",
  FS: "Siu Mei and Lo Mei Shop Licence",
  FC: "Cold Store Licence",
  FG: "Frozen Confection Factory Licence",
  FM: "Milk Factory Licence",
  CL: "Composite Food Shop Licence",

  // Restricted Food Permits
  XS: "Sushi and/or Sashimi Permit",
  XO: "Oyster to be Eaten in Raw State Permit",
  IG: "Frozen Confections Permit",
  XM: "Milk Permit",
  IB: "Non-Bottled Drinks Permit",
  IT: "Chinese Herb Tea Permit",
  XC: "Cut Fruit Permit",
  IS: "Shell Fish (Hairy Crab) Permit",
  XF: "Fish and/or Shell Fish Permit",
  IC: "Permit to Sell Food by Vending Machine",
  IP: "Restricted Food Permit",
  XL: "Leung Fan Permit",
  XZ: "Online Sale of Restricted Food Permit",
};

export const INFO_CODE_MAP = {
  "#A": "Outside Seating Accommodation",
  "#B": "Karaoke Establishment Permit",
  "#C": "Karaoke Exemption Order",
  "#D": "ISO 22000 Certified Hygiene System",
  "#E": "Sale of Raw Meat for Consumption",
  "#F": "Sale of Raw Oysters for Consumption",
  "#G": "Sale of Sashimi for Consumption",
  "#H": "Sale of Sushi for Consumption",
};

export function determineCategory(typeCode) {
  if (["RL", "RR", "MR", "FE"].includes(typeCode)) {
    return "List of Licensed Restaurants and Factory Canteens";
  }
  if (["FB", "FF", "FP", "FS", "FC", "FG", "FM", "CL"].includes(typeCode)) {
    return "List of Licensed Food Premises (excluding Restaurants and Factory Canteens)";
  }
  if (["XZ"].includes(typeCode)) {
    return "List of Permitted Premises for Online Sale of Restricted Foods";
  }
  return "List of Permitted Premises for the Sale of Restricted Foods";
}

export function unescapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Suspension matching
// FEHD's suspended-premises table has no licence number column, so a record can only be tied to
// a licence by trade name AND address. Matching on either alone (the previous behaviour) caused
// thousands of unrelated premises to inherit someone else's suspension, so both must agree.
// ---------------------------------------------------------------------------
const ADDRESS_ABBREVIATIONS = [
  [/\brd\b/g, "road"],
  [/\bst\b/g, "street"],
  [/\bave?\b/g, "avenue"],
  [/\bbldg\b/g, "building"],
  [/\bctr\b/g, "centre"],
  [/\bcenter\b/g, "centre"],
  [/\bflr?\b/g, "floor"],
  [/\bno\b|\bnos\b/g, ""],
];

export function normalizeNameForMatch(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
}

export function addressTokensForMatch(str) {
  let s = String(str || "").toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9\u4e00-\u9fa5\s/-]/g, " ");
  for (const [re, rep] of ADDRESS_ABBREVIATIONS) s = s.replace(re, rep);
  return s
    .split(/\s+/)
    .map((t) => t.replace(/^[-/]+|[-/]+$/g, ""))
    .filter((t) => t.length > 0 && !["hong", "kong", "kowloon", "new", "territories"].includes(t));
}

export function addressSimilarity(a, b) {
  const ta = new Set(addressTokensForMatch(a));
  const tb = new Set(addressTokensForMatch(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/**
 * Returns every suspension record that belongs to the given premises (newest-first order of the
 * source table is preserved). A record matches only when the trade name is identical (English or
 * Traditional Chinese, ignoring case/punctuation) AND the addresses are substantially the same.
 */
export function matchSuspensionRecords({ nameEn, nameTc, addressEn, addressTc }, suspensionRecords) {
  const nEn = normalizeNameForMatch(nameEn);
  const nTc = normalizeNameForMatch(nameTc);
  if (!nEn && !nTc) return [];
  const matches = [];
  for (const s of suspensionRecords) {
    const sName = normalizeNameForMatch(s.name);
    if (!sName || sName.length < 2) continue;
    // "No Record" is FEHD's placeholder for a missing trade name, never evidence of identity
    if (sName === "norecord") continue;
    if (sName !== nEn && sName !== nTc) continue;
    const sim = Math.max(addressSimilarity(s.address, addressEn), addressTc ? addressSimilarity(s.address, addressTc) : 0);
    if (sim >= 0.75) matches.push(s);
  }
  return matches;
}

export function findD1SqliteFile() {
  const d1Dir = path.join(process.cwd(), ".wrangler", "state", "v3", "d1");
  if (!fs.existsSync(d1Dir)) return null;

  const sqliteFiles = [];
  function search(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        search(full);
      } else if (entry.isFile() && entry.name.endsWith(".sqlite")) {
        try {
          const stats = fs.statSync(full);
          sqliteFiles.push({ path: full, size: stats.size });
        } catch (e) {
          // ignore
        }
      }
    }
  }
  search(d1Dir);

  // Sort descending by size to prioritize populated database
  sqliteFiles.sort((a, b) => b.size - a.size);

  for (const item of sqliteFiles) {
    try {
      const db = new DatabaseSync(item.path, { readOnly: true });
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='restaurants'").get();
      db.close();
      if (row) {
        return item.path;
      }
    } catch (e) {
      // ignore
    }
  }

  return sqliteFiles[0]?.path || null;
}

export async function fetchAndParseAllFehdRecords() {
  console.log("📡 [FEHD Sync] Fetching all 6 official FEHD feeds (Restaurants, OtherFood/Bakeries, Permits - EN & TC)...");
  const t0 = Date.now();

  const fetchFeed = async (url) => {
    const r = await fetch(url, { headers: { "User-Agent": "EatSafeHK-Sync/2.0" } });
    if (!r.ok) throw new Error(`FEHD feed ${url} returned HTTP ${r.status}`);
    return r.text();
  };

  const [resRestEN, resOtherEN, resPermitEN, resRestTC, resOtherTC, resPermitTC] = await Promise.all([
    fetchFeed(FEHD_FEEDS.restaurants_en),
    fetchFeed(FEHD_FEEDS.other_food_en),
    fetchFeed(FEHD_FEEDS.permits_en),
    fetchFeed(FEHD_FEEDS.restaurants_tc),
    fetchFeed(FEHD_FEEDS.other_food_tc),
    fetchFeed(FEHD_FEEDS.permits_tc),
  ]);

  console.log(`📡 [FEHD Sync] Downloaded all feeds in ${((Date.now() - t0) / 1000).toFixed(2)}s. Scraping active suspensions...`);

  const suspensionRecords = [];
  let suspensionScrapeOk = false;
  try {
    const suspRes = await fetch(FEHD_SUSPENSIONS_URL, { headers: { "User-Agent": "EatSafeHK-Sync/2.0" } });
    if (suspRes.ok) {
      const suspHtml = await suspRes.text();
      const $ = cheerio.load(suspHtml);
      $("table tr").each((i, row) => {
        const cells = $(row)
          .find("td")
          .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
          .get();
        if (cells.length >= 5 && /\d{2}-\d{2}-\d{4}/.test(cells[4])) {
          suspensionRecords.push({
            district: cells[0] || "",
            type: cells[1] || "",
            address: cells[2] || "",
            name: cells[3] || "",
            period: cells[4] || "",
          });
        }
      });
      suspensionScrapeOk = suspensionRecords.length > 0;
    }
  } catch (err) {
    console.warn(`⚠️ Warning fetching suspension records: ${err.message}`);
  }

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", processEntities: false });
  const pRestEN = parser.parse(resRestEN);
  const pOtherEN = parser.parse(resOtherEN);
  const pPermitEN = parser.parse(resPermitEN);
  const pRestTC = parser.parse(resRestTC);
  const pOtherTC = parser.parse(resOtherTC);
  const pPermitTC = parser.parse(resPermitTC);

  const tcLookup = new Map();
  function addTcItems(parsedData) {
    const list = parsedData?.DATA?.LPS?.LP || [];
    const items = Array.isArray(list) ? list : [list];
    for (const item of items) {
      if (!item || !item.LICNO) continue;
      tcLookup.set(String(item.LICNO).trim(), {
        name_tc: unescapeXml(item.SS),
        address_tc: unescapeXml(item.ADR),
      });
    }
  }
  addTcItems(pRestTC);
  addTcItems(pOtherTC);
  addTcItems(pPermitTC);

  const allEnItems = [
    ...(Array.isArray(pRestEN?.DATA?.LPS?.LP) ? pRestEN.DATA.LPS.LP : [pRestEN?.DATA?.LPS?.LP]),
    ...(Array.isArray(pOtherEN?.DATA?.LPS?.LP) ? pOtherEN.DATA.LPS.LP : [pOtherEN?.DATA?.LPS?.LP]),
    ...(Array.isArray(pPermitEN?.DATA?.LPS?.LP) ? pPermitEN.DATA.LPS.LP : [pPermitEN?.DATA?.LPS?.LP]),
  ].filter(Boolean);

  const generationDate = String(pRestEN?.DATA?.GENERATION_DATE || new Date().toISOString().slice(0, 10));

  const items = [];
  for (let i = 0; i < allEnItems.length; i++) {
    const item = allEnItems[i];
    const licenseNo = String(item.LICNO || "").trim();
    if (!licenseNo) continue;

    const rawTypeCode = String(item.TYPE || "RL").trim();
    const rawDistCode = String(item.DIST || "18").trim();

    const type = CODE_TO_TYPE[rawTypeCode] || "General Restaurant Licence";
    const district = CODE_TO_DISTRICT[rawDistCode] || "CENTRAL/WESTERN";
    const category = determineCategory(rawTypeCode);

    const nameEn = unescapeXml(item.SS || "No Record");
    const addressEn = unescapeXml(item.ADR || "");
    const expiryDate = String(item.EXPDATE || "").trim();
    const rawInfo = String(item.INFO || "");

    const endorsementsList = [];
    for (const [code, desc] of Object.entries(INFO_CODE_MAP)) {
      if (rawInfo.includes(code)) {
        endorsementsList.push(desc);
      }
    }
    const endorsements = endorsementsList.join(", ");

    const tcInfo = tcLookup.get(licenseNo);
    const nameTc = tcInfo?.name_tc || null;
    const addressTc = tcInfo?.address_tc || null;

    let status = "CLEAN";
    let demeritPoints = 0;
    let pastViolations = null;
    let suspensionDetails = null;

    const matched = suspensionScrapeOk
      ? matchSuspensionRecords({ nameEn, nameTc, addressEn, addressTc }, suspensionRecords)
      : [];

    if (matched.length > 0) {
      const hkToday = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      const isoRange = (period) => {
        const m = period.match(/(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2})-(\d{2})-(\d{4})/);
        return m ? { start: `${m[3]}-${m[2]}-${m[1]}`, end: `${m[6]}-${m[5]}-${m[4]}` } : null;
      };
      const current = matched.find((s) => {
        const r = isoRange(s.period);
        return r && r.start <= hkToday && hkToday <= r.end;
      });
      const headline = current || matched[0];
      status = current ? "SUSPENDED" : "PREVIOUSLY_SUSPENDED";
      demeritPoints = current ? 15 : 0;
      suspensionDetails = `FEHD Statutory Suspension Order: Licence suspended from ${headline.period} under the Demerit Points System (Cap. 132X).`;
      pastViolations =
        matched.map((s) => `• FEHD Statutory Suspension Order: ${s.period}`).join("\n") +
        "\n• Source: FEHD published list of food premises with licences suspended / cancelled under the Demerit Points System.";
    }

    items.push({
      license_no: licenseNo,
      type,
      district,
      name_en: nameEn,
      address_en: addressEn,
      expiry_date: expiryDate,
      status,
      demerit_points: demeritPoints,
      past_violations: pastViolations,
      suspension_details: suspensionDetails,
      category,
      endorsements,
      name_tc: nameTc,
      address_tc: addressTc,
      // Coordinates are filled in by the geocoding step (lib/geocode.mjs); FEHD publishes none
      lat: null,
      lng: null,
    });
  }

  return { items, generationDate, suspensionScrapeOk };
}

let inFlightSync = null;
let lastSyncFailureAt = 0;
const SYNC_FAILURE_BACKOFF_MS = 10 * 60 * 1000;

/**
 * Single-flight wrapper: concurrent callers share one running sync, and an automatic (non-forced)
 * retry is suppressed for a while after a failure so a down FEHD site is not hammered per-request.
 */
export function performDailySync(force = false) {
  if (inFlightSync) return inFlightSync;
  if (!force && Date.now() - lastSyncFailureAt < SYNC_FAILURE_BACKOFF_MS) {
    return Promise.resolve({ status: "SKIPPED_RECENT_FAILURE" });
  }
  inFlightSync = runDailySync(force)
    .catch((err) => {
      lastSyncFailureAt = Date.now();
      throw err;
    })
    .finally(() => {
      inFlightSync = null;
    });
  return inFlightSync;
}

async function runDailySync(force = false) {
  const dbFile = findD1SqliteFile();
  if (!dbFile) {
    throw new Error("Local D1 SQLite database not found. Run wrangler migration first.");
  }

  const db = new DatabaseSync(dbFile);

  // Check last sync date
  let meta = null;
  try {
    meta = db.prepare("SELECT * FROM sync_metadata WHERE id = 'fehd_master'").get();
  } catch (e) {
    // metadata table will be created
  }

  const today = new Date().toISOString().slice(0, 10);

  if (!force && meta && meta.last_sync_date === today && meta.total_records > 25000) {
    console.log(`ℹ️ [FEHD Sync] Daily check: already synchronized today (${today}, Gen: ${meta.generation_date}, Total: ${meta.total_records}).`);
    db.close();
    return {
      status: "ALREADY_SYNCED",
      last_sync_date: meta.last_sync_date,
      generation_date: meta.generation_date,
      total_records: meta.total_records,
    };
  }

  console.log("📡 [FEHD Sync] Fetching all 6 official FEHD feeds (Restaurants, OtherFood/Bakeries, Permits - EN & TC)...");
  const t0 = Date.now();

  const fetchFeed = async (url) => {
    const r = await fetch(url, { headers: { "User-Agent": "EatSafeHK-Sync/2.0" } });
    if (!r.ok) throw new Error(`FEHD feed ${url} returned HTTP ${r.status}`);
    return r.text();
  };

  let resRestEN, resOtherEN, resPermitEN, resRestTC, resOtherTC, resPermitTC;
  try {
    [resRestEN, resOtherEN, resPermitEN, resRestTC, resOtherTC, resPermitTC] = await Promise.all([
      fetchFeed(FEHD_FEEDS.restaurants_en),
      fetchFeed(FEHD_FEEDS.other_food_en),
      fetchFeed(FEHD_FEEDS.permits_en),
      fetchFeed(FEHD_FEEDS.restaurants_tc),
      fetchFeed(FEHD_FEEDS.other_food_tc),
      fetchFeed(FEHD_FEEDS.permits_tc),
    ]);
  } catch (err) {
    db.close();
    throw err;
  }

  console.log(`📡 [FEHD Sync] Downloaded all feeds in ${((Date.now() - t0) / 1000).toFixed(2)}s. Scraping active suspensions...`);

  const suspensionRecords = [];
  let suspensionScrapeOk = false;
  try {
    const suspRes = await fetch(FEHD_SUSPENSIONS_URL, { headers: { "User-Agent": "EatSafeHK-Sync/2.0" } });
    if (suspRes.ok) {
      const suspHtml = await suspRes.text();
      const $ = cheerio.load(suspHtml);
      $("table tr").each((i, row) => {
        const cells = $(row)
          .find("td")
          .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
          .get();
        // Columns: District | Licence type | Address | Trade name | Suspension period
        if (cells.length >= 5 && /\d{2}-\d{2}-\d{4}/.test(cells[4])) {
          suspensionRecords.push({
            district: cells[0] || "",
            type: cells[1] || "",
            address: cells[2] || "",
            name: cells[3] || "",
            period: cells[4] || "",
          });
        }
      });
      suspensionScrapeOk = suspensionRecords.length > 0;
    }
  } catch (err) {
    console.warn(`⚠️ Warning fetching suspension records: ${err.message}`);
  }
  if (!suspensionScrapeOk) {
    console.warn("⚠️ [FEHD Sync] Suspension table unavailable; existing suspension data will be preserved.");
  }

  // Parse XML feeds
  console.log("⚙️ [FEHD Sync] Parsing XML datasets...");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", processEntities: false });

  const pRestEN = parser.parse(resRestEN);
  const pOtherEN = parser.parse(resOtherEN);
  const pPermitEN = parser.parse(resPermitEN);

  const pRestTC = parser.parse(resRestTC);
  const pOtherTC = parser.parse(resOtherTC);
  const pPermitTC = parser.parse(resPermitTC);

  // Build Traditional Chinese lookup map by licence_no
  const tcLookup = new Map();
  function addTcItems(parsedData) {
    const list = parsedData?.DATA?.LPS?.LP || [];
    const items = Array.isArray(list) ? list : [list];
    for (const item of items) {
      if (!item || !item.LICNO) continue;
      tcLookup.set(String(item.LICNO).trim(), {
        name_tc: unescapeXml(item.SS),
        address_tc: unescapeXml(item.ADR),
      });
    }
  }
  addTcItems(pRestTC);
  addTcItems(pOtherTC);
  addTcItems(pPermitTC);

  // Combine English records
  const allEnItems = [
    ...(Array.isArray(pRestEN?.DATA?.LPS?.LP) ? pRestEN.DATA.LPS.LP : [pRestEN?.DATA?.LPS?.LP]),
    ...(Array.isArray(pOtherEN?.DATA?.LPS?.LP) ? pOtherEN.DATA.LPS.LP : [pOtherEN?.DATA?.LPS?.LP]),
    ...(Array.isArray(pPermitEN?.DATA?.LPS?.LP) ? pPermitEN.DATA.LPS.LP : [pPermitEN?.DATA?.LPS?.LP]),
  ].filter(Boolean);

  const generationDate = String(pRestEN?.DATA?.GENERATION_DATE || today);
  console.log(`📊 [FEHD Sync] Master Gen Date: ${generationDate}. Combined premises: ${allEnItems.length}. Ingesting into D1...`);

  // Ensure DB schema & columns exist
  try { db.exec("ALTER TABLE restaurants ADD COLUMN demerit_points INTEGER DEFAULT 0;"); } catch (e) {}
  try { db.exec("ALTER TABLE restaurants ADD COLUMN past_violations TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE restaurants ADD COLUMN category TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE restaurants ADD COLUMN endorsements TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE restaurants ADD COLUMN name_tc TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE restaurants ADD COLUMN address_tc TEXT;"); } catch (e) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_name_tc ON restaurants(name_tc);"); } catch (e) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_category ON restaurants(category);"); } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id TEXT PRIMARY KEY,
      last_sync_date TEXT,
      generation_date TEXT,
      total_records INTEGER,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const insertStmt = db.prepare(`
    INSERT INTO restaurants (
      license_no, type, district, name_en, address_en, expiry_date,
      status, demerit_points, past_violations, suspension_details,
      category, endorsements, name_tc, address_tc, lat, lng, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
    )
    ON CONFLICT(license_no) DO UPDATE SET
      type = excluded.type,
      district = excluded.district,
      name_en = excluded.name_en,
      address_en = excluded.address_en,
      expiry_date = excluded.expiry_date,
      status = excluded.status,
      demerit_points = excluded.demerit_points,
      past_violations = excluded.past_violations,
      suspension_details = excluded.suspension_details,
      category = excluded.category,
      endorsements = excluded.endorsements,
      name_tc = excluded.name_tc,
      address_tc = excluded.address_tc,
      lat = CASE WHEN restaurants.address_en = excluded.address_en THEN restaurants.lat ELSE NULL END,
      lng = CASE WHEN restaurants.address_en = excluded.address_en THEN restaurants.lng ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
  `);

  // Refuse to replace the database with a truncated / error feed
  if (allEnItems.length < 25000) {
    db.close();
    throw new Error(`FEHD feeds look truncated (${allEnItems.length} records < 25,000); keeping existing data.`);
  }

  // If the suspension table could not be scraped, keep whatever suspension data we already hold
  const previousSuspensionData = new Map();
  if (!suspensionScrapeOk) {
    try {
      for (const row of db
        .prepare("SELECT license_no, status, demerit_points, past_violations, suspension_details FROM restaurants WHERE suspension_details IS NOT NULL AND suspension_details <> ''")
        .all()) {
        previousSuspensionData.set(row.license_no, row);
      }
    } catch (_) {}
  }

  let cleanCount = 0;
  let warningCount = 0;
  let suspendedCount = 0;

  db.exec("BEGIN TRANSACTION;");
  try {
  db.exec("DROP TABLE IF EXISTS temp_seen_licences; CREATE TEMP TABLE temp_seen_licences (license_no TEXT PRIMARY KEY);");
  const seenLicenceInsert = db.prepare("INSERT OR IGNORE INTO temp_seen_licences (license_no) VALUES (?)");


  for (let i = 0; i < allEnItems.length; i++) {
    const item = allEnItems[i];
    const licenseNo = String(item.LICNO || "").trim();
    if (!licenseNo) continue;

    const rawTypeCode = String(item.TYPE || "RL").trim();
    const rawDistCode = String(item.DIST || "18").trim();

    const type = CODE_TO_TYPE[rawTypeCode] || "General Restaurant Licence";
    const district = CODE_TO_DISTRICT[rawDistCode] || "CENTRAL/WESTERN";
    const category = determineCategory(rawTypeCode);

    const nameEn = unescapeXml(item.SS || "No Record");
    const addressEn = unescapeXml(item.ADR || "");
    const expiryDate = String(item.EXPDATE || "").trim();
    const rawInfo = String(item.INFO || "");

    const endorsementsList = [];
    for (const [code, desc] of Object.entries(INFO_CODE_MAP)) {
      if (rawInfo.includes(code)) {
        endorsementsList.push(desc);
      }
    }
    const endorsements = endorsementsList.join(", ");

    const tcInfo = tcLookup.get(licenseNo);
    const nameTc = tcInfo?.name_tc || null;
    const addressTc = tcInfo?.address_tc || null;

    let status = "CLEAN";
    let demeritPoints = 0;
    let pastViolations = null;
    let suspensionDetails = null;

    if (!suspensionScrapeOk && previousSuspensionData.has(licenseNo)) {
      // FEHD suspension table unreachable this run: keep what we already knew rather than erasing it
      const prev = previousSuspensionData.get(licenseNo);
      status = prev.status;
      demeritPoints = prev.demerit_points || 0;
      pastViolations = prev.past_violations || pastViolations;
      suspensionDetails = prev.suspension_details || null;
      cleanCount++;
    } else {
      // Match official suspension records from the live FEHD table (name AND address must agree)
      const matched = suspensionScrapeOk
        ? matchSuspensionRecords({ nameEn, nameTc, addressEn, addressTc }, suspensionRecords)
        : [];

      if (matched.length > 0) {
        const hkToday = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
        const isoRange = (period) => {
          const m = period.match(/(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2})-(\d{2})-(\d{4})/);
          return m ? { start: `${m[3]}-${m[2]}-${m[1]}`, end: `${m[6]}-${m[5]}-${m[4]}` } : null;
        };
        const current = matched.find((s) => {
          const r = isoRange(s.period);
          return r && r.start <= hkToday && hkToday <= r.end;
        });
        const headline = current || matched[0];
        status = current ? "SUSPENDED" : "PREVIOUSLY_SUSPENDED";
        demeritPoints = current ? 15 : 0;
        suspensionDetails = `FEHD Statutory Suspension Order: Licence suspended from ${headline.period} under the Demerit Points System (Cap. 132X).`;
        pastViolations =
          matched.map((s) => `• FEHD Statutory Suspension Order: ${s.period}`).join("\n") +
          "\n• Source: FEHD published list of food premises with licences suspended / cancelled under the Demerit Points System.";
        if (current) suspendedCount++;
        else cleanCount++;
      } else {
        cleanCount++;
      }
    }

    insertStmt.run(
      licenseNo,
      type,
      district,
      nameEn,
      addressEn,
      expiryDate,
      status,
      demeritPoints,
      pastViolations,
      suspensionDetails,
      category,
      endorsements,
      nameTc,
      addressTc,
      null,
      null
    );
    seenLicenceInsert.run(licenseNo);
  }

  // Remove premises FEHD no longer lists (cancelled / lapsed) so they are not reported as active
  const removed = db
    .prepare("DELETE FROM restaurants WHERE license_no NOT IN (SELECT license_no FROM temp_seen_licences)")
    .run().changes;
  if (removed > 0) console.log(`🧹 [FEHD Sync] Removed ${removed} premises no longer present in FEHD feeds.`);
  db.exec("DROP TABLE IF EXISTS temp_seen_licences;");

  // Update sync metadata
  db.prepare(`
    INSERT OR REPLACE INTO sync_metadata (id, last_sync_date, generation_date, total_records, updated_at)
    VALUES ('fehd_master', ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(today, generationDate, allEnItems.length);

  db.exec("COMMIT;");
  try {
    const hasFts = db.prepare("SELECT name FROM sqlite_master WHERE name = 'restaurants_fts'").get();
    if (!hasFts) {
      const ftsMigrationPath = path.join(process.cwd(), "migrations", "0003_fts_search.sql");
      if (fs.existsSync(ftsMigrationPath)) {
        db.exec(fs.readFileSync(ftsMigrationPath, "utf8"));
      }
    }
  } catch (_) {}
  } catch (err) {
    try { db.exec("ROLLBACK;"); } catch (_) {}
    try { db.close(); } catch (_) {}
    throw err;
  }
  db.close();

  console.log(`✅ [FEHD Sync] Successfully synchronized ${allEnItems.length} records! Clean: ${cleanCount}, Warning: ${warningCount}, Suspended: ${suspendedCount}`);

  return {
    status: "SYNC_COMPLETED",
    last_sync_date: today,
    generation_date: generationDate,
    total_records: allEnItems.length,
    stats: { clean: cleanCount, warning: warningCount, suspended: suspendedCount },
  };
}
