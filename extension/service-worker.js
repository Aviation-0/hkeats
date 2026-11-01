// extension/service-worker.js
// EatSafe HK Background Service Worker (Manifest V3)

const API_BASE = "https://eatsafe-hk.pages.dev";
const CACHE_VERSION = "v14_branch_ranking";
const POSITIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (FEHD registry updates once every 24h)
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for negative lookups to prevent repeated scans
const MAX_RECENT_LOOKUPS = 10;

// Deduplicate concurrent identical requests while in-flight
const inFlightLookups = new Map();

function buildCacheKey({ name = "", secondaryName = "", address = "", lat = null, lng = null }) {
  const normName = name.trim().toLowerCase().replace(/\s+/g, " ");
  const normSec = secondaryName.trim().toLowerCase().replace(/\s+/g, " ");
  const normAddr = address.trim().toLowerCase().replace(/\s+/g, " ");
  const normLat = lat != null && !Number.isNaN(Number(lat)) ? Number(lat).toFixed(4) : "";
  const normLng = lng != null && !Number.isNaN(Number(lng)) ? Number(lng).toFixed(4) : "";
  return `cache_${normName}_${normSec}_${normAddr}_${normLat}_${normLng}`;
}

// Fetch against Cloudflare Pages edge API
async function fetchFromBackend(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (res.ok) return { ok: true, response: res };
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, status: 429, isQuotaExceeded: true, error: data.error || "Service temporarily busy." };
    }
    return { ok: false, status: res.status, isOffline: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, isOffline: true, error: err.message };
  }
}

// Ensure stale cache entries from older schema versions are cleanly upgraded
async function ensureFreshStorage() {
  try {
    const all = await chrome.storage.local.get(null);
    if (all.cacheVersion !== CACHE_VERSION) {
      const keysToRemove = Object.keys(all).filter((k) => k.startsWith("cache_") || k === "serverUrl");
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      const existingRecent = Array.isArray(all.recentLookups)
        ? all.recentLookups.slice(0, MAX_RECENT_LOOKUPS)
        : [];
      await chrome.storage.local.set({
        cacheVersion: CACHE_VERSION,
        enabled: all.enabled !== false,
        autoPopup: all.autoPopup !== false,
        recentLookups: existingRecent,
      });
    }
  } catch (err) {
    console.warn("Storage sanity check error:", err.message);
  }
}

// Handle installation & update
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await ensureFreshStorage();
  } catch (e) {
    console.error("Install init error:", e);
  }
});

// Run storage check on service worker startup
ensureFreshStorage();

// Listener for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CLEAR_CACHE") {
    (async () => {
      try {
        const all = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(all).filter((k) => k.startsWith("cache_"));
        keysToRemove.push("recentLookups");
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
        await chrome.storage.local.set({
          cacheVersion: CACHE_VERSION,
          recentLookups: [],
        });
        sendResponse({ success: true, removedCount: keysToRemove.length });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.action === "CHECK_RESTAURANT") {
    (async () => {
      try {
        await ensureFreshStorage();

        const { name, secondaryName = "", address = "", lat = null, lng = null } = request;
        if (!name || name.trim().length === 0) {
          sendResponse({ found: false, error: "No restaurant name provided." });
          return;
        }

        const cacheKey = buildCacheKey({ name, secondaryName, address, lat, lng });
        const stored = await chrome.storage.local.get([cacheKey]);

        const cached = stored[cacheKey];
        if (cached) {
          const ttl = cached.found ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
          const isStale = !cached.cachedAt || Date.now() - cached.cachedAt > ttl;

          if (!isStale) {
            sendResponse(cached);
            return;
          } else {
            await chrome.storage.local.remove(cacheKey);
          }
        }

        // Share in-flight Promise if an identical request is already underway
        if (inFlightLookups.has(cacheKey)) {
          const sharedResult = await inFlightLookups.get(cacheKey);
          sendResponse(sharedResult);
          return;
        }

        const lookupPromise = (async () => {
          const params = new URLSearchParams();
          params.set("shopsign", name.trim());
          if (secondaryName.trim()) params.set("secondaryName", secondaryName.trim());
          if (address.trim()) params.set("address", address.trim());
          if (lat != null && !Number.isNaN(Number(lat))) params.set("lat", Number(lat).toFixed(5));
          if (lng != null && !Number.isNaN(Number(lng))) params.set("lng", Number(lng).toFixed(5));

          const endpoint = `/api/restaurants?${params.toString()}`;
          const fetchResult = await fetchFromBackend(endpoint);
          if (!fetchResult.ok) {
            return {
              found: false,
              isOffline: Boolean(fetchResult.isOffline),
              isQuotaExceeded: Boolean(fetchResult.isQuotaExceeded),
              error: fetchResult.error || "Server connection failed.",
              query: request,
            };
          }

          const data = await fetchResult.response.json();

          if (data.outsideHongKong) {
            return {
              found: false,
              outsideHongKong: true,
              error: "Location is outside Hong Kong.",
            };
          }

          const restaurants = data.restaurants || [];
          const topMatch = restaurants[0] || null;

          const resultPayload = {
            found: Boolean(topMatch),
            restaurant: topMatch,
            totalMatches: data.total || 0,
            aiAssisted: Boolean(data.aiAssisted),
            aiReasoning: data.aiReasoning || null,
            outsideHongKong: false,
            query: { name, address },
            cachedAt: Date.now(),
          };

          // Cache both positive AND negative lookups to prevent repeated D1 queries
          await chrome.storage.local.set({ [cacheKey]: resultPayload });

          // Update recent lookups history for positive matches (keep last 10)
          if (topMatch) {
            const latestStored = await chrome.storage.local.get("recentLookups");
            const lookups = Array.isArray(latestStored.recentLookups) ? latestStored.recentLookups : [];
            const updatedLookups = [
              {
                name: topMatch.name_en,
                name_tc: topMatch.name_tc || null,
                status: topMatch.status,
                matchConfidence: topMatch.matchConfidence || null,
                demerit_points: topMatch.demerit_points || 0,
                timestamp: Date.now(),
              },
              ...lookups.filter((l) => l.name !== topMatch.name_en),
            ].slice(0, MAX_RECENT_LOOKUPS);

            await chrome.storage.local.set({ recentLookups: updatedLookups });
          }

          return resultPayload;
        })();

        inFlightLookups.set(cacheKey, lookupPromise);
        try {
          const finalPayload = await lookupPromise;
          sendResponse(finalPayload);
        } finally {
          inFlightLookups.delete(cacheKey);
        }
      } catch (err) {
        sendResponse({
          found: false,
          isOffline: true,
          error: err.message,
          query: request,
        });
      }
    })();
    return true; // Keeps async message channel open
  }

  if (request.action === "CHECK_HEALTH") {
    (async () => {
      try {
        const fetchResult = await fetchFromBackend("/api/restaurants?health=1");
        if (!fetchResult.ok) {
          sendResponse({ online: false, error: fetchResult.error });
          return;
        }
        const data = await fetchResult.response.json();
        sendResponse({
          online: true,
          totalRecords: data?.syncMeta?.total_records ?? null,
          generationDate: data?.syncMeta?.generation_date ?? null,
        });
      } catch (e) {
        sendResponse({ online: false, error: e.message });
      }
    })();
    return true;
  }
});
