import { NextRequest, NextResponse } from "next/server";
import { DatabaseSync } from "node:sqlite";
// @ts-ignore
import { performDailySync, findD1SqliteFile } from "@/lib/fehd-sync.mjs";
// @ts-ignore
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
} from "@/lib/ai-search.mjs";

export const dynamic = "force-dynamic";

export interface RestaurantRecord {
  license_no: string;
  type: string;
  district: string;
  name_en: string;
  address_en: string;
  expiry_date: string;
  status: "CLEAN" | "DEMERIT_WARNING" | "SUSPENDED" | "PREVIOUSLY_SUSPENDED" | string;
  demerit_points: number;
  past_violations: string | null;
  suspension_details: string | null;
  category: string | null;
  endorsements: string | null;
  name_tc?: string | null;
  address_tc?: string | null;
  lat?: number | null;
  lng?: number | null;
  aiScore?: number;
  aiMatchNote?: string;
  matchConfidence?: "EXACT" | "HIGH" | "CONCESSION" | "LOW";
  matchType?: string;
  parentEntity?: string;
  discrepancyNote?: string;
  isCurrentlySuspended?: boolean;
  isPreviouslySuspended?: boolean;
  suspensionBadgeText?: string;
  suspensionActive?: boolean;
  isPrepackagedRetail?: boolean;
  isDaiPaiDong?: boolean;
  centralFactoryAddress?: string;
  updated_at: string;
}

let cachedLocalStats: { total: number; clean: number; warning: number; suspended: number } | null = null;
let lastLocalStatsAt = 0;

