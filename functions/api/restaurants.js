// functions/api/restaurants.js
// Cloudflare Pages Function for EatSafe HK Restaurant Search API
// Powered by Cloudflare D1 (42,800+ FEHD records), FTS5 Inverted Index & AI Semantic Geofencing

import {
  performAiSemanticSearch,
  detectLocationAndRegion,
  isGeographicallyCompatible,
  checkChineseNameMatch,
  checkWordSequenceMatch,
  findHotelConcession,
  findPrepackagedRetail,
  isWithinHongKong,
  evaluateSuspensionStatus,
  normalizeToFehdDistrict,
  matchAddressNumberRange,
  haversineDistance,
  resolveCoordinatesForAddress,
  findDaiPaiDong,
  extractIdentifiedStreets,
  buildNameFtsQuery,
  buildAddressFallbackFtsQuery,
  queryFtsCandidates,
  lookupHotelByAddressFts,
  BRAND_ALIASES,
  DISTRICT_ADJACENCY,
  stripZhGenericSuffix,
  isPlaceholderName,
} from "../../lib/ai-search.mjs";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Static baseline stats (updated nightly; prevents 42,812-row table scan on every single search)
const STATIC_STATS = {
  total: 42812,
  clean: 42426,
  warning: 374,
  suspended: 12,
};

