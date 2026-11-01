# Chrome Web Store Listing — EatSafe HK

> **Status**: Ready for Submission  
> **Last Updated**: 2026-11-01  
> **Manifest Version**: 3 (`v1.0.6`)  
> **Live Portal**: https://eatsafe-hk.pages.dev  
> **Live Privacy Policy URL**: https://eatsafe-hk.pages.dev/privacy  

---

## Basic Info

| Field | Value |
| :--- | :--- |
| **Extension Name** | `EatSafe HK` *(10 / 75 chars — exact match with `manifest.json`)* |
| **Summary (`manifest.json` `description`)** | `Instantly displays Hong Kong FEHD restaurant licence status, active suspensions, and hygiene enforcement records on Google Maps.` *(128 / 132 chars — populated automatically from `manifest.json`)* |
| **Primary Category** | `Search Tools` (or `Shopping` / `Lifestyle`) |
| **Language** | `English` (supports bilingual English & Traditional Chinese matching) |
| **Homepage / Website URL** | `https://eatsafe-hk.pages.dev` |
| **Support URL** | `https://eatsafe-hk.pages.dev` |
| **Privacy Policy URL** | `https://eatsafe-hk.pages.dev/privacy` |

---

## Detailed Description

Verify Hong Kong restaurant food licences and statutory hygiene records directly inside Google Maps!

EatSafe HK automatically cross-references restaurants you view on Google Maps against the official Hong Kong Food and Environmental Hygiene Department (FEHD) public registry of 42,800+ licensed food premises across all 18 districts.

When you click on any Hong Kong restaurant, cafe, bakery, or street stall on Google Maps, a clean, draggable verification card docks right beside the Google Maps side panel—giving you instant transparency before you dine.

Key Features:
• Instant FEHD Licence Verification: Confirms whether a venue holds an active General Restaurant Licence, Light Refreshment Restaurant Licence, Bakery Licence, Food Factory Licence, Factory Canteen Licence, or Restricted Food Permit.
• Statutory Suspension Alerts: Highlights active or resolved temporary licence suspension orders issued by the FEHD under the Demerit Points System (Cap. 132X), including the suspension periods from FEHD's published suspension list.
• Branch-Level Matching: Matches English shop signs, Traditional Chinese names (繁體中文) and Cantonese romanizations, then uses the street address and map pin to pick the right outlet among same-name branches. If it cannot tell the branches apart, the card says "Unverified Match" rather than guessing.
• Special Regulatory Classification: Automatically identifies Fixed Pitch Hawker Stalls (Dai Pai Dongs under Cap. 132AI), Hotel Master Concessions, and Licence-Exempt Pre-packaged Retail Food Outlets (Cap. 132X).
• Built-In FEHD Licence Type Guide: Includes an interactive reference guide explaining what each Hong Kong food licence and permit authorizes.
• Non-Intrusive & Smart UI: Automatically hides when viewing non-food locations (parks, MTR stations, residential buildings) or places outside Hong Kong, and remembers your minimized state across map navigation.

Privacy First:
EatSafe HK only queries the public name, address, and map pin coordinates of the Hong Kong restaurant you actively select on Google Maps. It never tracks your personal browsing history, search queries, or personal GPS location, and uses zero third-party analytics or ad trackers.

Legal & Open Data Attribution:
• © 2026 EatSafe HK. All rights reserved.
• Public Sector Information Attribution: Food licence, permit, and enforcement records are sourced from official public datasets provided by the Food and Environmental Hygiene Department (FEHD) via DATA.GOV.HK in accordance with the DATA.GOV.HK Terms of Use.
• Disclaimer: EatSafe HK is an independent consumer transparency tool and is not affiliated with, sponsored by, or endorsed by the Food and Environmental Hygiene Department (FEHD), the Government of the Hong Kong Special Administrative Region (HKSAR), or Google LLC.

---

## Single Purpose Description

> Copy-paste this into the **"Single purpose"** field in the Chrome Web Store Privacy tab:

Displays official Hong Kong FEHD food licence records, permit classifications, and statutory hygiene suspension notices directly on Google Maps when a user selects a restaurant in Hong Kong.

---

## Permissions Justification

> Copy-paste each justification into the corresponding field in the Chrome Web Store Privacy tab:

### `storage`
Used exclusively to cache recent FEHD restaurant lookup responses locally (`chrome.storage.local`, 6-hour TTL) to reduce redundant API calls, and to remember the user's recent inspections and widget preferences. Users can clear this local cache at any time from the extension popup.

### Content Script Matches (Google Maps only):
- `*://www.google.com/maps/*`
- `*://maps.google.com/*`
- `*://www.google.com.hk/maps/*`
- `*://maps.google.com.hk/*`

**Justification**: Required to inject the EatSafe HK content script and stylesheet on Google Maps pages so the extension can detect when a user opens a Hong Kong restaurant place panel, read the displayed restaurant name and address from the panel DOM, and render the floating FEHD food licence verification card beside the sidebar.

