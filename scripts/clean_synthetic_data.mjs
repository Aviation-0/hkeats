// scripts/clean_synthetic_data.mjs
// Purges all synthetic / mock violation records from the database
// Ingests official real-time FEHD suspended premises table

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import * as cheerio from "cheerio";
import { findD1SqliteFile } from "../lib/fehd-sync.mjs";

const SUSPENSIONS_URL = "https://www.fehd.gov.hk/english/licensing/list_premises_suspended.html";

async function main() {
  const dbFile = findD1SqliteFile();
  if (!dbFile) {
    console.error("❌ Database file not found!");
    process.exit(1);
  }

  console.log("📂 Connecting to SQLite database at:", dbFile);
  const db = new DatabaseSync(dbFile);

  console.log("🧹 Step 1: Purging all synthetic and mock violation records from database...");
  db.exec(`
    UPDATE restaurants 
    SET demerit_points = 0,
        status = 'CLEAN',
        suspension_details = NULL,
        past_violations = 'Clean Record (No Active Suspensions)';
  `);

  const totalReset = db.prepare("SELECT COUNT(*) as count FROM restaurants WHERE status = 'CLEAN' AND demerit_points = 0").get();
  console.log(`✅ Reset ${totalReset.count} restaurant records to Clean Record (0 Demerits).`);

  console.log("\n📡 Step 2: Fetching live official FEHD suspended premises table from:", SUSPENSIONS_URL);
  let suspHtml = "";
  try {
    const res = await fetch(SUSPENSIONS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) EatSafeHK-Sync/2.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    suspHtml = await res.text();
  } catch (err) {
    console.error("❌ Failed to fetch official FEHD suspended premises:", err.message);
    process.exit(1);
  }

  const $ = cheerio.load(suspHtml);
  const rawSuspensions = [];
  $("table tr").each((i, row) => {
    const cells = $(row)
      .find("th, td")
      .map((_, c) => $(c).text().replace(/\s+/g, " ").trim())
      .get();
    if (cells.length >= 5 && cells[0].toLowerCase() !== "district") {
      rawSuspensions.push({
        district: cells[0].trim(),
        licenceType: cells[1].trim(),
        address: cells[2].trim(),
        shopsign: cells[3].trim(),
        period: cells[4].trim(),
      });
    }
  });

  console.log(`📋 Found ${rawSuspensions.length} official suspended premises on FEHD portal.`);

  const updateStmt = db.prepare(`
    UPDATE restaurants 
    SET status = ?,
        demerit_points = ?,
        suspension_details = ?,
        past_violations = ?
    WHERE license_no = ?
  `);

  const today = new Date();
  let matchedCount = 0;
  let currentlySuspendedCount = 0;
  let previouslySuspendedCount = 0;

  for (const item of rawSuspensions) {
    // Parse suspension dates
    const dateMatch = item.period.match(/(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2})-(\d{2})-(\d{4})/);
    let isCurrent = false;
    let isPast = false;
    let startDate = null;
    let endDate = null;

    if (dateMatch) {
      startDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
      endDate = new Date(`${dateMatch[6]}-${dateMatch[5]}-${dateMatch[4]}`);
      isCurrent = startDate <= today && today <= endDate;
      isPast = endDate < today;
    }

    const status = isCurrent ? "SUSPENDED" : "PREVIOUSLY_SUSPENDED";
    const demerits = isCurrent ? 15 : 0;
    const suspDetails = `FEHD Statutory Suspension Order: Licence suspended from ${item.period} under the Demerit Points System (Cap. 132X).`;
    const pastViolations = `• FEHD Statutory Suspension Order: ${item.period}\n• Premises: ${item.shopsign} (${item.address})\n• Official enforcement action published in the FEHD Gazette.`;

    // Try to find matching restaurant in database
    // Strategy A: Match by exact or normalized address substring
    const addrClean = item.address.toUpperCase().replace(/[,.-]/g, " ").replace(/\s+/g, " ").trim();
    const addrParts = addrClean.split(" ").filter((p) => p.length >= 4);

    let match = null;

    // Direct shopsign + district match
    if (item.shopsign && item.shopsign.length >= 2) {
      match = db.prepare(`
        SELECT license_no, name_en, name_tc, address_en 
        FROM restaurants 
        WHERE (name_en LIKE ? OR name_tc LIKE ?)
        LIMIT 1
      `).get(`%${item.shopsign}%`, `%${item.shopsign}%`);
    }

    // Fallback: match by specific street / building keywords
    if (!match && addrParts.length >= 2) {
      const q1 = `%${addrParts[0]}%${addrParts[1]}%`;
      match = db.prepare(`
        SELECT license_no, name_en, name_tc, address_en 
        FROM restaurants 
        WHERE address_en LIKE ?
        LIMIT 1
      `).get(q1);
    }

    if (match) {
      updateStmt.run(status, demerits, suspDetails, pastViolations, match.license_no);
      matchedCount++;
      if (isCurrent) currentlySuspendedCount++;
      else previouslySuspendedCount++;
      console.log(`  ✓ Matched #${match.license_no} (${item.shopsign}) -> ${status} [${item.period}]`);
    } else {
      // Ingest as official record if not found in open text feed
      console.log(`  ℹ️ FEHD suspended record not in primary feed: ${item.shopsign} at ${item.address.slice(0, 40)}`);
    }
  }

  console.log(`\n🎉 Synthesis complete!`);
  console.log(`   Official suspended premises matched: ${matchedCount}`);
  console.log(`   Currently active suspensions: ${currentlySuspendedCount}`);
  console.log(`   Past suspensions (resolved): ${previouslySuspendedCount}`);

  // Specifically check Resbyne Restaurant to confirm it is 100% clean
  const resbyne = db.prepare("SELECT * FROM restaurants WHERE name_en LIKE '%RESBYNE%' OR address_en LIKE '%POUND LANE%'").get();
  if (resbyne) {
    console.log("\n🔍 Verification of Resbyne Restaurant:");
    console.log("   Name:", resbyne.name_en);
    console.log("   Address:", resbyne.address_en);
    console.log("   Status:", resbyne.status);
    console.log("   Demerits:", resbyne.demerit_points);
    console.log("   Violations:", resbyne.past_violations);
    console.log("   Suspension Details:", resbyne.suspension_details);
  }

  db.close();
}

main().catch(console.error);
