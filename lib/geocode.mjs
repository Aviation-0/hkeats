// lib/geocode.mjs
// Geocodes FEHD premises addresses with the HKSAR Government Address Lookup Service (ALS, als.gov.hk).
// FEHD's open data has no coordinates, so this is what lets the API tell same-name branches apart
// by distance from the Google Maps pin.

const ALS_URL = "https://www.als.gov.hk/lookup";

// Minimum ALS ValidationInformation.Score to trust a result (ALS scores 0-100)
export const MIN_ALS_SCORE = 50;

// FEHD district -> ALS District Council district (DcDistrict) it may legitimately fall in
const FEHD_TO_DC = {
  "CENTRAL/WESTERN": ["CENTRAL & WESTERN DISTRICT"],
  "WAN CHAI": ["WAN CHAI DISTRICT"],
  EASTERN: ["EASTERN DISTRICT"],
  SOUTHERN: ["SOUTHERN DISTRICT"],
  ISLANDS: ["ISLANDS DISTRICT"],
  "YAU TSIM": ["YAU TSIM MONG DISTRICT"],
  "MONG KOK": ["YAU TSIM MONG DISTRICT"],
  "SHAM SHUI PO": ["SHAM SHUI PO DISTRICT"],
  "KOWLOON CITY": ["KOWLOON CITY DISTRICT"],
  "WONG TAI SIN": ["WONG TAI SIN DISTRICT"],
  "KWUN TONG": ["KWUN TONG DISTRICT"],
  "KWAI TSING": ["KWAI TSING DISTRICT"],
  "TSUEN WAN": ["TSUEN WAN DISTRICT"],
  "TUEN MUN": ["TUEN MUN DISTRICT"],
  "YUEN LONG": ["YUEN LONG DISTRICT"],
  "TAI PO": ["TAI PO DISTRICT"],
  NORTH: ["NORTH DISTRICT"],
  "SHA TIN": ["SHA TIN DISTRICT"],
  "SAI KUNG": ["SAI KUNG DISTRICT"],
};

// Food trucks and vessels move around, so a fixed coordinate would be misleading
export function isGeocodable(r) {
  if (!r.address_en) return false;
  if (r.district === "FOOD TRUCK") return false;
  if (r.type === "Marine Restaurant Licence") return false;
  return true;
}

export function addressKey(addressEn) {
  return String(addressEn || "").toUpperCase().replace(/\s+/g, " ").trim();
}

async function alsLookup(address, timeoutMs = 20000) {
  // ALS rejects very long queries with HTTP 413; the leading unit/floor text matters least, so keep
  // the tail (building, street, area) when trimming
  const q = address.length > 160 ? address.slice(-160).replace(/^[^,]*,\s*/, "") : address;
  const url = `${ALS_URL}?${new URLSearchParams({ q, n: "1" })}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "EatSafeHK-Sync/2.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ALS HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns { lat, lng, score } for an accepted match, or null when ALS has no trustworthy answer
 * (low score, or the match lies outside the FEHD district the licence is registered in).
 * Throws only on network/HTTP failure so callers can retry instead of caching a false negative.
 */
export async function geocodeFehdAddress({ address_en, address_tc, district }) {
  const allowedDc = FEHD_TO_DC[district] || null;
  let best = null;
  for (const q of [address_en, address_tc].filter(Boolean)) {
    const data = await alsLookup(q);
    const hit = data?.SuggestedAddress?.[0];
    if (!hit) continue;
    const prem = hit.Address?.PremisesAddress;
    const geo = prem?.GeospatialInformation;
    const score = Number(hit.ValidationInformation?.Score || 0);
    const lat = Number(geo?.Latitude);
    const lng = Number(geo?.Longitude);
    const dc = prem?.EngPremisesAddress?.EngDistrict?.DcDistrict || "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (allowedDc && dc && !allowedDc.includes(dc)) continue;
    if (score < MIN_ALS_SCORE) continue;
    if (!best || score > best.score) best = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), score };
    if (score >= 75) break;
  }
  return best;
}

/**
 * Geocodes a list of records with bounded concurrency and per-address de-duplication.
 * Returns Map(addressKey -> {lat,lng,score} | null). Addresses that still fail after retries are
 * left out of the map so a later run can try again.
 */
export async function geocodeMany(records, { concurrency = 4, onProgress, onResult } = {}) {
  const byKey = new Map();
  for (const r of records) {
    if (!isGeocodable(r)) continue;
    const k = addressKey(r.address_en);
    if (!byKey.has(k)) byKey.set(k, r);
  }
  const queue = [...byKey.entries()];
  const results = new Map();
  let done = 0;
  async function worker() {
    while (queue.length > 0) {
      const [k, r] = queue.shift();
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const v = await geocodeFehdAddress(r);
          results.set(k, v);
          if (onResult) onResult(k, v);
          break;
        } catch (err) {
          if (attempt === 3) console.warn(`⚠️ [Geocode] Giving up on "${r.address_en}": ${err.message}`);
          else await new Promise((res) => setTimeout(res, 1000 * attempt));
        }
      }
      done++;
      if (onProgress && done % 250 === 0) onProgress(done, byKey.size);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}