let cachedSyncMeta = null;
let lastSyncMetaFetch = 0;

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function normalizeForCompare(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Build a canonical URL for Cloudflare Edge Cache so sub-meter GPS jitter hits the same cache entry
// Bump when matching/ranking changes so the edge cache never serves results ranked by older code
const RANKING_VERSION = "2";

function buildNormalizedCacheUrl(url) {
  const norm = new URL(url.origin + url.pathname);
  norm.searchParams.set("_rv", RANKING_VERSION);
  const entries = [];
  for (const [k, v] of url.searchParams.entries()) {
    const val = v.trim();
    if (!val) continue;
    if (k === "lat" || k === "lng") {
      const n = parseFloat(val);
      if (!Number.isNaN(n)) {
        entries.push([k, n.toFixed(4)]);
      }
    } else {
      entries.push([k, val.toLowerCase()]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [k, v] of entries) {
    if (k !== "_rv") norm.searchParams.set(k, v);
  }
  return norm.toString();
}

function wrapD1(d1) {
  return {
    prepare(sql) {
      return {
        async all(...params) {
          const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
          const res = await stmt.all();
          return res.results || [];
        },
        async get(...params) {
          const stmt = params.length > 0 ? d1.prepare(sql).bind(...params) : d1.prepare(sql);
          return (await stmt.first()) || null;
        },
      };
    },
    close() {},
  };
}

export async function onRequestGet(context) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const url = new URL(context.request.url);

    // 1. Edge Cache match: return immediately if cached at edge (0 D1 row reads)
    let cacheKey = null;
    let cache = null;
    try {
      cache = caches.default;
      cacheKey = new Request(buildNormalizedCacheUrl(url), { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch (_) {}

    const makeResponse = (data, status = 200, ttlSeconds = null) => {
      const isPositive = (data?.total || 0) > 0 || Boolean(data?.online);
      const effectiveTtl = ttlSeconds ?? (isPositive ? 21600 : 3600); // 6h positive, 1h negative
      const headers = {
        ...CORS_HEADERS,
        "Cache-Control": status === 200
          ? `public, max-age=${Math.min(effectiveTtl, 7200)}, s-maxage=${effectiveTtl}`
          : "no-store",
      };
      const res = new Response(JSON.stringify(data), { status, headers });
      if (status === 200 && cache && cacheKey && !data?.quotaExceeded) {
        try {
          context.waitUntil(cache.put(cacheKey, res.clone()));
        } catch (_) {}
      }
      return res;
    };

    const rawD1 = context.env.DB || context.env.eatsafe_hk_db;

    if (!rawD1) {
      return new Response(
        JSON.stringify({
          restaurants: [],
          total: 0,
          stats: { total: 0, clean: 0, warning: 0, suspended: 0 },
          syncMeta: null,
          message: "Cloudflare D1 binding (DB) not configured in Pages settings.",
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const db = wrapD1(rawD1);

    // Fetch sync metadata (at most 1 PK row read once per hour per warm worker)
    const now = Date.now();
    let syncMeta = cachedSyncMeta;
    if (!syncMeta || now - lastSyncMetaFetch > 3600000) {
      try {
        syncMeta = await db
          .prepare("SELECT last_sync_date, generation_date, total_records FROM sync_metadata WHERE id = 'fehd_master'")
          .get();
        if (syncMeta) {
          cachedSyncMeta = syncMeta;
          lastSyncMetaFetch = now;
        }
      } catch (_) {}
    }

    const statsRow = {
      total: syncMeta?.total_records || STATIC_STATS.total,
      clean: STATIC_STATS.clean,
      warning: STATIC_STATS.warning,
      suspended: STATIC_STATS.suspended,
    };

    const effectiveSyncMeta = {
      last_sync_date: syncMeta?.last_sync_date || today,
      generation_date: syncMeta?.generation_date || today,
      total_records: syncMeta?.total_records || statsRow.total || 42812,
    };

    // Fast-path Health Check Endpoint (?health=1) -> 0 table reads!
    if (url.searchParams.get("health") === "1") {
      return makeResponse(
        {
          ok: true,
          online: true,
          syncMeta: effectiveSyncMeta,
          stats: statsRow,
        },
        200,
        1800
      );
    }

    const rawShopsign = (url.searchParams.get("shopsign") || url.searchParams.get("q") || "").trim();
    const secondaryName = (url.searchParams.get("secondaryName") || "").trim();
    const rawAddress = (url.searchParams.get("address") || "").trim();
    const rawLicenceParam = (url.searchParams.get("licence_no") || "").trim();
    const district = (url.searchParams.get("district") || "").trim().toUpperCase();
    const licenceType = (url.searchParams.get("licence_type") || url.searchParams.get("type") || "").trim();
    const endorsement = (url.searchParams.get("endorsement") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    const status = (url.searchParams.get("status") || "").trim().toUpperCase();
    const sortBy = (url.searchParams.get("sortBy") || "shopsign").trim().toLowerCase();
    const rawLat = url.searchParams.get("lat");
    const rawLng = url.searchParams.get("lng");
    let clientLat = rawLat ? parseFloat(rawLat) : null;
    let clientLng = rawLng ? parseFloat(rawLng) : null;

    if (clientLat == null || clientLng == null) {
      const coordMatch = `${rawAddress} ${rawShopsign}`.match(/@?(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordMatch) {
        clientLat = parseFloat(coordMatch[1]);
        clientLng = parseFloat(coordMatch[2]);
      }
    }

    const enrichCandidate = (r) => {
      const susp = evaluateSuspensionStatus(r);
      return {
        ...r,
        status: susp.status,
        isCurrentlySuspended: susp.isCurrentlySuspended,
        isPreviouslySuspended: susp.isPreviouslySuspended,
        suspensionBadgeText: susp.badgeText,
        suspensionActive: susp.suspensionActive,
      };
    };

    // 0. Territory Geofencing Check
    if (!isWithinHongKong(clientLat, clientLng, rawAddress)) {
      return makeResponse({
        restaurants: [],
        total: 0,
        outsideHongKong: true,
        aiAssisted: false,
        message: "Location is outside Hong Kong territory.",
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // 0b. Fast-path Primary Key / Prefix Licence Number Lookup (1 row read!)
    const candidateLicNo = rawLicenceParam || (/^\d{8,12}$/.test(rawShopsign) ? rawShopsign : "");
    if (candidateLicNo && /^[A-Za-z0-9\-]+$/.test(candidateLicNo)) {
      const licUpper = candidateLicNo.toUpperCase();
      let licRows = [];
      const exactRow = await db.prepare("SELECT * FROM restaurants WHERE license_no = ?").get(licUpper);
      if (exactRow) {
        licRows = [exactRow];
      } else if (licUpper.length >= 5) {
        const nextPrefix = licUpper.slice(0, -1) + String.fromCharCode(licUpper.charCodeAt(licUpper.length - 1) + 1);
        licRows = await db
          .prepare("SELECT * FROM restaurants WHERE license_no >= ? AND license_no < ? LIMIT 50")
          .all(licUpper, nextPrefix);
      }
      if (licRows.length > 0 || rawLicenceParam) {
        return makeResponse({
          restaurants: licRows.map((r) => enrichCandidate({ ...r, matchConfidence: "EXACT", matchType: "LICENCE_NO" })),
          total: licRows.length,
          aiAssisted: false,
          aiReasoning: null,
          syncMeta: effectiveSyncMeta,
          stats: statsRow,
        });
      }
    }

    // Extract embedded Chinese from shopsign
    let cleanShopsign = rawShopsign;
    let extractedSecondary = secondaryName;
    if (isPlaceholderName(extractedSecondary)) {
      extractedSecondary = "";
    }
    const zhInShopsign = rawShopsign.match(/[\(\[\{]([\u4e00-\u9fa5]{2,})[\)\]\}]/);
    if (zhInShopsign) {
      if (!extractedSecondary && !isPlaceholderName(zhInShopsign[1])) {
        extractedSecondary = zhInShopsign[1];
      }
      cleanShopsign = cleanShopsign.replace(zhInShopsign[0], "").trim();
    } else if (!extractedSecondary) {
      // Also support unparenthesized bilingual titles (e.g. "Kau Kee 九記牛腩" or "澳洲牛奶公司 Australia Dairy Company")
      const enZhMatch = cleanShopsign.match(/^([A-Za-z0-9\s'&.,\-]{2,50})\s+([\u4e00-\u9fa5]{2,16})$/);
      if (enZhMatch) {
        cleanShopsign = enZhMatch[1].trim();
        if (!isPlaceholderName(enZhMatch[2])) extractedSecondary = enZhMatch[2].trim();
      } else {
        const zhEnMatch = cleanShopsign.match(/^([\u4e00-\u9fa5]{2,16})\s+([A-Za-z0-9\s'&.,\-]{2,50})$/);
        if (zhEnMatch) {
          cleanShopsign = zhEnMatch[2].trim();
          if (!isPlaceholderName(zhEnMatch[1])) extractedSecondary = zhEnMatch[1].trim();
        }
      }
    }

    // Extract branch context in parentheses
    const branchMatch = cleanShopsign.match(/[\(\[\{]([^\)\]\}]+)[\)\]\}]/);
    let branchContext = "";
    if (branchMatch) {
      branchContext = branchMatch[1].trim();
      cleanShopsign = cleanShopsign.replace(branchMatch[0], "").trim();
    } else {
      const KNOWN_BRANCH_LOCATIONS = [
        "central", "wan chai", "causeway bay", "tst", "tsim sha tsui", "tsim sha tsui east", "tst east",
        "jordan", "yau ma tei", "mong kok", "mongkok", "prince edward", "sheung wan", "sai ying pun",
        "kennedy town", "admiralty", "north point", "quarry bay", "taikoo", "tai koo", "shau kei wan",
        "chai wan", "aberdeen", "stanley", "repulse bay", "sham shui po", "cheung sha wan", "lai chi kok",
        "kowloon city", "hung hom", "whampoa", "kai tak", "wong tai sin", "diamond hill", "kwun tong",
        "kowloon bay", "sha tin", "shatin", "tai wai", "fo tan", "ma on shan", "tsuen wan", "kwai chung",
        "tsing yi", "tuen mun", "yuen long", "tai po", "fanling", "sheung shui", "tseung kwan o", "tko",
        "sai kung", "tung chung", "ifc", "ifc mall", "pacific place", "times square", "harbour city",
        "k11", "k11 musea", "elements", "icc",
        "中環", "金鐘", "灣仔", "銅鑼灣", "跑馬地", "北角", "鰂魚涌", "太古", "筲箕灣", "柴灣",
        "香港仔", "赤柱", "尖沙咀", "尖東", "佐敦", "油麻地", "旺角", "太子", "大角咀", "深水埗",
        "長沙灣", "荔枝角", "九龍城", "紅磡", "黃埔", "啟德", "黃大仙", "鑽石山", "觀塘", "九龍灣",
        "沙田", "大圍", "火炭", "馬鞍山", "荃灣", "深井", "葵涌", "青衣", "屯門", "元朗", "大埔",
        "粉嶺", "上水", "將軍澳", "西貢", "東涌",
      ];
      for (const loc of KNOWN_BRANCH_LOCATIONS) {
        const branchRegex = new RegExp(`(?:\\s+[-–—,]?\\s*|\\s+)${loc}$`, "i");
        if (branchRegex.test(cleanShopsign)) {
          branchContext = loc;
          cleanShopsign = cleanShopsign.replace(branchRegex, "").trim();
          break;
        }
      }
    }

    const fullAddressContext = `${rawAddress} ${branchContext}`.trim();
    let queryGeo = detectLocationAndRegion(fullAddressContext);
    if (!queryGeo.district && !queryGeo.region && rawShopsign) {
      queryGeo = detectLocationAndRegion(`${fullAddressContext} ${rawShopsign}`);
    }

    // Check Pre-packaged Food Retail Outlet (e.g. Jenny Bakery)
    const prepackaged = findPrepackagedRetail(
      cleanShopsign || rawShopsign,
      extractedSecondary,
      fullAddressContext || rawAddress
    );

    if (prepackaged) {
      let factoryLicence = null;
      if (prepackaged.centralFactoryLicence) {
        factoryLicence = await db
          .prepare("SELECT * FROM restaurants WHERE license_no = ?")
          .get(prepackaged.centralFactoryLicence);
      }

      const preRecord = {
        license_no: prepackaged.centralFactoryLicence || "EXEMPT-CAP132X",
        type: "Retail Sale of Pre-packaged Food (Licence-Exempt)",
        district: queryGeo.district || "YAU TSIM",
        name_en: prepackaged.officialNameEn,
        name_tc: prepackaged.officialNameTc,
        address_en: rawAddress || prepackaged.centralFactoryAddress,
        expiry_date: factoryLicence?.expiry_date || "Exempt",
        status: "PREPACKAGED_RETAIL",
        demerit_points: 0,
        past_violations: null,
        suspension_details: null,
        category: "Pre-packaged Food Retail Outlet",
        endorsements: null,
        aiScore: 100,
        matchConfidence: "EXACT",
        matchType: "PREPACKAGED_RETAIL_EXEMPT",
        parentEntity: prepackaged.centralFactoryNameEn,
        discrepancyNote: prepackaged.exemptionReason,
        aiMatchNote: `Exempt under Cap. 132X (Factory-Sealed Goods). Central Production: Licence ${prepackaged.centralFactoryLicence} (${prepackaged.centralFactoryNameEn})`,
        isPrepackagedRetail: true,
        centralFactoryAddress: prepackaged.centralFactoryAddress,
        updated_at: today,
      };

      return makeResponse({
        restaurants: [preRecord],
        total: 1,
        aiAssisted: true,
        aiReasoning: prepackaged.exemptionReason,
        syncMeta: effectiveSyncMeta,
        stats: { total: statsRow.total, clean: 1, warning: 0, suspended: 0 },
      });
    }

    // Check iconic Hong Kong Dai Pai Dong / Fixed Pitch Hawker Stall (e.g. Sing Heung Yuen)
    const daiPaiDong = findDaiPaiDong(
      cleanShopsign || rawShopsign,
      extractedSecondary,
      fullAddressContext || rawAddress
    );

    if (daiPaiDong) {
      const dpdRecord = {
        license_no: daiPaiDong.licenceNo || "HAWKER-FP-CAP132AI",
        type: daiPaiDong.licenceType || "Fixed Pitch (Cooked Food / Light Refreshment) Hawker Licence",
        district: daiPaiDong.district || queryGeo.district || "CENTRAL/WESTERN",
        name_en: daiPaiDong.officialNameEn,
        name_tc: daiPaiDong.officialNameTc,
        address_en: daiPaiDong.addressEn,
        address_tc: daiPaiDong.addressTc,
        expiry_date: "Annual Statutory Renewal",
        status: "CLEAN",
        demerit_points: 0,
        past_violations: null,
        suspension_details: null,
        category: "Fixed Pitch Hawker (Cooked Food Stall / Dai Pai Dong)",
        endorsements: "Cooked Food & Light Refreshment Hawker Pitch (Cap. 132AI)",
        aiScore: 100,
        matchConfidence: "EXACT",
        matchType: "DAI_PAI_DONG_HAWKER",
        parentEntity: "FEHD Hawker Regulation (Cap. 132AI)",
        discrepancyNote: daiPaiDong.notes,
        aiMatchNote: daiPaiDong.description,
        isDaiPaiDong: true,
        updated_at: today,
      };

      return makeResponse({
        restaurants: [dpdRecord],
        total: 1,
        aiAssisted: true,
        aiReasoning: daiPaiDong.description,
        isDaiPaiDong: true,
        syncMeta: effectiveSyncMeta,
        stats: { total: statsRow.total, clean: 1, warning: 0, suspended: 0 },
      });
    }

    // Check Hotel / Mall Concession Master Licence
    const concession = findHotelConcession(
      cleanShopsign || rawShopsign,
      extractedSecondary,
      fullAddressContext || rawAddress
    );

    if (concession && concession.brand) {
      const brand = concession.brand;
      let masterLicence = null;
      if (brand.licenceNo) {
        masterLicence = await db
          .prepare("SELECT * FROM restaurants WHERE license_no = ?")
          .get(brand.licenceNo);
      }
      if (!masterLicence && concession.hotel.addressEn) {
        masterLicence = await lookupHotelByAddressFts(db, concession.hotel.addressEn, concession.hotel.district);
      }

      if (masterLicence) {
        const normClean = normalizeForCompare(cleanShopsign);
        const normLicName = normalizeForCompare(masterLicence.name_en);
        const isSelfLicensed = normClean && normLicName && (normClean === normLicName || normLicName.includes(normClean));

        if (isSelfLicensed) {
          const rawRecord = enrichCandidate({
            ...masterLicence,
            aiScore: 100,
            matchConfidence: "EXACT",
            matchType: "DIRECT_NAME",
            aiMatchNote: `Exact match: "${masterLicence.name_en}" at ${concession.hotel.hotelName}`,
          });
          return makeResponse({
            restaurants: [rawRecord],
            total: 1,
            aiAssisted: true,
            aiReasoning: `Exact licence match identified for ${masterLicence.name_en} at ${concession.hotel.hotelName}.`,
            syncMeta: effectiveSyncMeta,
            stats: { total: 1, clean: masterLicence.status === "CLEAN" ? 1 : 0, warning: masterLicence.status === "DEMERIT_WARNING" ? 1 : 0, suspended: masterLicence.status === "SUSPENDED" ? 1 : 0 },
          });
        }

        const concessionRecord = enrichCandidate({
          ...masterLicence,
          aiScore: 95,
          matchConfidence: "CONCESSION",
          matchType: "HOTEL_MASTER_LICENCE",
          parentEntity: concession.hotel.hotelName,
          aiMatchNote: `Operating under ${concession.hotel.hotelName} Master Restaurant Licence (${concession.brand.floor || "Hotel Premises"}, ${concession.hotel.addressEn})`,
          discrepancyNote: `Individual dining venue "${cleanShopsign || rawShopsign}" operates under the official ${concession.hotel.hotelName} master FEHD restaurant licence at this address.`,
        });

        return makeResponse({
          restaurants: [concessionRecord],
          total: 1,
          aiAssisted: true,
          aiReasoning: `Concession identified: Operating under ${concession.hotel.hotelName} Master Licence.`,
          syncMeta: effectiveSyncMeta,
          stats: { total: 1, clean: masterLicence.status === "CLEAN" ? 1 : 0, warning: masterLicence.status === "DEMERIT_WARNING" ? 1 : 0, suspended: masterLicence.status === "SUSPENDED" ? 1 : 0 },
        });
      }
    }

    const normDistrictParam = normalizeToFehdDistrict(district);
    const targetDistrict =
      normDistrictParam ||
      (district && district !== "ALL" && district !== "- ALL DISTRICTS -" ? district : queryGeo.district);
    const allowedDistricts = targetDistrict ? (DISTRICT_ADJACENCY[targetDistrict] || [targetDistrict]) : null;

    const matchesMetadataFilters = (r) => {
      if (allowedDistricts && !allowedDistricts.includes((r.district || "").toUpperCase())) return false;
      if (licenceType && licenceType !== "ALL" && !(r.type || "").toLowerCase().includes(licenceType.toLowerCase())) return false;
      if (endorsement && endorsement !== "ALL" && !endorsement.includes("All Licensed") && !(r.endorsements || "").toLowerCase().includes(endorsement.toLowerCase())) return false;
      if (category && category !== "ALL" && r.category !== category) return false;
      if (status && status !== "ALL" && (r.status || "").toUpperCase() !== status) return false;
      return true;
    };

    // Browse-only mode (no shopsign, secondaryName, or address — e.g. filtering by district/type/status in web UI)
    if (!cleanShopsign && !rawShopsign && !extractedSecondary && !rawAddress) {
      const browseConds = [];
      const browseParams = [];
      if (allowedDistricts) {
        browseConds.push(`district IN (${allowedDistricts.map(() => "?").join(", ")})`);
        browseParams.push(...allowedDistricts);
      }
      if (category && category !== "ALL") {
        browseConds.push("category = ?");
        browseParams.push(category);
      }
      if (status && status !== "ALL") {
        browseConds.push("status = ?");
        browseParams.push(status);
      }
      if (licenceType && licenceType !== "ALL") {
        browseConds.push("type = ?");
        browseParams.push(licenceType);
      }
      if (endorsement && endorsement !== "ALL" && !endorsement.includes("All Licensed")) {
        browseConds.push("endorsements LIKE ?");
        browseParams.push(`%${endorsement}%`);
      }
      const whereSql = browseConds.length > 0 ? `WHERE ${browseConds.join(" AND ")}` : "";
      const browseRows = await db
        .prepare(
          `SELECT license_no, type, district, name_en, address_en, expiry_date, status, demerit_points, past_violations, suspension_details, category, endorsements, name_tc, address_tc, lat, lng, updated_at FROM restaurants ${whereSql} LIMIT 100`
        )
        .all(...browseParams);

      return makeResponse({
        restaurants: browseRows.map(enrichCandidate),
        total: browseRows.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // STAGE A: FTS5 Inverted-Index Name + Brand Alias Lookup (~1-10 D1 rows read instead of 42,812!)
    const nameFtsQuery = buildNameFtsQuery({
      rawShopsign,
      cleanShopsign,
      extractedSecondary,
      allowedDistricts,
    });

    let pool = [];
    let ftsAvailable = true;
    if (nameFtsQuery) {
      const ftsRows = await queryFtsCandidates(db, nameFtsQuery, 150);
      if (ftsRows === null) {
        ftsAvailable = false;
      } else {
        pool = ftsRows;
      }
    }

    // Address-only search (no shopsign/secondaryName, only address provided)
    if (!cleanShopsign && !rawShopsign && !extractedSecondary && rawAddress) {
      const addrOnlyFts = buildAddressFallbackFtsQuery({
        rawAddress,
        fullAddressContext,
        allowedDistricts,
      });
      const addrRows = addrOnlyFts ? await queryFtsCandidates(db, addrOnlyFts, 100) : [];
      const filteredAddr = (addrRows || []).filter(matchesMetadataFilters);
      return makeResponse({
        restaurants: filteredAddr.map(enrichCandidate),
        total: filteredAddr.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // Filter pool for direct brand/subtitle match
    const GENERIC_NAME_TOKENS = new Set([
      "the", "and", "bar", "cafe", "café", "restaurant", "canteen", "kitchen", "bistro",
      "modern", "fusion", "indian", "japanese", "chinese", "italian", "thai", "korean",
      "hong", "kong", "hk", "park", "station", "centre", "center", "plaza", "garden", "gardens",
      "hotel", "house", "club", "shop", "street", "road", "court", "building",
    ]);
    const cleanLower = cleanShopsign.toLowerCase();
    const brandLeadWords = cleanLower.split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_NAME_TOKENS.has(w));
    const firstBrandWord = brandLeadWords[0] || "";
    const rootZh = extractedSecondary ? stripZhGenericSuffix(extractedSecondary) : "";

    const directCandidates = pool.filter((r) => {
      if (!matchesMetadataFilters(r)) return false;
      const nEnLower = (r.name_en || "").toLowerCase();
      const nTc = r.name_tc || "";

      if (cleanShopsign) {
        if (nEnLower.includes(cleanLower) || nTc.includes(cleanShopsign)) return true;
        if (firstBrandWord && (nEnLower === firstBrandWord || nEnLower.startsWith(firstBrandWord + " "))) return true;
        for (const [k, aliases] of Object.entries(BRAND_ALIASES)) {
          if (cleanLower.includes(k) || k.includes(cleanLower)) {
            for (const alias of aliases) {
              if (nEnLower.includes(alias.toLowerCase()) || nTc.includes(alias)) return true;
            }
          }
        }
      }
      if (extractedSecondary && /[\u4e00-\u9fa5]/.test(extractedSecondary) && !isPlaceholderName(extractedSecondary)) {
        if (nTc.includes(extractedSecondary) || (r.name_en || "").includes(extractedSecondary)) return true;
        if (rootZh && rootZh.length >= 2 && (nTc.includes(rootZh) || (r.name_en || "").includes(rootZh))) return true;
      }
      return false;
    });

    if (sortBy === "district") {
      directCandidates.sort((a, b) => (a.district || "").localeCompare(b.district || "") || (a.name_en || "").localeCompare(b.name_en || ""));
    } else if (sortBy === "score" || sortBy === "status") {
      directCandidates.sort((a, b) => (b.demerit_points || 0) - (a.demerit_points || 0) || (a.status || "").localeCompare(b.status || "") || (a.name_en || "").localeCompare(b.name_en || ""));
    } else if (sortBy === "expiry") {
      directCandidates.sort((a, b) => (a.expiry_date || "").localeCompare(b.expiry_date || "") || (a.name_en || "").localeCompare(b.name_en || ""));
    } else {
      directCandidates.sort((a, b) => (a.name_en || "").localeCompare(b.name_en || ""));
    }

    const normRawShopsign = normalizeForCompare(rawShopsign);
    const branchLower = branchContext.toLowerCase();
    // Words every branch in a district shares; they say nothing about which outlet this is
    const GENERIC_ADDRESS_WORDS = new Set([
      "hong", "kong", "kowloon", "new", "territories", "island", "nt", "hk",
      "road", "rd", "street", "st", "avenue", "ave", "lane", "path", "drive",
      "shop", "shops", "unit", "units", "level", "floor", "flat", "room", "block", "phase", "portion",
      "gf", "g", "f", "lg", "ug", "no", "nos", "of", "the", "and", "on", "at", "in",
      "central", "western", "wan", "chai", "eastern", "southern", "islands", "yau", "tsim", "mong", "kok",
      "sham", "shui", "po", "city", "wong", "tai", "sin", "kwun", "tong", "kwai", "tsing", "tsuen",
      "tuen", "mun", "yuen", "long", "north", "sha", "tin", "sai", "kung", "district",
    ]);
    const specificAddressTokens = [
      ...new Set(
        normalizeForCompare(fullAddressContext.replace(/\brd\b\.?/gi, "road").replace(/\bst\b\.?/gi, "street"))
          .split(" ")
          .filter((w) => w && (/^\d/.test(w) ? w.length <= 5 : w.length > 2 && !GENERIC_ADDRESS_WORDS.has(w)))
      ),
    ];
    // "<number> <street>" pairs in the Google address (e.g. "93 queensway"). A licence with the same
    // number on that street is strong evidence; a different number on it ("88 QUEENSWAY") contradicts.
    const numberStreetPairs = [];
    for (const m of normalizeForCompare(rawAddress).matchAll(/\b(\d+)[a-z]?\s+([a-z]{3,})/g)) {
      if (!GENERIC_ADDRESS_WORDS.has(m[2])) numberStreetPairs.push({ num: m[1], street: m[2] });
    }
    const numbersOnStreet = (num, candidateAddress, street) => {
      const out = [];
      const re = new RegExp(`(\\d+)[a-z]?(?:\\s*[-–至&]\\s*(\\d+)[a-z]?)?\\s+${street}\\b`, "gi");
      for (const m of String(candidateAddress || "").matchAll(re)) {
        const lo = Number(m[1]);
        const hi = m[2] ? Number(m[2]) : lo;
        out.push(Number(num) >= lo && Number(num) <= hi);
      }
      return out;
    };
    // Two-word building or branch names from the shop sign ("STARBUCKS Admiralty Centre Shop") that
    // appear in exactly one candidate's address; a phrase every branch shares ("causeway bay") is ignored
    const SIGN_FILLER = new Set(["restaurant", "cafe", "coffee", "shop", "store", "branch", "kitchen", "bar", "tea"]);
    const signWords = normalizeForCompare(rawShopsign).split(" ").filter((w) => w.length > 2 && !GENERIC_ADDRESS_WORDS.has(w) && !SIGN_FILLER.has(w));
    const signPhrases = signWords.slice(1).map((w, i) => `${signWords[i]} ${w}`);
    const signPhraseCounts = new Map();
    for (const phrase of signPhrases) {
      const n = directCandidates.filter((r) => normalizeForCompare(r.address_en).includes(phrase) && !normalizeForCompare(r.name_en).includes(phrase)).length;
      signPhraseCounts.set(phrase, n);
    }
    const validDirect = [];
    for (const r of directCandidates) {
      if (queryGeo.region && !isGeographicallyCompatible(queryGeo, r.district)) {
        continue;
      }
      const zhCheck = checkChineseNameMatch(extractedSecondary, r.name_tc || r.name_en);
      if (zhCheck.conflict) {
        continue;
      }
      const seqCheck = checkWordSequenceMatch(cleanShopsign, r.name_en);
      if (seqCheck.isAnagram) {
        continue;
      }

      const queryStreets = extractIdentifiedStreets(rawAddress || fullAddressContext);
      const candStreets = extractIdentifiedStreets(r.address_en);
      let sharedStreet = false;
      if (queryStreets.length > 0 && candStreets.length > 0) {
        sharedStreet = queryStreets.some((qs) =>
          candStreets.some((cs) => qs === cs || cs.includes(qs) || qs.includes(cs)) ||
          (r.address_en || "").toLowerCase().includes(qs)
        );
        if (!sharedStreet) {
          const normClean = isPlaceholderName(cleanShopsign) ? "" : normalizeForCompare(cleanShopsign);
          const normCandEn = isPlaceholderName(r.name_en) ? "" : normalizeForCompare(r.name_en);
          const normCandTc = isPlaceholderName(r.name_tc) ? "" : (r.name_tc || "").trim();
          const isExactBrand =
            (extractedSecondary && normCandTc && normCandTc.includes(extractedSecondary)) ||
            (normClean && normCandEn && (normCandEn.includes(normClean) || normClean.includes(normCandEn)));
          if (!isExactBrand) {
            continue;
          }
        }
      }

      // Address evidence: whole-word matches only ("town" must not match "MOSTOWN"), and generic or
      // district-level words are ignored because every branch in the district shares them
      const candWords = new Set(normalizeForCompare(r.address_en).split(" "));
      let sharedAddressTokens = 0;
      let numberMatched = false;
      for (const tok of specificAddressTokens) {
        if (/^\d/.test(tok)) {
          if (matchAddressNumberRange(tok, r.address_en)) numberMatched = true;
        } else if (candWords.has(tok)) {
          sharedAddressTokens++;
        }
      }

      // Distance from the Google Maps pin. Geocoded licence coordinates (ALS) are building-level;
      // the street-table fallback is only street-level, so it scores far less.
      const hasGeocode = r.lat != null && r.lng != null && !(r.lat === 22.3193 && r.lng === 114.1694);
      const candCoords = hasGeocode ? { lat: r.lat, lng: r.lng } : resolveCoordinatesForAddress(r.address_en, r.address_tc || "");
      let distanceMeters = null;
      let locationScore = 0;
      if (clientLat != null && clientLng != null && candCoords) {
        distanceMeters = haversineDistance(clientLat, clientLng, candCoords.lat, candCoords.lng);
        if (distanceMeters > 2500) {
          continue;
        }
        if (hasGeocode) {
          if (distanceMeters <= 60) locationScore = 30;
          else if (distanceMeters <= 200) locationScore = 20;
          else if (distanceMeters <= 400) locationScore = 8;
          else if (distanceMeters > 1000) locationScore = -8;
        } else if (distanceMeters <= 400) {
          locationScore = 4;
        }
      }

      let numberOnStreet = false;
      let numberConflict = false;
      for (const { num, street } of numberStreetPairs) {
        const hits = numbersOnStreet(num, r.address_en, street);
        if (hits.some(Boolean)) numberOnStreet = true;
        else if (hits.length > 0) numberConflict = true;
      }
      const candAddrNorm = normalizeForCompare(r.address_en);
      const signPhraseMatch = signPhrases.some((ph) => signPhraseCounts.get(ph) === 1 && candAddrNorm.includes(ph));

      const hasLocationEvidence =
        (hasGeocode && distanceMeters != null && distanceMeters <= 200) ||
        numberOnStreet ||
        signPhraseMatch ||
        (!numberConflict && (sharedAddressTokens >= 2 || (numberMatched && sharedStreet)));

      const normClean = isPlaceholderName(cleanShopsign) ? "" : normalizeForCompare(cleanShopsign);
      const normCandEn = isPlaceholderName(r.name_en) ? "" : normalizeForCompare(r.name_en);
      const normCandTc = isPlaceholderName(r.name_tc) ? "" : (r.name_tc || "").trim();

      const isBrandAliasMatch = Object.entries(BRAND_ALIASES).some(([k, aliases]) => {
        if (normClean.includes(k) || k.includes(normClean)) {
          return aliases.some((a) => (normCandTc && normCandTc.includes(a)) || (normCandEn && normCandEn.includes(normalizeForCompare(a))));
        }
        return false;
      });

      const isNameMatch =
        (extractedSecondary && normCandTc && (normCandTc.includes(extractedSecondary) || normCandEn.includes(normalizeForCompare(extractedSecondary)))) ||
        (normClean && normCandEn && (normCandEn.includes(normClean) || normClean.includes(normCandEn))) ||
        isBrandAliasMatch;

      // One absolute score per candidate. Location evidence outweighs exact-name equality so that a
      // differently-worded licence name ("McDonald's Restaurant") at the right address beats an
      // identically-named branch elsewhere.
      let rankScore = locationScore + sharedAddressTokens * 3 + (numberMatched && sharedStreet ? 6 : 0);
      if (numberOnStreet) rankScore += 8;
      if (numberConflict) rankScore -= 6;
      if (signPhraseMatch) rankScore += 14;
      if (normRawShopsign && normalizeForCompare(r.name_en) === normRawShopsign) rankScore += 3;
      if (branchLower && ((r.name_en || "").toLowerCase().includes(branchLower) || (r.address_en || "").toLowerCase().includes(branchLower))) rankScore += 8;
      if (queryGeo.district && (r.district || "").toUpperCase().includes(queryGeo.district)) rankScore += 3;

      validDirect.push({
        ...r,
        rankScore,
        hasLocationEvidence,
        distanceMeters,
        isNameMatch,
        matchType:
          extractedSecondary && normCandTc && normCandTc.includes(extractedSecondary)
            ? "CHINESE_SUBTITLE"
            : isBrandAliasMatch
            ? "BRAND_ALIAS"
            : "DIRECT_NAME",
      });
    }

    validDirect.sort((a, b) => b.rankScore - a.rankScore || (a.name_en || "").localeCompare(b.name_en || ""));

    // Confidence: EXACT needs the right name AND evidence it is this outlet. When several branches
    // match by name and nothing places the user at one of them, the top pick is a guess -> LOW, which
    // the extension shows as "Unverified Match" instead of a verified licence.
    const nameMatchedCount = validDirect.filter((c) => c.isNameMatch).length;
    for (let i = 0; i < validDirect.length; i++) {
      const c = validDirect[i];
      const farFromPin = c.distanceMeters != null && c.distanceMeters > 1000 && c.lat != null;
      let confidence = "LOW";
      if (c.isNameMatch && c.hasLocationEvidence) confidence = "EXACT";
      else if (c.isNameMatch && nameMatchedCount === 1 && !farFromPin) confidence = "HIGH";
      const { rankScore, hasLocationEvidence, isNameMatch, ...rest } = c;
      validDirect[i] = { ...rest, matchConfidence: confidence };
    }

    if (validDirect.length > 0) {
      return makeResponse({
        restaurants: validDirect.map(enrichCandidate),
        total: validDirect.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // STAGE B: Only if direct name match yielded 0 results, supplement candidate pool with FTS5 Address/Unit lookup
    if (ftsAvailable) {
      const addrFtsQuery = buildAddressFallbackFtsQuery({
        rawAddress,
        fullAddressContext,
        allowedDistricts,
      });
      if (addrFtsQuery) {
        const addrRows = await queryFtsCandidates(db, addrFtsQuery, 100);
        if (addrRows && addrRows.length > 0) {
          const seen = new Set(pool.map((r) => r.license_no));
          for (const r of addrRows) {
            if (!seen.has(r.license_no) && matchesMetadataFilters(r)) {
              seen.add(r.license_no);
              pool.push(r);
            }
          }
        }
      }
    }

    // AI Semantic Search scores the pre-fetched FTS5 pool (0 extra SQL queries!)
    const aiResult = await performAiSemanticSearch(db, {
      shopsign: cleanShopsign || rawShopsign,
      secondaryName: extractedSecondary,
      address: fullAddressContext || rawAddress,
      district: targetDistrict,
      lat: clientLat,
      lng: clientLng,
      licenceType,
      category,
      status,
      sortBy,
      preFetchedCandidates: ftsAvailable ? pool : null,
    });

    return makeResponse({
      restaurants: aiResult.restaurants.map(enrichCandidate),
      total: aiResult.total,
      aiAssisted: aiResult.aiAssisted,
      aiReasoning: aiResult.aiReasoning,
      aiDetectedIntent: aiResult.detectedIntent,
      syncMeta: effectiveSyncMeta,
      stats: statsRow,
    });
  } catch (err) {
    const isQuotaExceeded =
      err.message?.includes("exceeded D1's free tier daily row read limit") ||
      err.message?.includes("7500") ||
      err.message?.includes("daily operation limit");

    if (isQuotaExceeded) {
      console.warn("⚠️ [EatSafe HK] D1 free tier row read daily limit (5,000,000 rows) reached.");
      return new Response(
        JSON.stringify({
          quotaExceeded: true,
          error: "Cloudflare D1 daily free tier query limit (5,000,000 rows) reached for today. Limit resets daily at 00:00:00 UTC (8:00 PM EDT).",
          resetTimeUtc: "00:00:00 UTC",
          restaurants: [],
          total: 0,
          syncMeta: { total_records: 42812, generation_date: today },
          stats: STATIC_STATS,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": "3600",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal search error", details: err.message }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
