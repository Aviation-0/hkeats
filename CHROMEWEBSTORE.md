# Chrome Web Store Listing — EatSafe HK

> **Status**: Ready for Submission  
> **Last Updated**: 2026-11-01  
> **Manifest Version**: 3 (`v1.0.6`)  
> **Live Portal**: https://eatsafe-hk.pages.dev  
> **Live Privacy Policy URL**: https://eatsafe-hk.pages.dev/privacy  

---

## Basic Info (Store listing tab → Product details)

| Field | Value |
| :--- | :--- |
| **Title** | `EatSafe HK` *(from `manifest.json`)* |
| **Summary** | `Shows the Hong Kong FEHD food licence and any suspension orders for the restaurant you open on Google Maps.` *(107 / 132 chars, from `manifest.json`)* |
| **Category** | `Travel` (Lifestyle). Second choice: `Well-being`. |
| **Language** | `English (UK)` (the UI uses British spelling, e.g. "licence"); `English` if UK is not listed |
| **Global promo video** | Leave empty |
| **Official URL** | Leave empty (None) |
| **Homepage URL** | Leave empty |
| **Support URL** | Leave empty, and turn **Item support** on so users can reach you through the store's Support tab |
| **Mature content** | No |
| **Privacy Policy URL** *(Privacy tab, required)* | `https://eatsafe-hk.pages.dev/privacy` |

---

## Detailed Description

> Copy everything between the two lines below into the **Description** field.

---

EatSafe HK shows the Hong Kong food licence behind the restaurant you are looking at on Google Maps. Open any restaurant, café, bakery or dai pai dong in Hong Kong and a small card appears beside the Google Maps panel with its licence details from the Food and Environmental Hygiene Department (FEHD).

The data comes from FEHD's public open data on DATA.GOV.HK (about 42,900 licensed food premises across all 18 districts) and FEHD's published list of licence suspensions. It is refreshed every day.

What the card shows:
• Licence status: whether the venue holds an FEHD food licence, and which type (General Restaurant, Light Refreshment Restaurant, Bakery, Food Factory, Factory Canteen and others)
• Suspensions: any licence suspension order on FEHD's published list, which covers roughly the past year, with its dates
• Licence details: licence number, district, expiry date and the name the licence is registered under
• Special cases: fixed-pitch hawker stalls (dai pai dongs), restaurants in hotels that operate under the hotel's licence, and shops that only sell pre-packaged food
• Careful matching: when several branches share a name, EatSafe HK uses the street address and map pin to find the right one. If it cannot tell them apart, the card says "Unverified Match" instead of guessing.
• Licence type guide: a short explanation of what each kind of licence allows

You stay in control:
• Close the card for one restaurant with ✕, or minimise it
• Turn the card off completely with the switch in the toolbar popup
• The card only appears for food places in Hong Kong

Privacy:
EatSafe HK reads only the name, address and map pin of the place you open, and uses them to look up its licence. It does not collect your location, browsing history or any personal information, and it has no ads or analytics.

Please note:
EatSafe HK is an independent tool and is not affiliated with FEHD, the HKSAR Government or Google. FEHD does not publish full inspection or conviction records, so a card with no suspensions means no suspension order is on FEHD's published list, not that a venue has never had a hygiene problem. Licence data: FEHD open data via DATA.GOV.HK.

---

## Single Purpose Description

> Copy-paste this into the **"Single purpose"** field in the Chrome Web Store Privacy tab:

EatSafe HK shows the Hong Kong FEHD food licence for the restaurant a user opens on Google Maps. When a Hong Kong food place is opened, a small card beside the Google Maps panel shows whether the venue holds an FEHD food licence, its licence type, licence number and expiry, and any licence suspension on FEHD's published list. The data comes from FEHD's public open data on DATA.GOV.HK. The extension does nothing else.

---

## Permissions Justification

> Copy-paste each justification into the corresponding field in the Chrome Web Store Privacy tab:

### `storage`
chrome.storage.local is used on the user's device only, for three things: (1) caching recent licence lookups for a few hours so reopening the same restaurant doesn't send a new request, (2) the list of recently checked places shown in the toolbar popup, and (3) the user's on/off setting for the card. Nothing in storage is sent anywhere. The popup has a button to clear the cache and recent list.

