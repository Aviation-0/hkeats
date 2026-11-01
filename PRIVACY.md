# Privacy Policy — EatSafe HK Chrome Extension

**Effective Date**: October 18, 2026  
**Last Updated**: October 31, 2026  
**Live Policy URL**: https://eatsafe-hk.pages.dev/privacy  

---

## 1. Overview
**EatSafe HK** ("the Extension") is a browser tool designed to display official Hong Kong Food and Environmental Hygiene Department (FEHD) food licence status, statutory suspension notices, and permit records when a user views a restaurant or food establishment on Google Maps.

We are committed to protecting your privacy. **EatSafe HK does not collect, store, sell, or share any personally identifiable information (PII), user accounts, or general web browsing history.**

---

## 2. Information We Access and Process
To perform its single purpose of matching a selected Google Maps restaurant to its official FEHD licence record, the Extension accesses **only** the following public restaurant details from the active Google Maps place panel when a user selects a food venue in Hong Kong:

- **Restaurant Name** (English and/or Traditional Chinese shop sign shown in the Google Maps place heading)
- **Street Address** (The public street address of the restaurant shown on Google Maps)
- **Place Coordinates** (The public latitude and longitude coordinates of the restaurant pin embedded in the Google Maps place URL)

> **Important**: The Extension reads the coordinates of the *selected restaurant pin* from the Google Maps URL to disambiguate same-name branches across districts. It **never** accesses your personal device GPS or physical user location.

---

## 3. How We Use This Information
1. **FEHD Registry Matching**: When you click on a Hong Kong restaurant in Google Maps, the restaurant's public name, address, and pin coordinates are sent over HTTPS to the EatSafe HK API (`https://eatsafe-hk.pages.dev/api/restaurants`) to query our indexed database of official FEHD open-data food licences.
2. **Local Device Caching**: To minimize network requests and speed up repeated lookups, matched FEHD licence results (6-hour TTL) and the last 10 inspected restaurant summaries are cached locally in your browser using `chrome.storage.local`.

---

## 4. Information We Do NOT Collect
- We do **not** collect your name, email address, IP address logs, or Google account information.
- We do **not** use cookies, third-party analytics trackers, telemetry scripts, or crash-reporting SDKs.
- We do **not** track your search queries on Google Search or any website outside Google Maps place panels.
- We do **not** access your personal GPS / physical device geolocation.

---

## 5. Data Sharing and Third Parties
We do **not** sell, rent, trade, or transfer any data to third parties, data brokers, or advertising networks.

The use of information received from Google APIs and browser APIs adheres strictly to the **Chrome Web Store User Data Policy**, including the **Limited Use** requirements.

---

## 6. Data Storage & Retention
- **Server-Side**: API lookup requests are processed ephemerally in memory to return the matching FEHD public licence record and are not persisted or linked to any user identifier.
- **Client-Side (`chrome.storage.local`)**: Cached restaurant lookups expire automatically after 6 hours (1 hour for negative lookups). You can immediately purge all locally cached records at any time by clicking the **"🔄 Clear Extension Cache"** button inside the EatSafe HK toolbar popup, or by uninstalling the Extension.

---

## 7. Permissions Used
| Permission | Purpose |
| :--- | :--- |
| `storage` | Caches recent FEHD licence lookups and user widget preferences locally on your device (`chrome.storage.local`). |
| `*://www.google.com/maps/*`<br>`*://maps.google.com/*`<br>`*://www.google.com.hk/maps/*`<br>`*://maps.google.com.hk/*` | Allows the content script to read the selected restaurant's name/address in the Google Maps sidebar and render the EatSafe HK licence card. |
| `https://eatsafe-hk.pages.dev/*` | Allows the Extension to query the EatSafe HK FEHD licence verification API over HTTPS. |

---

## 8. Copyright, Open Data Attribution & Non-Affiliation Disclaimer
- **Copyright**: © 2026 EatSafe HK. All rights reserved.
- **Public Sector Open Data Attribution**: Food licence, permit, and enforcement records displayed by EatSafe HK are sourced from official public datasets provided by the **Food and Environmental Hygiene Department (FEHD)** and the **Government of the Hong Kong Special Administrative Region (HKSAR)** via [DATA.GOV.HK](https://data.gov.hk) in accordance with the DATA.GOV.HK Terms of Use.
- **Independent Tool Disclaimer**: EatSafe HK is an independent consumer transparency project and is **not** affiliated with, sponsored by, or endorsed by the Food and Environmental Hygiene Department (FEHD), the Government of the Hong Kong Special Administrative Region, or Google LLC. Google Maps™ is a trademark of Google LLC.

---

## 9. Changes to This Privacy Policy
We may update this Privacy Policy from time to time to reflect changes in functionality or regulatory requirements. Any updates will be posted to `https://eatsafe-hk.pages.dev/privacy` with an updated revision date.

---

## 10. Contact Us
If you have any questions about this Privacy Policy or the Extension's data practices, please contact us via the support tab on our Chrome Web Store listing or at our project portal (`https://eatsafe-hk.pages.dev`).