### Host Permissions (API only):
- `https://eatsafe-hk.pages.dev/*`

**Justification**: No content script runs on this domain. Required only for the extension's background service worker to query the EatSafe HK backend API (`/api/restaurants`) hosted on Cloudflare Pages to retrieve matching FEHD open-data licence records.

---

## Privacy Disclosures (Chrome Web Store Data Use Checkboxes)

| Question | Answer | Details |
| :--- | :--- | :--- |
| **Collects Personally Identifiable Information (PII)?** | **No** | No user names, emails, or account identifiers are collected. |
| **Collects Health / Financial / Authentication / Personal Communications?** | **No** | None collected. |
| **Collects User Location?** | **No** | Only the public coordinates of the *selected restaurant pin* from the Google Maps URL are used for address matching; the user's personal GPS location is never accessed. |
| **Collects Web History?** | **No** | Browsing history is never tracked or logged. |
| **Collects Website Content?** | **Yes (Ephemeral Lookup Only)** | Reads the public restaurant name and street address from the active Google Maps place panel solely to query the matching FEHD food licence record. Not stored on any server or linked to any user. |
| **Certify compliance with Limited Use policy?** | **Yes** | Check all 3 Limited Use certification boxes in the Developer Console. |
| **Privacy Policy URL** | `https://eatsafe-hk.pages.dev/privacy` | Live hosted policy page (also in repository at [`PRIVACY.md`](file:///C:/Users/lucas/.gemini/antigravity/worktrees/hkeats/eatsafe_hk_app/PRIVACY.md)). |

---

## Store Assets

| Asset | Dimensions | Status | Path |
| :--- | :--- | :--- | :--- |
| **Store Icon** | 128×128 PNG | ✅ Ready | `extension/icons/icon-128.png` |
| **Toolbar Icons** | 16×16, 32×32, 48×48 PNG | ✅ Ready | `extension/icons/icon-16.png`, `icon-32.png`, `icon-48.png` |
| **Screenshot 1 (Live Google Maps — Verified Licence)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-real-1-google-maps-verified-1280x800.png` |
| **Screenshot 2 (Live Google Maps — Past Suspension)** | 1280×800 PNG | ✅ Ready | `store-assets/screenshot-real-2-google-maps-past-suspension-1280x800.png` |
| ~~Simulator: Clean Verified Licence Card~~ | 1280×800 PNG | ⚠️ Do not upload — captured on the retired mock-maps simulator, not real Google Maps | `store-assets/screenshot-1-verified-licence-1280x800.png` |
| ~~Simulator: Expanded Details & Licence Guide~~ | 1280×800 PNG | ⚠️ Do not upload — simulator capture; retake on real Google Maps | `store-assets/screenshot-2-licence-guide-1280x800.png` |
| ~~Simulator: Master Licence & Suspension Alert~~ | 1280×800 PNG | ⚠️ Do not upload — simulator capture; retake on real Google Maps | `store-assets/screenshot-3-master-licence-1280x800.png` |
| **Small Promo Tile** | 440×280 PNG | ✅ Ready | `store-assets/promo-tile-small-440x280.png` |
| **Large / Marquee Promo Tile** | 1400×560 PNG | ✅ Ready | `store-assets/promo-tile-large-1400x560.png` |

---

## Version History

- **1.0.6** (2026-11-01): Accuracy release — every licence is now geocoded with the HKSAR Address Lookup Service so same-name branches are told apart by distance from the map pin; address matching uses whole words; ambiguous chain matches are labelled "Unverified Match"; active suspensions now outrank the master-licence badge; the popup shows unverified matches; the violations section is now "Suspension History" and no longer shows placeholder text as if it were a record.
- **1.0.5** (2026-10-31): Chrome Web Store production compliance release — shortened manifest description to 128 characters (under 132-char CWS limit), removed development `localhost` host permissions, replaced inline `javascript:` reload link with CSP-compliant event listener, fixed `PREPACKAGED_RETAIL` badge label in popup recent list, added copyright & FEHD DATA.GOV.HK attribution footer, and published live privacy policy at `https://eatsafe-hk.pages.dev/privacy`.
- **1.0.4** (2026-10-31): Migrated Cloudflare D1 backend search to an external-content SQLite FTS5 inverted index (reducing D1 rows read by 3,988× to ~8.6 rows/query while preserving 100% accuracy), addedSPA hydration guard, in-flight request deduplication, and 6-hour positive cache TTL.
- **1.0.0** (2026-10-18): Initial release with live FEHD open data matching (42,800+ food premises), statutory suspension alerts, Dai Pai Dong (Cap. 132AI) and Pre-packaged Retail (Cap. 132X) badges, hotel master licence resolution, and interactive Licence Type Guide.