function normalizeForCompare(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);

    const sqlitePath = findD1SqliteFile();

    if (!sqlitePath) {
      return NextResponse.json({
        restaurants: [],
        total: 0,
        stats: { total: 0, clean: 0, warning: 0, suspended: 0 },
        syncMeta: null,
        message: "Database not initialized.",
      });
    }

    const db = new DatabaseSync(sqlitePath, { readOnly: true });

    let syncMeta: any = null;
    try {
      syncMeta = db.prepare("SELECT last_sync_date, generation_date, total_records FROM sync_metadata WHERE id = 'fehd_master'").get();
    } catch (_) {}

    if (!syncMeta || syncMeta.last_sync_date !== today || (syncMeta.total_records && syncMeta.total_records < 25000)) {
      performDailySync().catch((err: any) => console.warn("Background daily sync notice:", err.message));
    }

    // Cache aggregate statistics in memory for 10 minutes to avoid 42,812-row table scan per request
    if (!cachedLocalStats || Date.now() - lastLocalStatsAt > 600000) {
      try {
        cachedLocalStats = db
          .prepare(
            `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'CLEAN' THEN 1 ELSE 0 END) as clean,
              SUM(CASE WHEN status = 'DEMERIT_WARNING' THEN 1 ELSE 0 END) as warning,
              SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) as suspended
            FROM restaurants`
          )
          .get() as { total: number; clean: number; warning: number; suspended: number };
        lastLocalStatsAt = Date.now();
      } catch (_) {}
    }

    const statsRow = cachedLocalStats || {
      total: syncMeta?.total_records || 42812,
      clean: 42426,
      warning: 374,
      suspended: 12,
    };

    const effectiveSyncMeta = {
      last_sync_date: syncMeta?.last_sync_date || today,
      generation_date: syncMeta?.generation_date || today,
      total_records: syncMeta?.total_records || statsRow.total || 0,
    };

    // Fast-path health check (?health=1)
    if (searchParams.get("health") === "1") {
      db.close();
      return NextResponse.json({
        ok: true,
        online: true,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    const rawShopsign = (searchParams.get("shopsign") || searchParams.get("q") || "").trim();
    const secondaryName = (searchParams.get("secondaryName") || "").trim();
    const rawAddress = (searchParams.get("address") || "").trim();
    const rawLicenceParam = (searchParams.get("licence_no") || "").trim();
    const district = (searchParams.get("district") || "").trim().toUpperCase();
    const licenceType = (searchParams.get("licence_type") || searchParams.get("type") || "").trim();
    const endorsement = (searchParams.get("endorsement") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const status = (searchParams.get("status") || "").trim().toUpperCase();
    const sortBy = (searchParams.get("sortBy") || "shopsign").trim().toLowerCase();
    const rawLat = searchParams.get("lat");
    const rawLng = searchParams.get("lng");
    let clientLat = rawLat ? parseFloat(rawLat) : null;
    let clientLng = rawLng ? parseFloat(rawLng) : null;

    if (clientLat == null || clientLng == null) {
      const coordMatch = `${rawAddress} ${rawShopsign}`.match(/@?(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (coordMatch) {
        clientLat = parseFloat(coordMatch[1]);
        clientLng = parseFloat(coordMatch[2]);
      }
    }

    const enrichCandidate = (r: any) => {
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
      db.close();
      return NextResponse.json({
        restaurants: [],
        total: 0,
        outsideHongKong: true,
        aiAssisted: false,
        message: "Location is outside Hong Kong territory.",
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // 0b. Fast-path Primary Key / Prefix Licence Number Lookup
    const candidateLicNo = rawLicenceParam || (/^\d{8,12}$/.test(rawShopsign) ? rawShopsign : "");
    if (candidateLicNo && /^[A-Za-z0-9\-]+$/.test(candidateLicNo)) {
      const licUpper = candidateLicNo.toUpperCase();
      let licRows: any[] = [];
      const exactRow = db.prepare("SELECT * FROM restaurants WHERE license_no = ?").get(licUpper);
      if (exactRow) {
        licRows = [exactRow];
      } else if (licUpper.length >= 5) {
        const nextPrefix = licUpper.slice(0, -1) + String.fromCharCode(licUpper.charCodeAt(licUpper.length - 1) + 1);
        licRows = db
          .prepare("SELECT * FROM restaurants WHERE license_no >= ? AND license_no < ? LIMIT 50")
          .all(licUpper, nextPrefix) as any[];
      }
      if (licRows.length > 0 || rawLicenceParam) {
        db.close();
        return NextResponse.json({
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
      let factoryLicence: any = null;
      if (prepackaged.centralFactoryLicence) {
        factoryLicence = db
          .prepare("SELECT * FROM restaurants WHERE license_no = ?")
          .get(prepackaged.centralFactoryLicence);
      }
      db.close();

      const preRecord: RestaurantRecord = {
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

      return NextResponse.json({
        restaurants: [preRecord],
        total: 1,
        aiAssisted: true,
        aiReasoning: prepackaged.exemptionReason,
        syncMeta: effectiveSyncMeta,
        stats: {
          total: statsRow.total,
          clean: 1,
          warning: 0,
          suspended: 0,
        },
      });
    }

    // Check iconic Hong Kong Dai Pai Dong / Fixed Pitch Hawker Stall (e.g. Sing Heung Yuen)
    const daiPaiDong = findDaiPaiDong(
      cleanShopsign || rawShopsign,
      extractedSecondary,
      fullAddressContext || rawAddress
    );

    if (daiPaiDong) {
      db.close();
      const dpdRecord: RestaurantRecord = {
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

      return NextResponse.json({
        restaurants: [dpdRecord],
        total: 1,
        aiAssisted: true,
        aiReasoning: daiPaiDong.description,
        isDaiPaiDong: true,
        syncMeta: effectiveSyncMeta,
        stats: {
          total: statsRow.total,
          clean: 1,
          warning: 0,
          suspended: 0,
        },
      });
    }

    // Check Hotel / Mall Concession Master Licence
    const concession = findHotelConcession(
      cleanShopsign || rawShopsign,
      extractedSecondary,
      fullAddressContext || rawAddress
    );

    if (concession && concession.brand) {
      const brand = concession.brand as any;
      let masterLicence: any = null;
      if (brand.licenceNo) {
        masterLicence = db
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
          db.close();
          const rawRecord = enrichCandidate({
            ...masterLicence,
            aiScore: 100,
            matchConfidence: "EXACT",
            matchType: "DIRECT_NAME",
            aiMatchNote: `Exact match: "${masterLicence.name_en}" at ${concession.hotel.hotelName}`,
          });
          return NextResponse.json({
            restaurants: [rawRecord],
            total: 1,
            aiAssisted: true,
            aiReasoning: `Exact licence match identified for ${masterLicence.name_en} at ${concession.hotel.hotelName}.`,
            syncMeta: effectiveSyncMeta,
            stats: {
              total: 1,
              clean: masterLicence.status === "CLEAN" ? 1 : 0,
              warning: masterLicence.status === "DEMERIT_WARNING" ? 1 : 0,
              suspended: masterLicence.status === "SUSPENDED" ? 1 : 0,
            },
          });
        }

        db.close();
        const concessionRecord = enrichCandidate({
          ...masterLicence,
          aiScore: 95,
          matchConfidence: "CONCESSION",
          matchType: "HOTEL_MASTER_LICENCE",
          parentEntity: concession.hotel.hotelName,
          aiMatchNote: `Operating under ${concession.hotel.hotelName} Master Restaurant Licence (${concession.brand.floor || "Hotel Premises"}, ${concession.hotel.addressEn})`,
          discrepancyNote: `Individual dining venue "${cleanShopsign || rawShopsign}" operates under the official ${concession.hotel.hotelName} master FEHD restaurant licence at this address.`,
        });

        return NextResponse.json({
          restaurants: [concessionRecord],
          total: 1,
          aiAssisted: true,
          aiReasoning: `Concession identified: Operating under ${concession.hotel.hotelName} Master Licence.`,
          syncMeta: effectiveSyncMeta,
          stats: {
            total: 1,
            clean: masterLicence.status === "CLEAN" ? 1 : 0,
            warning: masterLicence.status === "DEMERIT_WARNING" ? 1 : 0,
            suspended: masterLicence.status === "SUSPENDED" ? 1 : 0,
          },
        });
      }
    }

    const normDistrictParam = normalizeToFehdDistrict(district);
    const targetDistrict =
      normDistrictParam ||
      (district && district !== "ALL" && district !== "- ALL DISTRICTS -" ? district : queryGeo.district);
    const allowedDistricts: string[] | null = targetDistrict
      ? ((DISTRICT_ADJACENCY as Record<string, string[]>)[targetDistrict] || [targetDistrict])
      : null;

    const matchesMetadataFilters = (r: any) => {
      if (allowedDistricts && !allowedDistricts.includes((r.district || "").toUpperCase())) return false;
      if (licenceType && licenceType !== "ALL" && !(r.type || "").toLowerCase().includes(licenceType.toLowerCase())) return false;
      if (endorsement && endorsement !== "ALL" && !endorsement.includes("All Licensed") && !(r.endorsements || "").toLowerCase().includes(endorsement.toLowerCase())) return false;
      if (category && category !== "ALL" && r.category !== category) return false;
      if (status && status !== "ALL" && (r.status || "").toUpperCase() !== status) return false;
      return true;
    };

    // Browse-only mode
    if (!cleanShopsign && !rawShopsign && !extractedSecondary && !rawAddress) {
      const browseConds: string[] = [];
      const browseParams: any[] = [];
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
      const browseRows = db
        .prepare(
          `SELECT license_no, type, district, name_en, address_en, expiry_date, status, demerit_points, past_violations, suspension_details, category, endorsements, name_tc, address_tc, lat, lng, updated_at FROM restaurants ${whereSql} LIMIT 100`
        )
        .all(...browseParams) as any[];
      db.close();

      return NextResponse.json({
        restaurants: browseRows.map(enrichCandidate),
        total: browseRows.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // STAGE A: FTS5 Inverted-Index Name + Brand Alias Lookup
    const nameFtsQuery = buildNameFtsQuery({
      rawShopsign,
      cleanShopsign,
      extractedSecondary,
      allowedDistricts,
    });

    let pool: RestaurantRecord[] = [];
    let ftsAvailable = true;
    if (nameFtsQuery) {
      const ftsRows = await queryFtsCandidates(db, nameFtsQuery, 150);
      if (ftsRows === null) {
        ftsAvailable = false;
      } else {
        pool = ftsRows as RestaurantRecord[];
      }
    }

    // Address-only search
    if (!cleanShopsign && !rawShopsign && !extractedSecondary && rawAddress) {
      const addrOnlyFts = buildAddressFallbackFtsQuery({
        rawAddress,
        fullAddressContext,
        allowedDistricts,
      });
      const addrRows = addrOnlyFts ? await queryFtsCandidates(db, addrOnlyFts, 100) : [];
      const filteredAddr = (addrRows || []).filter(matchesMetadataFilters);
      db.close();
      return NextResponse.json({
        restaurants: filteredAddr.map(enrichCandidate),
        total: filteredAddr.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

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
        for (const [k, aliases] of Object.entries(BRAND_ALIASES as Record<string, string[]>)) {
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
    const numberStreetPairs: { num: string; street: string }[] = [];
    for (const m of normalizeForCompare(rawAddress).matchAll(/\b(\d+)[a-z]?\s+([a-z]{3,})/g)) {
      if (!GENERIC_ADDRESS_WORDS.has(m[2])) numberStreetPairs.push({ num: m[1], street: m[2] });
    }
    const numbersOnStreet = (num: string, candidateAddress: string, street: string) => {
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
    const signPhraseCounts: Map<string, number> = new Map();
    for (const phrase of signPhrases) {
      const n = directCandidates.filter((r) => normalizeForCompare(r.address_en).includes(phrase) && !normalizeForCompare(r.name_en).includes(phrase)).length;
      signPhraseCounts.set(phrase, n);
    }
    const validDirect: any[] = [];
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
      db.close();
      return NextResponse.json({
        restaurants: validDirect.map(enrichCandidate),
        total: validDirect.length,
        aiAssisted: false,
        aiReasoning: null,
        syncMeta: effectiveSyncMeta,
        stats: statsRow,
      });
    }

    // STAGE B: Supplement pool with Address/Unit FTS5 query before AI scoring
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
          for (const r of addrRows as RestaurantRecord[]) {
            if (!seen.has(r.license_no) && matchesMetadataFilters(r)) {
              seen.add(r.license_no);
              pool.push(r);
            }
          }
        }
      }
    }

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

    db.close();

    return NextResponse.json({
      restaurants: aiResult.restaurants.map(enrichCandidate),
      total: aiResult.total,
      aiAssisted: aiResult.aiAssisted,
      aiReasoning: aiResult.aiReasoning,
      aiDetectedIntent: aiResult.detectedIntent,
      syncMeta: effectiveSyncMeta,
      stats: statsRow,
    });
  } catch (error: any) {
    console.error("API error in restaurants route:", error);
    return NextResponse.json(
      { error: "Internal database query failure", details: error?.message },
      { status: 500 }
    );
  }
}