### Host permission justification
Google Maps (www.google.com/maps, maps.google.com, www.google.com.hk/maps, maps.google.com.hk): the content script runs only on Google Maps pages. It reads the name, address and map pin of the place the user opens, then shows the licence card beside the Google Maps panel. It does not read or change anything else on the page.

eatsafe-hk.pages.dev: this is the extension's own backend API. The service worker sends the place's name, address and map pin there to find the matching licence record in FEHD open data. No content script runs on this domain.

### Remote code
No, I am not using Remote code.

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
| **Privacy Policy URL** | `https://eatsafe-hk.pages.dev/privacy` | Live hosted policy page (also in repository at [`PRIVACY.md`](PRIVACY.md)). |

---

## Store Assets

All images are 24-bit PNG with no transparency, captured from version 1.0.6 on real Google Maps. Upload the screenshots in this order.

| Dashboard field | File | Shows |
| :--- | :--- | :--- |
| **Store icon** (128×128) | `extension/icons/icon-128.png` | Logo |
| **Screenshot 1** | `store-assets/screenshot-1-verified-licence-1280x800.png` | Card beside the Google Maps panel (Lan Fong Yuen) |
| **Screenshot 2** | `store-assets/screenshot-2-licence-details-1280x800.png` | Expanded details: suspension history, licence number, type, expiry (Kau Kee) |
| **Screenshot 3** | `store-assets/screenshot-3-licence-type-guide-1280x800.png` | Licence type guide |
| **Screenshot 4** | `store-assets/screenshot-4-dai-pai-dong-1280x800.png` | Dai pai dong (fixed-pitch hawker) card (Sing Heung Yuen) |
| **Screenshot 5** | `store-assets/screenshot-5-popup-on-off-1280x800.png` | Toolbar popup with the on/off switch and recent lookups |
| **Small promo tile** (440×280) | `store-assets/promo-tile-small-440x280.png` | Logo and tagline |
| **Marquee promo tile** (1400×560) | `store-assets/promo-tile-large-1400x560.png` | Logo, tagline and a real card (Kau Kee) |

---

## Version History

- **1.0.6** (2026-11-01): Accuracy release — every licence is now geocoded with the HKSAR Address Lookup Service so same-name branches are told apart by distance from the map pin; address matching uses whole words; ambiguous chain matches are labelled "Unverified Match"; active suspensions now outrank the master-licence badge; the popup shows unverified matches; the violations section is now "Suspension History" and no longer shows placeholder text as if it were a record; the close button keeps the card closed for that venue; the popup has a "Show card on Google Maps" on/off switch; a backend server error now shows "Connection Issue" instead of "No FEHD Record"; the lookup is redone once Google Maps adds the place pin; dai pai dong and pre-packaged cards no longer repeat their notice under a "Master Licence Notice" label; the summary and popup wording no longer promise hygiene records or a safety rating; and a street number that contradicts the licence address is no longer treated as a verified match.
- **1.0.5** (2026-10-31): Chrome Web Store production compliance release — shortened manifest description to 128 characters (under 132-char CWS limit), removed development `localhost` host permissions, replaced inline `javascript:` reload link with CSP-compliant event listener, fixed `PREPACKAGED_RETAIL` badge label in popup recent list, added copyright & FEHD DATA.GOV.HK attribution footer, and published live privacy policy at `https://eatsafe-hk.pages.dev/privacy`.
- **1.0.4** (2026-10-31): Migrated Cloudflare D1 backend search to an external-content SQLite FTS5 inverted index (reducing D1 rows read by 3,988× to ~8.6 rows/query while preserving 100% accuracy), addedSPA hydration guard, in-flight request deduplication, and 6-hour positive cache TTL.
- **1.0.0** (2026-10-18): Initial release with live FEHD open data matching (42,800+ food premises), statutory suspension alerts, Dai Pai Dong (Cap. 132AI) and Pre-packaged Retail (Cap. 132X) badges, hotel master licence resolution, and interactive Licence Type Guide.
