# EatSafe HK - Automated Daily FEHD Synchronization

## Overview
EatSafe HK uses an automated, lightweight **Incremental Diff Engine** to keep the Cloudflare D1 database 100% up-to-date with the official Hong Kong Food and Environmental Hygiene Department (FEHD) open data registry.

---

## How It Works

1. **Daily Trigger**:
   - The Hong Kong FEHD updates their open datasets overnight between 04:00 and 06:00 HKT.
   - Every day at **21:00 UTC (05:00 Hong Kong Time)**, GitHub Actions triggers `.github/workflows/fehd-sync.yml`.

2. **Smart Diffing Engine (`scripts/sync_d1_diff.mjs`)**:
   - Fetches all 6 official FEHD datasets (Restaurants, Other Food / Bakeries, Restricted Permits in English & Traditional Chinese).
   - Scrapes the official FEHD suspended food premises registry.
   - Reads the current rows directly from D1 (about 9 paged reads) and compares every field, so there is no baseline file that can drift out of step with the database.
   - **New Premises**: `INSERT INTO restaurants ...`
   - **Renewed / Modified Records**: `UPDATE restaurants SET <only the changed columns> ...`
   - **Revoked / Closed Premises**: `DELETE FROM restaurants WHERE ...`
   - **Unchanged Records**: 0 writes performed.

3. **Coordinates (`lib/geocode.mjs`)**:
   - FEHD publishes no coordinates, so each licence address is geocoded with the HKSAR Government Address Lookup Service (als.gov.hk). A result is kept only if its ALS score is at least 50 and it falls in the licence's FEHD district.
   - Unchanged addresses reuse the coordinates already stored in D1, so a daily run only geocodes new or moved premises (plus the small set ALS could not place).
   - Food trucks and marine restaurants are left without coordinates because they move.
   - The API uses these coordinates to tell same-name branches apart by distance from the Google Maps pin.

4. **Cloudflare D1 Quota Protection**:
   - Only changed rows are written, and migration `0004` limits the FTS re-index trigger to the searchable columns, so coordinate or expiry updates cost one row write each.
   - A normal day is a few dozen writes. The one-time coordinate backfill is about 43,000 writes, under the free 100,000/day limit.

---

## One-Time Setup in GitHub

To allow GitHub Actions to update your Cloudflare D1 database:

1. Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**:
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: Your Cloudflare API Token (with *D1:Edit* and *Workers:Edit* permissions).
     *(Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) using the "Edit Cloudflare Workers" template).*
3. *(Optional)* Add `CLOUDFLARE_ACCOUNT_ID` with value `2db881a53653835a68678cafda6972df` (it defaults to this account ID in the workflow if omitted).

---

## Running a Sync Manually

### Via GitHub Actions UI:
1. Go to your GitHub repository → **Actions** tab.
2. Select **Daily FEHD Sync to Cloudflare D1**.
3. Click **Run workflow**.

### Via Local Terminal:
You can also run the diff sync from your computer anytime:
```powershell
# Dry run (shows the diff without writing to D1):
npm run sync:d1 -- --dry-run

# Live remote sync to Cloudflare D1:
npm run sync:d1
```
