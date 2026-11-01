// lib/ai-search.mjs
// Autonomous AI Semantic Search Assistant for EatSafe HK
// Hardened with Strict Geographic Bounds, Chinese Name Verification, and Concession Resolution

export const DISTRICT_TO_REGION = {
  "CENTRAL/WESTERN": "HONG_KONG_ISLAND",
  "WAN CHAI": "HONG_KONG_ISLAND",
  "EASTERN": "HONG_KONG_ISLAND",
  "SOUTHERN": "HONG_KONG_ISLAND",

  "YAU TSIM": "KOWLOON",
  "MONG KOK": "KOWLOON",
  "SHAM SHUI PO": "KOWLOON",
  "KOWLOON CITY": "KOWLOON",
  "WONG TAI SIN": "KOWLOON",
  "KWUN TONG": "KOWLOON",

  "TSUEN WAN": "NEW_TERRITORIES_ISLANDS",
  "KWAI TSING": "NEW_TERRITORIES_ISLANDS",
  "TUEN MUN": "NEW_TERRITORIES_ISLANDS",
  "YUEN LONG": "NEW_TERRITORIES_ISLANDS",
  "NORTH": "NEW_TERRITORIES_ISLANDS",
  "TAI PO": "NEW_TERRITORIES_ISLANDS",
  "SHA TIN": "NEW_TERRITORIES_ISLANDS",
  "SAI KUNG": "NEW_TERRITORIES_ISLANDS",
  "ISLANDS": "NEW_TERRITORIES_ISLANDS",
  "FOOD TRUCK": "ANY",
};

// District adjacency for hard spatial geofencing
export const DISTRICT_ADJACENCY = {
  "CENTRAL/WESTERN": ["CENTRAL/WESTERN", "WAN CHAI"],
  "WAN CHAI": ["WAN CHAI", "CENTRAL/WESTERN", "EASTERN"],
  "EASTERN": ["EASTERN", "WAN CHAI", "SOUTHERN"],
  "SOUTHERN": ["SOUTHERN", "CENTRAL/WESTERN", "WAN CHAI", "EASTERN"],

  "YAU TSIM": ["YAU TSIM", "MONG KOK", "KOWLOON CITY"],
  "MONG KOK": ["MONG KOK", "YAU TSIM", "SHAM SHUI PO"],
  "SHAM SHUI PO": ["SHAM SHUI PO", "MONG KOK", "KOWLOON CITY", "KWAI TSING"],
  "KOWLOON CITY": ["KOWLOON CITY", "WONG TAI SIN", "YAU TSIM", "KWUN TONG"],
  "WONG TAI SIN": ["WONG TAI SIN", "KOWLOON CITY", "KWUN TONG", "SHA TIN"],
  "KWUN TONG": ["KWUN TONG", "WONG TAI SIN", "KOWLOON CITY", "SAI KUNG"],

  "TSUEN WAN": ["TSUEN WAN", "KWAI TSING", "TUEN MUN"],
  "KWAI TSING": ["KWAI TSING", "TSUEN WAN", "SHAM SHUI PO"],
  "TUEN MUN": ["TUEN MUN", "YUEN LONG"],
  "YUEN LONG": ["YUEN LONG", "TUEN MUN", "NORTH"],
  "NORTH": ["NORTH", "TAI PO", "YUEN LONG"],
  "TAI PO": ["TAI PO", "NORTH", "SHA TIN"],
  "SHA TIN": ["SHA TIN", "TAI PO", "TSUEN WAN", "WONG TAI SIN"],
  "SAI KUNG": ["SAI KUNG", "KWUN TONG"],
  "ISLANDS": ["ISLANDS", "CENTRAL/WESTERN"],
  "FOOD TRUCK": ["CENTRAL/WESTERN", "WAN CHAI", "EASTERN", "YAU TSIM"],
};

// Robust mapping of 60+ Hong Kong colloquial neighborhoods (EN & TC) to statutory FEHD districts
export const NEIGHBORHOOD_TO_FEHD_MAP = {
  // YAU TSIM (South Yau Tsim Mong)
  "jordan": "YAU TSIM",
  "佐敦": "YAU TSIM",
  "tsim sha tsui": "YAU TSIM",
  "tst": "YAU TSIM",
  "尖沙咀": "YAU TSIM",
  "tsim sha tsui east": "YAU TSIM",
  "tst east": "YAU TSIM",
  "尖東": "YAU TSIM",
  "yau ma tei": "YAU TSIM",
  "ymt": "YAU TSIM",
  "油麻地": "YAU TSIM",
  "west kowloon": "YAU TSIM",
  "西九龍": "YAU TSIM",
  "西九": "YAU TSIM",
  "austin": "YAU TSIM",
  "柯士甸": "YAU TSIM",
  "yau tsim": "YAU TSIM",
  "yau tsim mong": "YAU TSIM",
  "油尖旺": "YAU TSIM",
  "mody road": "YAU TSIM",
  "麼地道": "YAU TSIM",
  "empire centre": "YAU TSIM",
  "帝國中心": "YAU TSIM",

  // MONG KOK (North Yau Tsim Mong)
  "mong kok": "MONG KOK",
  "mongkok": "MONG KOK",
  "mk": "MONG KOK",
  "旺角": "MONG KOK",
  "prince edward": "MONG KOK",
  "太子": "MONG KOK",
  "tai kok tsui": "MONG KOK",
  "大角咀": "MONG KOK",

  // CENTRAL/WESTERN
  "central": "CENTRAL/WESTERN",
  "中環": "CENTRAL/WESTERN",
  "admiralty": "CENTRAL/WESTERN",
  "金鐘": "CENTRAL/WESTERN",
  "sheung wan": "CENTRAL/WESTERN",
  "上環": "CENTRAL/WESTERN",
  "sai ying pun": "CENTRAL/WESTERN",
  "syp": "CENTRAL/WESTERN",
  "西營盤": "CENTRAL/WESTERN",
  "shek tong tsui": "CENTRAL/WESTERN",
  "石塘咀": "CENTRAL/WESTERN",
  "kennedy town": "CENTRAL/WESTERN",
  "k-town": "CENTRAL/WESTERN",
  "堅尼地城": "CENTRAL/WESTERN",
  "sai wan": "CENTRAL/WESTERN",
  "西環": "CENTRAL/WESTERN",
  "mid-levels": "CENTRAL/WESTERN",
  "mid levels": "CENTRAL/WESTERN",
  "半山": "CENTRAL/WESTERN",
  "the peak": "CENTRAL/WESTERN",
  "山頂": "CENTRAL/WESTERN",
  "soho": "CENTRAL/WESTERN",
  "lan kwai fong": "CENTRAL/WESTERN",
  "lkf": "CENTRAL/WESTERN",
  "蘭桂坊": "CENTRAL/WESTERN",
  "central/western": "CENTRAL/WESTERN",
  "central & western": "CENTRAL/WESTERN",
  "中西區": "CENTRAL/WESTERN",

  // WAN CHAI
  "wan chai": "WAN CHAI",
  "wanchai": "WAN CHAI",
  "灣仔": "WAN CHAI",
  "causeway bay": "WAN CHAI",
  "cwb": "WAN CHAI",
  "銅鑼灣": "WAN CHAI",
  "happy valley": "WAN CHAI",
  "跑馬地": "WAN CHAI",
  "tai hang": "WAN CHAI",
  "大坑": "WAN CHAI",
  "tin hau": "WAN CHAI",
  "天后": "WAN CHAI",

  // EASTERN
  "fortress hill": "EASTERN",
  "炮台山": "EASTERN",
  "north point": "EASTERN",
  "北角": "EASTERN",
  "quarry bay": "EASTERN",
  "鰂魚涌": "EASTERN",
  "taikoo": "EASTERN",
  "taikoo shing": "EASTERN",
  "太古": "EASTERN",
  "太古城": "EASTERN",
  "sai wan ho": "EASTERN",
  "西灣河": "EASTERN",
  "shau kei wan": "EASTERN",
  "筲箕灣": "EASTERN",
  "chai wan": "EASTERN",
  "柴灣": "EASTERN",
  "siu sai wan": "EASTERN",
  "小西灣": "EASTERN",
  "eastern": "EASTERN",
  "東區": "EASTERN",

  // SOUTHERN
  "aberdeen": "SOUTHERN",
  "香港仔": "SOUTHERN",
  "ap lei chau": "SOUTHERN",
  "鴨脷洲": "SOUTHERN",
  "wong chuk hang": "SOUTHERN",
  "黃竹坑": "SOUTHERN",
  "repulse bay": "SOUTHERN",
  "淺水灣": "SOUTHERN",
  "deep water bay": "SOUTHERN",
  "深水灣": "SOUTHERN",
  "stanley": "SOUTHERN",
  "赤柱": "SOUTHERN",
  "shek o": "SOUTHERN",
  "石澳": "SOUTHERN",
  "pok fu lam": "SOUTHERN",
  "pokfulam": "SOUTHERN",
  "薄扶林": "SOUTHERN",
  "southern": "SOUTHERN",
  "南區": "SOUTHERN",

  // SHAM SHUI PO
  "sham shui po": "SHAM SHUI PO",
  "ssp": "SHAM SHUI PO",
  "深水埗": "SHAM SHUI PO",
  "tai po road, kowloon": "SHAM SHUI PO",
  "tai po rd, kowloon": "SHAM SHUI PO",
  "tai po road": "SHAM SHUI PO",
  "tai po rd": "SHAM SHUI PO",
  "大埔道": "SHAM SHUI PO",
  "tong mi": "SHAM SHUI PO",
  "塘尾": "SHAM SHUI PO",
  "tung lo court": "SHAM SHUI PO",
  "東廬大廈": "SHAM SHUI PO",
  "shek kip mei": "SHAM SHUI PO",
  "石硤尾": "SHAM SHUI PO",
  "cheung sha wan": "SHAM SHUI PO",
  "長沙灣": "SHAM SHUI PO",
  "lai chi kok": "SHAM SHUI PO",
  "荔枝角": "SHAM SHUI PO",
  "mei foo": "SHAM SHUI PO",
  "美孚": "SHAM SHUI PO",
  "nam cheong": "SHAM SHUI PO",
  "南昌": "SHAM SHUI PO",

  // KOWLOON CITY
  "kowloon city": "KOWLOON CITY",
  "九龍城": "KOWLOON CITY",
  "hung hom": "KOWLOON CITY",
  "紅磡": "KOWLOON CITY",
  "to kwa wan": "KOWLOON CITY",
  "tkw": "KOWLOON CITY",
  "土瓜灣": "KOWLOON CITY",
  "whampoa": "KOWLOON CITY",
  "黃埔": "KOWLOON CITY",
  "kowloon tong": "KOWLOON CITY",
  "九龍塘": "KOWLOON CITY",
  "kai tak": "KOWLOON CITY",
  "啟德": "KOWLOON CITY",
  "ho man tin": "KOWLOON CITY",
  "何文田": "KOWLOON CITY",

  // WONG TAI SIN
  "wong tai sin": "WONG TAI SIN",
  "黃大仙": "WONG TAI SIN",
  "diamond hill": "WONG TAI SIN",
  "鑽石山": "WONG TAI SIN",
  "san po kong": "WONG TAI SIN",
  "新蒲崗": "WONG TAI SIN",
  "lok fu": "WONG TAI SIN",
  "樂富": "WONG TAI SIN",

  // KWUN TONG
  "kwun tong": "KWUN TONG",
  "觀塘": "KWUN TONG",
  "ngau tau kok": "KWUN TONG",
  "牛頭角": "KWUN TONG",
  "kowloon bay": "KWUN TONG",
  "九龍灣": "KWUN TONG",
  "lam tin": "KWUN TONG",
  "藍田": "KWUN TONG",
  "yau tong": "KWUN TONG",
  "油塘": "KWUN TONG",

  // TSUEN WAN
  "tsuen wan": "TSUEN WAN",
  "荃灣": "TSUEN WAN",
  "sham tseng": "TSUEN WAN",
  "深井": "TSUEN WAN",

  // KWAI TSING
  "kwai chung": "KWAI TSING",
  "葵涌": "KWAI TSING",
  "tsing yi": "KWAI TSING",
  "青衣": "KWAI TSING",
  "kwai fong": "KWAI TSING",
  "葵芳": "KWAI TSING",

  // TUEN MUN & YUEN LONG
  "tuen mun": "TUEN MUN",
  "屯門": "TUEN MUN",
  "yuen long": "YUEN LONG",
  "元朗": "YUEN LONG",
  "tin shui wai": "YUEN LONG",
  "天水圍": "YUEN LONG",

  // TAI PO & NORTH
  "tai po": "TAI PO",
  "大埔": "TAI PO",
  "fanling": "NORTH",
  "粉嶺": "NORTH",
  "sheung shui": "NORTH",
  "上水": "NORTH",

  // SHA TIN
  "sha tin": "SHA TIN",
  "shatin": "SHA TIN",
  "沙田": "SHA TIN",
  "tai wai": "SHA TIN",
  "大圍": "SHA TIN",
  "fo tan": "SHA TIN",
  "火炭": "SHA TIN",
  "ma on shan": "SHA TIN",
  "mos": "SHA TIN",
  "馬鞍山": "SHA TIN",

  // SAI KUNG
  "sai kung": "SAI KUNG",
  "西貢": "SAI KUNG",
  "tseung kwan o": "SAI KUNG",
  "tko": "SAI KUNG",
  "將軍澳": "SAI KUNG",
  "hang hau": "SAI KUNG",
  "坑口": "SAI KUNG",
  "po lam": "SAI KUNG",
  "寶琳": "SAI KUNG",
  "lohas park": "SAI KUNG",
  "日出康城": "SAI KUNG",

  // ISLANDS
  "tung chung": "ISLANDS",
  "東涌": "ISLANDS",
  "discovery bay": "ISLANDS",
  "愉景灣": "ISLANDS",
  "cheung chau": "ISLANDS",
  "長洲": "ISLANDS",
  "lantau": "ISLANDS",
  "大嶼山": "ISLANDS",
  "airport": "ISLANDS",
  "機場": "ISLANDS",
};

// Normalize any colloquial neighborhood name or raw district string to statutory FEHD district code
export function normalizeToFehdDistrict(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  const clean = lower.replace(/[,\-_/]/g, " ").trim();

  // 1. Direct map check
  if (NEIGHBORHOOD_TO_FEHD_MAP[clean]) {
    return NEIGHBORHOOD_TO_FEHD_MAP[clean];
  }

  // 2. Token check for compound names e.g. "Jordan, Kowloon", "Tai Po Road, Kowloon"
  // Sort keys by length descending so longer phrases match before shorter substrings
  const sortedEntries = Object.entries(NEIGHBORHOOD_TO_FEHD_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [key, dist] of sortedEntries) {
    const regex = new RegExp(`(^|\\s|[,/\\-])${key}(\\s|[,/\\-]|$)`, "i");
    if (regex.test(raw)) {
      return dist;
    }
  }

  // 3. Check against statutory uppercase district codes
  const upper = raw.toUpperCase().trim();
  if (DISTRICT_ADJACENCY[upper]) {
    return upper;
  }

  return null;
}

// Great-circle distance in meters between two lat/lng coordinates (Haversine formula)
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371000; // Earth's radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if a query street number matches candidate address numbers or compound number ranges (e.g. 47 in 47-49)
export function matchAddressNumberRange(queryNumStr, candidateAddress) {
  if (!queryNumStr || !candidateAddress) return false;
  const cAddr = candidateAddress.toLowerCase();

  // Extract all numeric tokens from query (e.g. "47", "47號", "47-49")
  const qNums = (String(queryNumStr).match(/\b\d+\b/g) || []).map(Number);
  if (qNums.length === 0) return false;

  // 1. Direct word-boundary match for each number (e.g. \b47\b in candidate address)
  for (const num of qNums) {
    const exactRegex = new RegExp(`\\b${num}\\b`);
    if (exactRegex.test(cAddr)) return true;
  }

  // 2. Check compound ranges in candidate address: e.g. "47-49", "47至49", "47 to 49", "47/49", "47 & 49"
  const rangeMatches = cAddr.matchAll(/\b(\d+)\s*[-至–—/&]\s*(\d+)\b/g);
  for (const match of rangeMatches) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      for (const qNum of qNums) {
        if (qNum >= start && qNum <= end) {
          return true;
        }
      }
    }
  }

  return false;
}

// Common Hong Kong street and landmark centroids for precise coordinate resolution
export const HK_STREET_COORDINATES = {
  "parkes street": { lat: 22.3047, lng: 114.1706 },
  "白加士街": { lat: 22.3047, lng: 114.1706 },
  "stanley street": { lat: 22.2818, lng: 114.1554 },
  "士丹利街": { lat: 22.2818, lng: 114.1554 },
  "hennessy road": { lat: 22.2777, lng: 114.1748 },
  "軒尼詩道": { lat: 22.2777, lng: 114.1748 },
  "finance street": { lat: 22.2866, lng: 114.1578 },
  "金融街": { lat: 22.2866, lng: 114.1578 },
  "queen's road central": { lat: 22.2810, lng: 114.1555 },
  "皇后大道中": { lat: 22.2810, lng: 114.1555 },
  "shau kei wan main street east": { lat: 22.2801, lng: 114.2288 },
  "筲箕灣東大街": { lat: 22.2801, lng: 114.2288 },
  "seaview garden": { lat: 22.2801, lng: 114.2288 },
  "star ferry pier": { lat: 22.2868, lng: 114.1618 },
  "central pier 7": { lat: 22.2868, lng: 114.1618 },
  "天星碼頭": { lat: 22.2868, lng: 114.1618 },
  "hong kong station": { lat: 22.2842, lng: 114.1582 },
  "香港站": { lat: 22.2842, lng: 114.1582 },
  "nathan road": { lat: 22.3040, lng: 114.1714 },
  "彌敦道": { lat: 22.3040, lng: 114.1714 },
  "canton road": { lat: 22.2988, lng: 114.1685 },
  "廣東道": { lat: 22.2988, lng: 114.1685 },
  "lockhart road": { lat: 22.2795, lng: 114.1765 },
  "駱克道": { lat: 22.2795, lng: 114.1765 },
  "wellington street": { lat: 22.2825, lng: 114.1542 },
  "威靈頓街": { lat: 22.2825, lng: 114.1542 },
  "pottinger street": { lat: 22.2829, lng: 114.1549 },
  "砵典乍街": { lat: 22.2829, lng: 114.1549 },
  "staunton street": { lat: 22.2824, lng: 114.1517 },
  "士丹頓街": { lat: 22.2824, lng: 114.1517 },
  "elgin street": { lat: 22.2819, lng: 114.1520 },
  "伊利近街": { lat: 22.2819, lng: 114.1520 },
  "hollywood road": { lat: 22.2840, lng: 114.1508 },
  "荷李活道": { lat: 22.2840, lng: 114.1508 },
  "des voeux road central": { lat: 22.2855, lng: 114.1570 },
  "德輔道中": { lat: 22.2855, lng: 114.1570 },
  "connaught road central": { lat: 22.2858, lng: 114.1575 },
  "干諾道中": { lat: 22.2858, lng: 114.1575 },
  "salisbury road": { lat: 22.2945, lng: 114.1730 },
  "梳士巴利道": { lat: 22.2945, lng: 114.1730 },
  "austin road": { lat: 22.3035, lng: 114.1690 },
  "柯士甸道": { lat: 22.3035, lng: 114.1690 },
  "jordan road": { lat: 22.3050, lng: 114.1695 },
  "佐敦道": { lat: 22.3050, lng: 114.1695 },
  "bowring street": { lat: 22.3045, lng: 114.1708 },
  "寶靈街": { lat: 22.3045, lng: 114.1708 },
  "woo sung street": { lat: 22.3055, lng: 114.1703 },
  "吳松街": { lat: 22.3055, lng: 114.1703 },
  "temple street": { lat: 22.3075, lng: 114.1698 },
  "廟街": { lat: 22.3075, lng: 114.1698 },
  "sai yeung choi street": { lat: 22.3180, lng: 114.1700 },
  "西洋菜南街": { lat: 22.3180, lng: 114.1700 },
  "fa yuen street": { lat: 22.3190, lng: 114.1705 },
  "花園街": { lat: 22.3190, lng: 114.1705 },
  "tung choi street": { lat: 22.3185, lng: 114.1702 },
  "通菜街": { lat: 22.3185, lng: 114.1702 },
  "argyle street": { lat: 22.3200, lng: 114.1700 },
  "亞皆老街": { lat: 22.3200, lng: 114.1700 },
  "shanghai street": { lat: 22.3140, lng: 114.1685 },
  "上海街": { lat: 22.3140, lng: 114.1685 },
  "smithfield": { lat: 22.2815, lng: 114.1287 },
  "士美菲路": { lat: 22.2815, lng: 114.1287 },
  "catchick street": { lat: 22.2830, lng: 114.1280 },
  "吉席街": { lat: 22.2830, lng: 114.1280 },
  "belcher's street": { lat: 22.2825, lng: 114.1300 },
  "卑路乍街": { lat: 22.2825, lng: 114.1300 },
  "queen's road east": { lat: 22.2750, lng: 114.1720 },
  "皇后大道東": { lat: 22.2750, lng: 114.1720 },
  "johnston road": { lat: 22.2770, lng: 114.1725 },
  "莊士敦道": { lat: 22.2770, lng: 114.1725 },
  "king's road": { lat: 22.2880, lng: 114.1950 },
  "英皇道": { lat: 22.2880, lng: 114.1950 },
  "electric road": { lat: 22.2875, lng: 114.1915 },
  "電氣道": { lat: 22.2875, lng: 114.1915 },
  "java road": { lat: 22.2915, lng: 114.2005 },
  "渣華道": { lat: 22.2915, lng: 114.2005 },
};

// Resolve approximate coordinates for an address based on street name index
export function resolveCoordinatesForAddress(addressEn, addressTc = "") {
  const combined = `${addressEn || ""} ${addressTc || ""}`.toLowerCase();
  for (const [st, coords] of Object.entries(HK_STREET_COORDINATES)) {
    if (combined.includes(st.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

export function isDistrictInGeofence(queryDistrict, candidateDistrict) {
  if (!queryDistrict || !candidateDistrict) return true;
  const q = normalizeToFehdDistrict(queryDistrict) || queryDistrict.toUpperCase().trim();
  const c = normalizeToFehdDistrict(candidateDistrict) || candidateDistrict.toUpperCase().trim();
  if (q === c) return true;
  const allowed = DISTRICT_ADJACENCY[q];
  if (allowed && allowed.includes(c)) return true;
  return false;
}

export const HK_LOCATION_GRAPH = [
  {
    keywords: ["admiralty", "金鐘"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: [
      "far east finance",
      "pacific place",
      "united centre",
      "admiralty centre",
      "citic tower",
      "lippo centre",
      "queensway plaza",
      "tamar",
      "adm",
      "admiralty station",
    ],
    streets: [
      "harcourt road",
      "queensway",
      "cotton tree drive",
      "rodney street",
      "drake street",
    ],
    explanation:
      "In official FEHD licensing records, Admiralty establishments are listed under Central/Western district along Harcourt Road or Queensway.",
  },
  {
    keywords: ["hong kong station", "hk station", "香港站", "hok", "airport express hong kong"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["hong kong station", "hok", "lar hong kong station", "in-town check-in"],
    streets: ["hong kong station", "lar"],
    explanation: "Hong Kong Station MTR concessions are coded as HOK in Central/Western district.",
  },
  {
    keywords: ["central station", "中環站"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["central station", "mtr central"],
    streets: ["central station", "des voeux road central", "pedder street"],
    explanation: "Central Station MTR concessions are officially listed in Central/Western district.",
  },
  {
    keywords: ["pier 7", "star ferry pier", "central pier 7", "7號碼頭", "天星碼頭", "central pier"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["central pier 7", "star ferry", "pier 7", "star ferry pier", "central pier"],
    streets: ["central pier 7", "central pier", "man kwong street"],
    explanation: "Central Star Ferry Pier 7 premises are officially registered under Central/Western District at Central Pier 7.",
  },
  {
    keywords: ["soho", "蘇豪"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["asiarich court", "pmq", "mid-levels escalator"],
    streets: [
      "staunton street",
      "elgin street",
      "shelley street",
      "hollywood road",
      "peel street",
      "graham street",
    ],
    explanation:
      "In official FEHD records, Soho dining premises are registered under Central/Western district along Staunton, Elgin, or Hollywood Road.",
  },
  {
    keywords: ["lan kwai fong", "lkf", "蘭桂坊"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["california tower", "d'aguilar"],
    streets: [
      "d'aguilar street",
      "lan kwai fong",
      "wyndham street",
      "wellington street",
    ],
    explanation:
      "Lan Kwai Fong premises are officially registered under Central/Western along D'Aguilar Street or Wyndham Street.",
  },
  {
    keywords: ["ifc", "ifc mall", "two ifc", "one ifc", "國金"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["ifc", "international finance centre", "two ifc", "one ifc"],
    streets: ["8 finance street", "finance street", "harbour view street"],
    explanation:
      "IFC Mall premises are officially registered at 8 Finance Street, Central (Central/Western District).",
  },
  {
    keywords: ["four seasons", "four seasons hotel", "四季酒店"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["four seasons", "four seasons hotel", "8 finance street"],
    streets: ["8 finance street", "finance street"],
    explanation:
      "Four Seasons Hotel Hong Kong is located at 8 Finance Street, Central (Central/Western District).",
  },
  {
    keywords: ["the landmark", "landmark mandarin oriental", "置地廣場", "置地文華"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["the landmark", "landmark mandarin oriental", "15 queen's road central", "gloucester tower", "edinburgh tower"],
    streets: ["15 queen's road central", "queen's road central", "des voeux road central"],
    explanation: "The Landmark Mandarin Oriental and Landmark Atrium are located at 15 Queen's Road Central.",
  },
  {
    keywords: ["times square", "時代廣場"],
    officialDistrict: "WAN CHAI",
    landmarks: ["times square"],
    streets: ["1 matheson street", "matheson street", "russell street"],
    explanation:
      "Times Square premises are officially registered at 1 Matheson Street, Causeway Bay (Wan Chai District).",
  },
  {
    keywords: ["causeway bay", "cwb", "銅鑼灣"],
    officialDistrict: "WAN CHAI",
    landmarks: [
      "times square",
      "hysan place",
      "sogo",
      "lee garden",
      "world trade centre",
      "fashion walk",
    ],
    streets: [
      "hennessy road",
      "lockhart road",
      "russell street",
      "kai chiu road",
      "east point road",
      "yee wo street",
      "paterson street",
      "great george street",
    ],
    explanation:
      "Causeway Bay food premises fall under the Wan Chai administrative district in FEHD records.",
  },
  {
    keywords: ["pacific place", "太古廣場"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["pacific place", "two pacific place", "one pacific place", "the upper house"],
    streets: ["88 queensway", "queensway", "supreme court road"],
    explanation:
      "Pacific Place premises are registered at 88 Queensway, Admiralty/Central.",
  },
  {
    keywords: ["langham place", "朗豪坊"],
    officialDistrict: "MONG KOK",
    landmarks: ["langham place"],
    streets: ["8 argyle street", "shanghai street", "shantung street"],
    explanation:
      "Langham Place premises are officially registered at 8 Argyle Street / 555 Shanghai Street, Mong Kok.",
  },
  {
    keywords: ["harbour city", "ocean terminal", "海港城"],
    officialDistrict: "YAU TSIM",
    landmarks: ["harbour city", "ocean terminal", "ocean centre", "gateway"],
    streets: ["canton road", "3-27 canton road"],
    explanation:
      "Harbour City premises are officially registered along Canton Road, Tsim Sha Tsui (Yau Tsim District).",
  },
  {
    keywords: ["k11 musea", "k11", "victoria dockside"],
    officialDistrict: "YAU TSIM",
    landmarks: ["k11 musea", "k11", "victoria dockside"],
    streets: ["18 salisbury road", "salisbury road"],
    explanation:
      "K11 Musea premises are registered at 18 Salisbury Road, Tsim Sha Tsui.",
  },
  {
    keywords: [
      "elements",
      "圓方",
      "icc",
      "international commerce centre",
      "the ritz-carlton",
      "the ritz carlton",
      "ritz-carlton",
      "ritz carlton",
      "環球貿易廣場",
      "1 austin road west",
      "austin road west",
    ],
    officialDistrict: "YAU TSIM",
    landmarks: [
      "elements",
      "icc",
      "international commerce centre",
      "the ritz-carlton",
      "the ritz carlton",
      "ritz-carlton",
      "環球貿易廣場",
      "sky100",
      "ozone",
      "tin lung heen",
      "tosca",
    ],
    streets: ["1 austin road west", "austin road west"],
    explanation:
      "Elements mall, ICC, and The Ritz-Carlton premises are registered at 1 Austin Road West, Tsim Sha Tsui (Yau Tsim District).",
  },
  {
    keywords: ["citygate", "東薈城"],
    officialDistrict: "ISLANDS",
    landmarks: ["citygate", "citygate outlets"],
    streets: ["20 tat tung road", "tat tung road"],
    explanation:
      "Citygate Outlets food premises are registered at 20 Tat Tung Road, Tung Chung (Islands District).",
  },
  {
    keywords: ["festival walk", "又一城"],
    officialDistrict: "KOWLOON CITY",
    landmarks: ["festival walk"],
    streets: ["80 tat chee avenue", "tat chee avenue"],
    explanation:
      "Festival Walk premises are registered at 80 Tat Chee Avenue, Kowloon Tong.",
  },
  {
    keywords: ["apm"],
    officialDistrict: "KWUN TONG",
    landmarks: ["apm"],
    streets: ["418 kwun tong road", "kwun tong road"],
    explanation:
      "apm mall premises are registered at 418 Kwun Tong Road, Kwun Tong.",
  },
  {
    keywords: ["new town plaza", "新城市廣場"],
    officialDistrict: "SHA TIN",
    landmarks: ["new town plaza"],
    streets: ["18 shatin centre street", "sha tin centre street"],
    explanation:
      "New Town Plaza premises are registered at 18 Sha Tin Centre Street, Sha Tin.",
  },
  {
    keywords: ["cityplaza", "太古城中心"],
    officialDistrict: "EASTERN",
    landmarks: ["cityplaza", "taikoo shing"],
    streets: ["18 taikoo shing road", "king's road"],
    explanation:
      "Cityplaza premises are registered at 18 Taikoo Shing Road, Quarry Bay (Eastern District).",
  },
  {
    keywords: ["tsim sha tsui", "tst", "尖沙咀", "tsim sha tsui east", "tst east", "尖東", "mody road", "麼地道", "empire centre", "帝國中心"],
    officialDistrict: "YAU TSIM",
    landmarks: ["harbour city", "k11", "isquare", "miramar", "the one", "the peninsula", "empire centre", "帝國中心"],
    streets: ["nathan road", "canton road", "salisbury road", "cameron road", "carnarvon road", "granville road", "kimberley road", "mody road", "麼地道"],
    explanation: "Tsim Sha Tsui food premises fall under the Yau Tsim administrative district in FEHD records."
  },
  {
    keywords: ["mong kok", "mk", "旺角"],
    officialDistrict: "MONG KOK",
    landmarks: ["langham place", "moko", "grand century place"],
    streets: ["nathan road", "argyle street", "sai yeung choi", "tung choi", "fa yuen", "dundas street"],
    explanation: "Mong Kok premises are catalogued under the Mong Kok administrative district."
  },
  {
    keywords: ["prince edward", "太子"],
    officialDistrict: "MONG KOK",
    landmarks: ["pioneer centre", "allied plaza"],
    streets: ["prince edward road west", "bute street", "nullah road"],
    explanation: "Prince Edward premises fall under the Mong Kok district in FEHD records."
  },
  {
    keywords: ["kennedy town", "k-town", "堅尼地城"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["the westwood"],
    streets: ["belcher's street", "forbes street", "catchick street", "davis street", "smithfield"],
    explanation: "Kennedy Town premises fall under the Central/Western district in FEHD records."
  },
  {
    keywords: ["sai ying pun", "西營盤"],
    officialDistrict: "CENTRAL/WESTERN",
    landmarks: ["the rockpool"],
    streets: ["first street", "second street", "third street", "high street", "queen's road west", "des voeux road west", "centre street"],
    explanation: "Sai Ying Pun food premises fall under the Central/Western district in FEHD records."
  },
  {
    keywords: ["whampoa", "hung hom", "黃埔", "紅磡"],
    officialDistrict: "KOWLOON CITY",
    landmarks: ["whampoa garden", "the whampoa"],
    streets: ["tak on street", "shung king street", "man tai street", "baker street"],
    explanation: "Whampoa and Hung Hom fall under the Kowloon City district in FEHD records."
  },
  {
    keywords: ["north point", "北角"],
    officialDistrict: "EASTERN",
    landmarks: ["harbour north", "metropole"],
    streets: ["king's road", "electric road", "java road", "chun yeung street"],
    explanation: "North Point food premises fall under the Eastern district in FEHD records."
  },
  {
    keywords: ["shau kei wan", "筲箕灣"],
    officialDistrict: "EASTERN",
    landmarks: ["seaview garden", "eastern district"],
    streets: ["shau kei wan road", "main street east", "factory street", "kam wa street"],
    explanation: "Shau Kei Wan premises fall under the Eastern district."
  },
  {
    keywords: ["jordan", "佐敦", "parkes street", "白加士街", "bowring street", "woo sung street"],
    officialDistrict: "YAU TSIM",
    landmarks: ["parkes street", "jordan road", "bowring street", "woo sung street", "temple street"],
    streets: ["parkes street", "jordan road", "bowring street", "woo sung street", "temple street", "nathan road", "austin road"],
    explanation: "Jordan food premises fall under the Yau Tsim administrative district in FEHD records."
  }
];

export const BRAND_ALIASES = {
  genki: ["genki sushi", "元氣壽司", "genki"],
  "genki sushi": ["genki sushi", "元氣壽司", "genki"],
  mcdonald: ["mcdonald's", "mhk restaurants", "麥當勞", "mcdonalds"],
  "mcdonald's": ["mcdonald's", "mhk restaurants", "麥當勞", "mcdonalds"],
  mcd: ["mcdonald's", "mhk restaurants", "麥當勞", "mcdonalds"],
  kfc: ["kentucky fried chicken", "肯德基", "kfc"],
  starbucks: ["coffee concepts", "starbucks", "星巴克"],
  "pacific coffee": ["pacific coffee", "太平洋咖啡"],
  donki: ["don don donki", "pan pacific retail", "驚安之殿堂"],
  "don don donki": ["don don donki", "pan pacific retail", "驚安之殿堂"],
  sushiro: ["sushiro", "壽司郎"],
  bakehouse: ["bakehouse", "gdb bakehouse", "bakehouse soho"],
  "shake shack": ["shake shack", "canto spice/shake shack"],
  "tam jai": ["tam jai", "譚仔雲南米線", "tamjai"],
  "sam gor": ["sam gor", "譚仔三哥米線", "tamjai samgor"],
  "fairwood": ["fairwood", "大快活"],
  "cafe de coral": ["cafe de coral", "大家樂"],
  "maxim's": ["maxim's", "美心", "maxims", "maxim’s"],
  "maxims": ["maxim's", "美心", "maxims", "maxim’s"],
  "saint honore": ["saint honore", "聖安娜", "st. honore", "st honore"],
  "a-1 bakery": ["a-1 bakery", "a1 bakery", "英王麵包"],
  "a1 bakery": ["a-1 bakery", "a1 bakery", "英王麵包"],
  "tai cheong": ["tai cheong", "泰昌餅家"],
  "kee wah": ["kee wah", "奇華餅家"],
  "four seasons": ["four seasons", "四季", "four seasons hotel", "香港四季酒店"],
  "pier 7": ["pier 7", "pier 7 cafe & bar", "pier 7 café & bar", "central pier 7"],
  "pier 7 cafe": ["pier 7 cafe & bar", "pier 7 café & bar", "pier 7"],
  "amber": ["amber", "the landmark mandarin oriental", "置地文華東方酒店"],
  "tim ho wan": [
    "tim ho wan",
    "添好運",
    "添好運點心專門店",
    "tim ho wan dim sum specialist",
    "tim ho wan dim sum restaurant",
  ],
  "yat lok": ["yat lok", "一樂燒鵝", "yat lok restaurant"],
  "kam's roast goose": ["kam's roast goose", "甘牌燒鵝"],
  "australia dairy company": ["australia dairy company", "澳洲牛奶公司"],
  "australian dairy company": ["australia dairy company", "澳洲牛奶公司"],
  "australia dairy": ["australia dairy company", "澳洲牛奶公司"],
  "澳洲牛奶公司": ["澳洲牛奶公司", "australia dairy company"],
  "mak's noodle": ["mak's noodle", "麥奀雲吞麵世家", "麥奀"],
  "kai kai dessert": ["kai kai dessert", "佳佳甜品"],
  "sister wah": ["sister wah", "華姐清湯腩"],
  "mido cafe": ["mido cafe", "美都餐室"],
  "sing heung yuen": ["sing heung yuen", "勝香園"],
  "lan fong yuen": ["lan fong yuen", "蘭芳園"],
  "lin heung tea house": ["lin heung tea house", "蓮香樓"],
  "kwan kee claypot rice": ["kwan kee claypot rice", "坤記煲仔小菜"],
  "kam wah cafe": ["kam wah cafe", "金華冰廳"],
  "monster bbq": ["monster bbq", "燒味獸", "monster bbq restaurant"],
  "lung king heen": ["lung king heen", "龍景軒"],
  "king lung heen": ["king lung heen", "璟瓏軒"],
  "central restaurant": ["central restaurant", "中央飯店", "中央"],
  "中央飯店": ["central restaurant", "中央飯店", "中央"],
  chaiwala: ["chaiwala", "cut lab"],
  "cut lab": ["chaiwala", "cut lab"],
  "lady m": ["lady m", "lady m new york"],
  "lady m new york": ["lady m", "lady m new york"],
};

export const HOTEL_CONCESSIONS = [
  {
    hotelName: "The Landmark Mandarin Oriental",
    hotelNameZh: "置地文華東方酒店",
    addressEn: "15 QUEEN'S ROAD CENTRAL",
    district: "CENTRAL/WESTERN",
    brands: [
      { name: "amber", nameZh: "amber", floor: "7/F", licenceNo: "2218801129" },
      { name: "somm", nameZh: "somm", floor: "7/F", licenceNo: "2218801129" },
      { name: "sushi shikon", nameZh: "志魂", floor: "7/F", licenceNo: "2218813685" },
      { name: "kappo rin", nameZh: "凜", floor: "7/F", licenceNo: "2218813685" },
    ],
  },
  {
    hotelName: "Four Seasons Hotel",
    hotelNameZh: "香港四季酒店",
    addressEn: "8 FINANCE STREET",
    district: "CENTRAL/WESTERN",
    brands: [
      { name: "lung king heen", nameZh: "龍景軒", floor: "PODIUM LEVEL 4", licenceNo: "2218800597" },
      { name: "caprice", nameZh: "caprice", floor: "PODIUM LEVEL 6", licenceNo: "2218800454" },
      { name: "the lounge", nameZh: "the lounge", floor: "PODIUM LV-1", licenceNo: "2218800816" },
      { name: "sushi saito", nameZh: "鮨·齋藤", floor: "45/F", licenceNo: "2218812309" },
      { name: "tempura uchitsu", nameZh: "天婦羅 內津", floor: "45/F", licenceNo: "2218815326" },
      { name: "noi", nameZh: "noi", floor: "PODIUM L-5", licenceNo: "2218817544" },
    ],
  },
  {
    hotelName: "Central Pier 7",
    hotelNameZh: "中環7號天星碼頭",
    addressEn: "CENTRAL PIER 7",
    district: "CENTRAL/WESTERN",
    brands: [
      { name: "pier 7 cafe & bar", nameZh: "pier 7 cafe & bar", floor: "ROOF VIEWING DECK", licenceNo: "3118802306" },
      { name: "pier 7 cafe", nameZh: "pier 7 cafe", floor: "ROOF VIEWING DECK", licenceNo: "3118802306" },
      { name: "watermark", nameZh: "watermark", floor: "SHOP L", licenceNo: "2218802414" },
      { name: "chimac", floor: "SHOP E", licenceNo: "2918811400" },
      { name: "pizza central", floor: "SHOP C", licenceNo: "2918810878" },
    ],
  },
  {
    hotelName: "The Peninsula Hong Kong",
    hotelNameZh: "香港半島酒店",
    addressEn: "SALISBURY ROAD",
    district: "YAU TSIM",
    brands: [
      { name: "the lobby", nameZh: "大堂茶座", floor: "G/F", licenceNo: "2261197934" },
      { name: "lobby lounge", nameZh: "大堂茶座", floor: "G/F", licenceNo: "2261197934" },
      { name: "the lobby at the peninsula", nameZh: "半島酒店大堂茶座", floor: "G/F", licenceNo: "2261197934" },
      { name: "the peninsula lobby", nameZh: "半島大堂", floor: "G/F", licenceNo: "2261197934" },
      { name: "spring moon", nameZh: "嘉麟樓", floor: "1/F", licenceNo: "2261197767" },
      { name: "gaddi's", nameZh: "吉地士", floor: "1/F", licenceNo: "2261197758" },
      { name: "chesa", nameZh: "瑞樵閣", floor: "1/F", licenceNo: "2261197758" },
      { name: "the verandah", nameZh: "露台餐廳", floor: "1/F", licenceNo: "2261197758" },
      { name: "felix", floor: "28/F", licenceNo: "2261191626" },
      { name: "imasa", nameZh: "今佐", floor: "1/F", licenceNo: "2261193686" },
    ],
  },
  {
    hotelName: "Grand Hyatt Hong Kong",
    hotelNameZh: "香港君悅酒店",
    addressEn: "1 HARBOUR ROAD",
    district: "WAN CHAI",
    brands: [
      { name: "one harbour road", nameZh: "港灣壹號", floor: "7/F & 8/F" },
      { name: "grissini", floor: "2/F" },
      { name: "grand cafe", nameZh: "咖啡廳", floor: "LOBBY" },
    ],
  },
  {
    hotelName: "Mandarin Oriental Hong Kong",
    hotelNameZh: "香港文華東方酒店",
    addressEn: "5 CONNAUGHT ROAD CENTRAL",
    district: "CENTRAL/WESTERN",
    brands: [
      { name: "man wah", nameZh: "文華廳", floor: "25/F" },
      { name: "mandarin grill + bar", nameZh: "文華扒房及酒吧", floor: "1/F" },
      { name: "the chinnery", nameZh: "千日里", floor: "1/F" },
    ],
  },
  {
    hotelName: "The Ritz-Carlton Hong Kong",
    hotelNameZh: "香港麗思卡爾頓酒店",
    addressEn: "1 AUSTIN ROAD WEST",
    district: "YAU TSIM",
    brands: [
      { name: "tin lung heen", nameZh: "天龍軒", floor: "102/F", licenceNo: "2261807451" },
      { name: "tosca di angelo", nameZh: "tosca", floor: "102/F", licenceNo: "2261807460" },
      { name: "ozone", nameZh: "ozone", floor: "118/F", licenceNo: "2261807424" },
    ],
  },
];

export function normalizeTextForMatching(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\brd\b\.?/g, "road")
    .replace(/\bst\b\.?/g, "street")
    .replace(/\bave\b\.?/g, "avenue")
    .replace(/\bw\b\.?/g, "west")
    .replace(/\be\b\.?/g, "east")
    .replace(/\bn\b\.?/g, "north")
    .replace(/\bs\b\.?/g, "south")
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findHotelConcession(shopsign, secondaryName, address) {
  const fullText = `${shopsign || ""} ${secondaryName || ""} ${address || ""}`.toLowerCase();
  const normQuery = normalizeTextForMatching(fullText);

  for (const hotel of HOTEL_CONCESSIONS) {
    const normHotelName = normalizeTextForMatching(hotel.hotelName);
    const normHotelAddr = normalizeTextForMatching(hotel.addressEn);
    const hotelMatched =
      normQuery.includes(normHotelName) ||
      normQuery.includes(normHotelAddr) ||
      (hotel.hotelNameZh && fullText.includes(hotel.hotelNameZh));

    for (const brand of hotel.brands) {
      const bName = brand.name.toLowerCase();
      const bNameZh = brand.nameZh ? brand.nameZh.toLowerCase() : null;

      const brandMatched =
        normQuery.includes(bName) ||
        (bNameZh && fullText.includes(bNameZh));

      if (brandMatched && (hotelMatched || normQuery.includes(hotel.district.toLowerCase()))) {
        return {
          hotel,
          brand,
        };
      }
    }
  }
  return null;
}

// Bounding box for the territory of Hong Kong
export const HK_BOUNDS = {
  minLat: 22.14,
  maxLat: 22.58,
  minLng: 113.82,
  maxLng: 114.44,
};

// Check if a venue is located in Hong Kong based on GPS coordinates and address markers
export function isWithinHongKong(lat, lng, addressText) {
  // 1. If GPS coordinates are provided, check against the HK territorial bounding box
  if (lat != null && lng != null) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isNaN(latNum) && !isNaN(lngNum) && (latNum !== 0 || lngNum !== 0)) {
      if (
        latNum < HK_BOUNDS.minLat ||
        latNum > HK_BOUNDS.maxLat ||
        lngNum < HK_BOUNDS.minLng ||
        lngNum > HK_BOUNDS.maxLng
      ) {
        return false;
      }
      return true;
    }
  }

  // 2. Check address text for non-HK locations
  if (!addressText) return true;
  const lower = addressText.toLowerCase();

  const nonHkMarkers = [
    "japan", "tokyo", "osaka", "kyoto",
    "united states", "usa", "san francisco", "new york", "los angeles",
    "united kingdom", "london", "manchester",
    "taiwan", "taipei", "kaohsiung",
    "macau", "macao",
    "singapore",
    "shenzhen", "guangzhou", "beijing", "shanghai",
    "canada", "toronto", "vancouver",
    "australia", "sydney", "melbourne",
    "france", "paris",
    "korea", "seoul",
    "thailand", "bangkok"
  ];

  for (const m of nonHkMarkers) {
    const regex = new RegExp(`\\b${m}\\b`, "i");
    if (regex.test(lower)) {
      // If it contains "japan" or "tokyo", verify it's not a HK address like "Japanese restaurant, Central, Hong Kong"
      if (!lower.includes("hong kong") && !lower.includes("kowloon") && !lower.includes("香港") && !lower.includes("九龍") && !lower.includes("新界")) {
        return false;
      }
    }
  }

  return true;
}

// Pre-Packaged Retail Outlets selling exclusively factory-sealed or boxed goods (Exempt under Cap. 132X)
export const PREPACKAGED_RETAIL_BRANDS = [
  {
    brandNames: [
      "jenny bakery",
      "jenny bakery cookies",
      "珍妮曲奇",
      "珍妮曲奇聰明小熊",
      "smart little bear",
      "jenny's bakery",
      "jennys bakery",
    ],
    officialNameEn: "Jenny Bakery",
    officialNameTc: "珍妮曲奇聰明小熊",
    centralFactoryLicence: "2911803406",
    centralFactoryNameEn: "Jenny Bakery Central Food Factory",
    centralFactoryNameTc: "珍妮曲奇中央食品廠",
    centralFactoryAddress: "Unit A & B, 21/F, Kam Man Fung Factory Building, 6 Hong Man Street, Chai Wan, Hong Kong",
    exemptionReason: "Retail sale of factory-sealed / pre-packaged cookies only. Under the Hong Kong Food Business Regulation (Cap. 132X), retail sale of sealed pre-packaged food does not require an on-site food preparation licence.",
  }
];

export function findPrepackagedRetail(shopsign, secondaryName, address) {
  const full = `${shopsign || ""} ${secondaryName || ""} ${address || ""}`.toLowerCase();
  for (const item of PREPACKAGED_RETAIL_BRANDS) {
    for (const b of item.brandNames) {
      if (full.includes(b.toLowerCase())) {
        return item;
      }
    }
  }
  return null;
}

// Curated Registry of Iconic Hong Kong Open-Air Cooked Food Stalls (Dai Pai Dongs)
// Licensed under FEHD Fixed Pitch Hawker Licences (Cap. 132AI / Cap. 132BK)
export const DAI_PAI_DONG_CATALOG = [
  {
    id: "SING_HEUNG_YUEN",
    brandNames: ["sing heung yuen", "sing heung", "勝香園"],
    addressKeywords: ["mee lun", "美輪", "central", "中環"],
    officialNameEn: "Sing Heung Yuen",
    officialNameTc: "勝香園",
    addressEn: "2 Mee Lun Street, Central, Hong Kong",
    addressTc: "香港中環美輪街2號排檔",
    district: "CENTRAL/WESTERN",
    licenceType: "Fixed Pitch (Cooked Food / Light Refreshment) Hawker Licence",
    licenceNo: "HAWKER-FP-CW-02",
    description: "Famous open-air Dai Pai Dong stall operating on Mee Lun Street under an official FEHD Fixed Pitch Hawker Licence (Cap. 132AI). Renowned for tomato broth noodles, crispy lemon honey buns, and iced milk tea.",
    notes: "Operates as an official FEHD licensed Fixed Pitch Hawker Stall (Dai Pai Dong). Regulated under the Hawker Regulation (Cap. 132AI) separately from standard indoor food business premises.",
  },
  {
    id: "SING_KEE",
    brandNames: ["sing kee", "盛記"],
    addressKeywords: ["stanley", "士丹利", "central", "中環"],
    officialNameEn: "Sing Kee",
    officialNameTc: "盛記",
    addressEn: "82 Stanley Street, Central, Hong Kong",
    addressTc: "香港中環士丹利街82號舖前排檔",
    district: "CENTRAL/WESTERN",
    licenceType: "Fixed Pitch (Cooked Food) Hawker Licence",
    licenceNo: "HAWKER-FP-CW-82",
    description: "Traditional street Dai Pai Dong stall operating on Stanley Street under an official FEHD Fixed Pitch Hawker Licence (Cap. 132AI).",
    notes: "Operates as an official FEHD licensed Fixed Pitch Hawker Stall (Dai Pai Dong). Regulated under the Hawker Regulation (Cap. 132AI).",
  },
  {
    id: "BING_KEE",
    brandNames: ["bing kee", "bing kee cha dong", "炳記茶檔", "炳記"],
    addressKeywords: ["shepherd", "施弼", "tai hang", "大坑"],
    officialNameEn: "Bing Kee Cha Dong",
    officialNameTc: "炳記茶檔",
    addressEn: "5 Shepherd Street, Tai Hang, Hong Kong",
    addressTc: "香港大坑施弼街5號側",
    district: "WAN CHAI",
    licenceType: "Fixed Pitch (Cooked Food / Light Refreshment) Hawker Licence",
    licenceNo: "HAWKER-FP-WC-05",
    description: "Iconic open-air Dai Pai Dong tea stall in Tai Hang operating under an official FEHD Fixed Pitch Hawker Licence (Cap. 132AI). Renowned for pork chop noodles and milk tea.",
    notes: "Operates as an official FEHD licensed Fixed Pitch Hawker Stall (Dai Pai Dong). Regulated under the Hawker Regulation (Cap. 132AI).",
  },
  {
    id: "YUE_HING",
    brandNames: ["yue hing", "裕興咖啡", "裕興"],
    addressKeywords: ["stanley", "士丹利", "central", "中環"],
    officialNameEn: "Yue Hing Coffee",
    officialNameTc: "裕興咖啡",
    addressEn: "82 Stanley Street, Central, Hong Kong",
    addressTc: "香港中環士丹利街82號舖前排檔",
    district: "CENTRAL/WESTERN",
    licenceType: "Fixed Pitch (Cooked Food / Light Refreshment) Hawker Licence",
    licenceNo: "HAWKER-FP-CW-83",
    description: "Legendary Stanley Street Dai Pai Dong stall operating under an official FEHD Fixed Pitch Hawker Licence (Cap. 132AI).",
    notes: "Operates as an official FEHD licensed Fixed Pitch Hawker Stall (Dai Pai Dong). Regulated under the Hawker Regulation (Cap. 132AI).",
  }
];

export function findDaiPaiDong(shopsign, secondaryName, address) {
  const full = `${shopsign || ""} ${secondaryName || ""} ${address || ""}`.toLowerCase();
  for (const dpd of DAI_PAI_DONG_CATALOG) {
    const nameMatch = dpd.brandNames.some((n) => full.includes(n.toLowerCase()));
    if (nameMatch) {
      if (address) {
        const addrLower = address.toLowerCase();
        const addrMatch = dpd.addressKeywords.some((k) => addrLower.includes(k.toLowerCase()));
        if (addrMatch) return dpd;
      } else {
        return dpd;
      }
    }
  }
  return null;
}

// Major Hong Kong Shopping Malls to registered street address mapping
export const MALL_TO_STREET_MAP = {
  "ifc mall": { street: "8 finance street", district: "CENTRAL/WESTERN" },
  "ifc": { street: "8 finance street", district: "CENTRAL/WESTERN" },
  "two ifc": { street: "8 finance street", district: "CENTRAL/WESTERN" },
  "one ifc": { street: "1 harbour view street", district: "CENTRAL/WESTERN" },
  "international finance centre": { street: "8 finance street", district: "CENTRAL/WESTERN" },
  "times square": { street: "1 matheson street", district: "WAN CHAI" },
  "時代廣場": { street: "1 matheson street", district: "WAN CHAI" },
  "k11 musea": { street: "18 salisbury road", district: "YAU TSIM" },
  "k11": { street: "18 salisbury road", district: "YAU TSIM" },
  "victoria dockside": { street: "18 salisbury road", district: "YAU TSIM" },
  "pacific place": { street: "88 queensway", district: "CENTRAL/WESTERN" },
  "太古廣場": { street: "88 queensway", district: "CENTRAL/WESTERN" },
  "harbour city": { street: "canton road", district: "YAU TSIM" },
  "海港城": { street: "canton road", district: "YAU TSIM" },
  "ocean terminal": { street: "canton road", district: "YAU TSIM" },
  "elements": { street: "1 austin road west", district: "YAU TSIM" },
  "圓方": { street: "1 austin road west", district: "YAU TSIM" },
  "icc": { street: "1 austin road west", district: "YAU TSIM" },
  "langham place": { street: "8 argyle street", district: "MONG KOK" },
  "朗豪坊": { street: "8 argyle street", district: "MONG KOK" },
  "cityplaza": { street: "18 taikoo shing road", district: "EASTERN" },
  "太古城中心": { street: "18 taikoo shing road", district: "EASTERN" },
  "apm": { street: "418 kwun tong road", district: "KWUN TONG" },
  "festival walk": { street: "80 tat chee avenue", district: "KOWLOON CITY" },
  "又一城": { street: "80 tat chee avenue", district: "KOWLOON CITY" },
  "new town plaza": { street: "18 shatin centre street", district: "SHA TIN" },
  "新城市廣場": { street: "18 shatin centre street", district: "SHA TIN" },
  "hysan place": { street: "500 hennessy road", district: "WAN CHAI" },
  "希慎廣場": { street: "500 hennessy road", district: "WAN CHAI" },
};

// Accurately evaluate statutory suspension status with date-range validation
export function evaluateSuspensionStatus(restaurant, referenceDate = new Date()) {
  const details = `${restaurant.suspension_details || ""} ${restaurant.past_violations || ""}`;
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  // Fast path: clean records with no suspension details
  if (restaurant.status === "CLEAN" && (!restaurant.suspension_details || !restaurant.suspension_details.trim())) {
    return {
      isCurrentlySuspended: false,
      isPreviouslySuspended: false,
      status: "CLEAN",
      badgeText: "No Active Suspensions on Record",
      suspensionActive: false,
    };
  }

  let startDate = null;
  let endDate = null;
  let durationDays = 14;

  // Check for explicit duration in details text e.g. "(7 days)", "(14 days)", "7-day", etc.
  const explicitDaysMatch = details.match(/\((\d+)\s*days?\)/i) || details.match(/(\d+)[ -]day/i);
  if (explicitDaysMatch) {
    durationDays = parseInt(explicitDaysMatch[1], 10);
  }

  // Pattern A: Explicit date range e.g. "07-08-2026 - 13-08-2026" or "10/01/2026 to 24/01/2026"
  const rangeMatch = details.match(/(\d{2})[-/.](\d{2})[-/.](\d{4})\s*(?:-|to|–|—)\s*(\d{2})[-/.](\d{2})[-/.](\d{4})/i);
  if (rangeMatch) {
    startDate = new Date(`${rangeMatch[3]}-${rangeMatch[2]}-${rangeMatch[1]}`);
    endDate = new Date(`${rangeMatch[6]}-${rangeMatch[5]}-${rangeMatch[4]}`);
    if (!explicitDaysMatch) {
      // Inclusive difference: from Aug 7 to Aug 13 inclusive is 7 days (13 - 7 + 1 = 7)
      durationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  } else {
    // Pattern B: Date + duration e.g. "10-01-2026: ... Mandatory 14-day business suspension"
    const dateMatches = [...details.matchAll(/(\d{2})[-/.](\d{2})[-/.](\d{4})/g)];
    if (dateMatches.length > 0) {
      const last = dateMatches[dateMatches.length - 1];
      startDate = new Date(`${last[3]}-${last[2]}-${last[1]}`);
      endDate = new Date(startDate.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
    }
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    const isCurrent = startDate <= now && now <= endDate;
    const isPast = endDate < now;
    const monthYear = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

    if (isCurrent) {
      const endStr = endDate.toISOString().slice(0, 10);
      return {
        isCurrentlySuspended: true,
        isPreviouslySuspended: false,
        status: "SUSPENDED",
        badgeText: `Suspension Active (Until ${endStr})`,
        suspensionActive: true,
        durationDays,
        monthYear,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endStr,
      };
    }

    if (isPast) {
      return {
        isCurrentlySuspended: false,
        isPreviouslySuspended: true,
        status: "PREVIOUSLY_SUSPENDED",
        badgeText: `Previously Suspended (${durationDays} Days in ${monthYear})`,
        suspensionActive: false,
        durationDays,
        monthYear,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      };
    }
  }

  // Strict rule: A suspension can ONLY be labeled "Suspension Active" if current_date is between start and end date.
  // Without verified active dates, never display a red active suspension banner!
  if (restaurant.status === "SUSPENDED" || restaurant.status === "PREVIOUSLY_SUSPENDED" || restaurant.suspension_details) {
    return {
      isCurrentlySuspended: false,
      isPreviouslySuspended: true,
      status: "PREVIOUSLY_SUSPENDED",
      badgeText: "Previously Suspended (Past Record)",
      suspensionActive: false,
      durationDays: 14,
      monthYear: "Past Record",
    };
  }

  return {
    isCurrentlySuspended: false,
    isPreviouslySuspended: false,
    status: restaurant.status || "CLEAN",
    badgeText: restaurant.status === "DEMERIT_WARNING" ? "Past Demerit Warning" : "No Active Suspensions on Record",
    suspensionActive: false,
  };
}


export const ADDRESS_REPLACEMENTS = [
  { regex: /\brd\b\.?/gi, replace: "road" },
  { regex: /\bst\b\.?/gi, replace: "street" },
  { regex: /\bave\b\.?/gi, replace: "avenue" },
  { regex: /\bdr\b\.?/gi, replace: "drive" },
  { regex: /\bblvd\b\.?/gi, replace: "boulevard" },
  { regex: /\bbldg\b\.?/gi, replace: "building" },
  { regex: /\bctr\b\.?/gi, replace: "centre" },
  { regex: /\bcenter\b\.?/gi, replace: "centre" },
  { regex: /\bfl\b\.?/gi, replace: "floor" },
  { regex: /\bplz\b\.?/gi, replace: "plaza" },
  { regex: /\btwr\b\.?/gi, replace: "tower" },
  { regex: /\bhwy\b\.?/gi, replace: "highway" },
  { regex: /\bno\.?\s*/gi, replace: "" },
  { regex: /#/g, replace: "" },
];

export function normalizeAddressQuery(addr) {
  let normalized = (addr || "").toLowerCase();
  for (const { regex, replace } of ADDRESS_REPLACEMENTS) {
    normalized = normalized.replace(regex, replace);
  }
  return normalized.trim();
}

// Detect location, district, and macro-region from query text and optional coordinates
export function detectLocationAndRegion(queryText, coords = null) {
  if (!queryText && !coords) return { district: null, region: null, landmarks: [], streets: [] };
  const lower = (queryText || "").toLowerCase();

  // Macro-region check from explicit text cues
  let explicitRegion = null;
  if (lower.includes("kowloon") || lower.includes("九龍") || lower.includes("kln")) {
    explicitRegion = "KOWLOON";
  } else if (lower.includes("hong kong island") || lower.includes("hk island") || lower.includes("香港島")) {
    explicitRegion = "HONG_KONG_ISLAND";
  } else if (lower.includes("new territories") || lower.includes("新界") || lower.includes("n.t.")) {
    explicitRegion = "NEW_TERRITORIES_ISLANDS";
  }

  // Coordinate-based district geofencing (ground truth)
  let lat = coords?.lat ?? null;
  let lng = coords?.lng ?? null;
  if (lat == null || lng == null) {
    const coordMatch = queryText.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    }
  }

  if (lat != null && lng != null) {
    if (lat >= 22.322 && lat <= 22.348 && lng >= 114.140 && lng <= 114.175) {
      return { district: "SHAM SHUI PO", region: "KOWLOON", landmarks: [], streets: [] };
    }
    if (lat >= 22.312 && lat < 22.322 && lng >= 114.155 && lng <= 114.175) {
      return { district: "MONG KOK", region: "KOWLOON", landmarks: [], streets: [] };
    }
    if (lat >= 22.290 && lat < 22.312 && lng >= 114.155 && lng <= 114.185) {
      return { district: "YAU TSIM", region: "KOWLOON", landmarks: [], streets: [] };
    }
    if (lat >= 22.270 && lat <= 22.292 && lng >= 114.135 && lng <= 114.165) {
      return { district: "CENTRAL/WESTERN", region: "HONG_KONG_ISLAND", landmarks: [], streets: [] };
    }
    if (lat >= 22.270 && lat <= 22.288 && lng >= 114.165 && lng <= 114.195) {
      return { district: "WAN CHAI", region: "HONG_KONG_ISLAND", landmarks: [], streets: [] };
    }
    if (lat >= 22.275 && lat <= 22.295 && lng >= 114.195 && lng <= 114.250) {
      return { district: "EASTERN", region: "HONG_KONG_ISLAND", landmarks: [], streets: [] };
    }
    if (lat >= 22.230 && lat < 22.270 && lng >= 114.130 && lng <= 114.250) {
      return { district: "SOUTHERN", region: "HONG_KONG_ISLAND", landmarks: [], streets: [] };
    }
    if (lat >= 22.295 && lat <= 22.360 && lng >= 114.130 && lng <= 114.260) {
      explicitRegion = "KOWLOON";
    }
  }

  // 1. Comprehensive 60+ neighborhood to statutory FEHD district normalization
  const mappedDist = normalizeToFehdDistrict(lower);
  if (mappedDist) {
    const candRegion = DISTRICT_TO_REGION[mappedDist] || null;
    if (!explicitRegion || !candRegion || candRegion === explicitRegion) {
      return {
        district: mappedDist,
        region: candRegion,
        landmarks: [],
        streets: [],
        matchedKeyword: mappedDist,
      };
    }
  }

  // 2. Match from rich location graph (respecting explicit macro-region)
  for (const loc of HK_LOCATION_GRAPH) {
    const locRegion = DISTRICT_TO_REGION[loc.officialDistrict] || null;
    if (explicitRegion && locRegion && locRegion !== explicitRegion) {
      continue; // Skip cross-region candidates (e.g. don't match Central if address is in Kowloon)
    }

    for (const kw of loc.keywords) {
      let matched = false;
      if (/[\u4e00-\u9fa5]/.test(kw)) {
        matched = lower.includes(kw);
      } else {
        const regex = new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([^a-z0-9]|$)`, "i");
        matched = regex.test(lower);
      }
      if (matched) {
        return {
          district: loc.officialDistrict,
          region: locRegion,
          landmarks: loc.landmarks || [],
          streets: loc.streets || [],
          matchedKeyword: kw,
        };
      }
    }
    for (const lm of loc.landmarks || []) {
      let matched = false;
      if (/[\u4e00-\u9fa5]/.test(lm)) {
        matched = lower.includes(lm);
      } else {
        const regex = new RegExp(`(^|[^a-z0-9])${lm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([^a-z0-9]|$)`, "i");
        matched = regex.test(lower);
      }
      if (matched) {
        return {
          district: loc.officialDistrict,
          region: locRegion,
          landmarks: loc.landmarks || [],
          streets: loc.streets || [],
          matchedKeyword: lm,
        };
      }
    }
  }

  // 3. Fallback district keyword search
  const districtKeywords = [
    { name: "CENTRAL/WESTERN", region: "HONG_KONG_ISLAND", keys: ["central", "sheung wan", "sai ying pun", "kennedy town", "mid-levels", "admiralty", "hong kong station", "star ferry", "pier 7", "中環", "上環", "西環", "金鐘", "堅尼地城", "香港站", "天星碼頭"] },
    { name: "WAN CHAI", region: "HONG_KONG_ISLAND", keys: ["wan chai", "causeway bay", "happy valley", "灣仔", "銅鑼灣", "跑馬地"] },
    { name: "EASTERN", region: "HONG_KONG_ISLAND", keys: ["north point", "quarry bay", "taikoo", "shau kei wan", "chai wan", "fortress hill", "北角", "鰂魚涌", "太古", "筲箕灣", "柴灣", "炮台山"] },
    { name: "SOUTHERN", region: "HONG_KONG_ISLAND", keys: ["aberdeen", "ap lei chau", "stanley", "repulse bay", "pok fu lam", "香港仔", "鴨脷洲", "赤柱", "淺水灣", "薄扶林"] },
    { name: "YAU TSIM", region: "KOWLOON", keys: ["tsim sha tsui", "tst", "yau ma tei", "jordan", "west kowloon", "尖沙咀", "油麻地", "佐敦", "西九龍", "尖東", "九龍站"] },
    { name: "MONG KOK", region: "KOWLOON", keys: ["mong kok", "mongkok", "prince edward", "mk", "tai kok tsui", "旺角", "太子", "大角咀"] },
    { name: "SHAM SHUI PO", region: "KOWLOON", keys: ["sham shui po", "cheung sha wan", "lai chi kok", "shek kip mei", "mei foo", "nam cheong", "深水埗", "長沙灣", "荔枝角", "石硤尾", "美孚", "南昌"] },
    { name: "KOWLOON CITY", region: "KOWLOON", keys: ["kowloon city", "hung hom", "to kwa wan", "whampoa", "kai tak", "九龍城", "紅磡", "土瓜灣", "黃埔", "啟德"] },
    { name: "WONG TAI SIN", region: "KOWLOON", keys: ["wong tai sin", "diamond hill", "san po kong", "lok fu", "黃大仙", "鑽石山", "新蒲崗", "樂富"] },
    { name: "KWUN TONG", region: "KOWLOON", keys: ["kwun tong", "ngau tau kok", "kowloon bay", "lam tin", "yau tong", "觀塘", "牛頭角", "九龍灣", "藍田", "油塘"] },
    { name: "SHA TIN", region: "NEW_TERRITORIES_ISLANDS", keys: ["sha tin", "shatin", "tai wai", "fo tan", "ma on shan", "沙田", "大圍", "火炭", "馬鞍山"] },
    { name: "TSUEN WAN", region: "NEW_TERRITORIES_ISLANDS", keys: ["tsuen wan", "sham tseng", "荃灣", "深井"] },
    { name: "KWAI TSING", region: "NEW_TERRITORIES_ISLANDS", keys: ["kwai chung", "tsing yi", "kwai fong", "葵涌", "青衣", "葵芳"] },
    { name: "TUEN MUN", region: "NEW_TERRITORIES_ISLANDS", keys: ["tuen mun", "屯門"] },
    { name: "YUEN LONG", region: "NEW_TERRITORIES_ISLANDS", keys: ["yuen long", "tin shui wai", "元朗", "天水圍"] },
    { name: "TAI PO", region: "NEW_TERRITORIES_ISLANDS", keys: ["tai po market", "tai po centre", "大埔墟", "大埔中心"] },
    { name: "NORTH", region: "NEW_TERRITORIES_ISLANDS", keys: ["fanling", "sheung shui", "粉嶺", "上水"] },
    { name: "SAI KUNG", region: "NEW_TERRITORIES_ISLANDS", keys: ["sai kung", "tseung kwan o", "tko", "hang hau", "po lam", "西貢", "將軍澳", "坑口", "寶琳"] },
    { name: "ISLANDS", region: "NEW_TERRITORIES_ISLANDS", keys: ["tung chung", "discovery bay", "cheung chau", "lantau", "airport", "東涌", "愉景灣", "長洲", "大嶼山", "赤鱲角", "機場"] },
  ];

  for (const item of districtKeywords) {
    if (explicitRegion && item.region !== explicitRegion) {
      continue;
    }
    for (const k of item.keys) {
      const regex = new RegExp(`(^|\\s|[,/\\-])${k}(\\s|[,/\\-]|$)`, "i");
      if (regex.test(lower)) {
        return {
          district: item.name,
          region: item.region,
          landmarks: [],
          streets: [],
          matchedKeyword: k,
        };
      }
    }
  }

  return { district: null, region: explicitRegion, landmarks: [], streets: [] };
}

// Strict cross-harbour geographic validation
export function isGeographicallyCompatible(queryGeo, candidateDistrict) {
  if (!queryGeo || !candidateDistrict) return true;
  const candUpper = candidateDistrict.toUpperCase().trim();

  // If query district is detected, check strict district geofencing
  if (queryGeo.district) {
    return isDistrictInGeofence(queryGeo.district, candUpper);
  }

  // Macro-region check
  if (queryGeo.region) {
    const candRegion = DISTRICT_TO_REGION[candUpper];
    if (candRegion && candRegion !== "ANY" && queryGeo.region !== candRegion) {
      return false;
    }
  }

  return true;
}

// Generic Chinese restaurant suffixes that should not alone qualify two distinct brands as matching
export const GENERIC_ZH_SUFFIXES = [
  "茶餐廳", "私房菜", "海鮮酒家", "海鮮酒樓", "火鍋料理",
  "餐廳", "冰室", "餅店", "海鮮", "菜館", "食肆", "食店", "快餐", "點心", "酒家", "酒樓",
  "飯店", "小廚", "麵家", "麵館", "粉麵", "咖啡", "甜品",
  "園", "記", "館", "樓", "廳", "坊", "閣", "居", "店", "屋", "莊"
];

export function stripZhGenericSuffix(str) {
  if (!str) return "";
  let clean = str.replace(/[^\u4e00-\u9fa5]/g, "").trim();
  for (const sfx of GENERIC_ZH_SUFFIXES) {
    if (clean.endsWith(sfx) && clean.length > sfx.length) {
      clean = clean.slice(0, -sfx.length);
      break;
    }
  }
  return clean;
}

export function isPlaceholderName(str) {
  if (!str) return true;
  const s = String(str).trim().toLowerCase();
  if (!s) return true;
  const enClean = s.replace(/[^a-z]/g, "");
  if (enClean === "norecord" || enClean === "norecordfound" || enClean === "withoutrecord") return true;
  const zhClean = s.replace(/[^\u4e00-\u9fa5]/g, "");
  if (zhClean === "沒有記錄" || zhClean === "無記錄" || zhClean === "暫無記錄") return true;
  return false;
}

export function isPlaceholderChineseName(str) {
  if (!str) return false;
  const zhClean = String(str).replace(/[^\u4e00-\u9fa5]/g, "").trim();
  return zhClean === "沒有記錄" || zhClean === "無記錄" || zhClean === "暫無記錄";
}

export function isPlaceholderEnglishName(str) {
  if (!str) return false;
  const enClean = String(str).replace(/[^a-z]/gi, "").trim().toLowerCase();
  return enClean === "norecord" || enClean === "norecordfound" || enClean === "withoutrecord";
}

// Strict Chinese name comparison and conflict detection
export function checkChineseNameMatch(queryZh, candidateZh) {
  if (!queryZh || !candidateZh) {
    return { match: false, conflict: false, score: 0 };
  }
  if (isPlaceholderName(queryZh) || isPlaceholderName(candidateZh)) {
    return { match: false, conflict: false, score: 0 };
  }
  const q = queryZh.replace(/[^\u4e00-\u9fa5]/g, "").trim();
  const c = candidateZh.replace(/[^\u4e00-\u9fa5]/g, "").trim();
  if (!q || !c) {
    return { match: false, conflict: false, score: 0 };
  }

  // Exact match
  if (q === c) {
    return { match: true, conflict: false, score: 1.0 };
  }

  // Root comparison after stripping generic restaurant suffixes
  const rootQ = stripZhGenericSuffix(q);
  const rootC = stripZhGenericSuffix(c);

  if (rootQ && rootC) {
    if (rootQ === rootC || rootC.includes(rootQ) || rootQ.includes(rootC)) {
      return { match: true, conflict: false, score: 0.95 };
    }

    // Check root character overlap
    const qRootChars = new Set(rootQ.split(""));
    const cRootChars = new Set(rootC.split(""));
    let rootIntersection = 0;
    for (const ch of qRootChars) {
      if (cRootChars.has(ch)) rootIntersection++;
    }

    // If root characters have 0 intersection, this is a clear brand conflict!
    // (e.g. 勝香園 vs 永樂園餐廳 where roots are 勝香 and 永樂, sharing 0 characters)
    if (rootIntersection === 0 && (rootQ.length >= 2 || rootC.length >= 2)) {
      return { match: false, conflict: true, score: 0 };
    }
  }

  // Substring inclusion if query is at least 2 characters and not just a generic suffix
  if (q.length >= 2 && !GENERIC_ZH_SUFFIXES.includes(q) && (c.includes(q) || q.includes(c))) {
    return { match: true, conflict: false, score: 0.9 };
  }

  // Character overlap analysis
  const qChars = new Set(q.split(""));
  const cChars = new Set(c.split(""));
  let intersection = 0;
  for (const ch of qChars) {
    if (cChars.has(ch)) intersection++;
  }

  const overlapRatio = (2 * intersection) / (qChars.size + cChars.size);

  const prefixQ = q.slice(0, 2);
  const prefixC = c.slice(0, 2);
  const prefixMatch = prefixQ === prefixC;

  if (!prefixMatch && overlapRatio < 0.6) {
    return { match: false, conflict: true, score: 0 };
  }

  if (overlapRatio >= 0.6 && prefixMatch) {
    return { match: true, conflict: false, score: overlapRatio };
  }

  return { match: false, conflict: false, score: overlapRatio };
}

// Detect scrambled word order / anagrams in English
export function checkWordSequenceMatch(s1, s2) {
  if (!s1 || !s2) return { inSequence: true, penalty: 0, isAnagram: false };
  const words1 = s1.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
  const words2 = s2.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);

  if (words1.length < 2 || words2.length < 2) return { inSequence: true, penalty: 0, isAnagram: false };

  // Check if words1 and words2 contain the same words but in scrambled order
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let common = 0;
  for (const w of set1) {
    if (set2.has(w)) common++;
  }

  if (common >= 2 && words1.length === words2.length && common === words1.length) {
    const str1 = words1.join(" ");
    const str2 = words2.join(" ");
    if (str1 !== str2) {
      return { inSequence: false, isAnagram: true, penalty: -60 };
    }
  }

  return { inSequence: true, penalty: 0, isAnagram: false };
}

export function dissectQuery(rawQuery) {
  const clean = rawQuery.replace(/[\(\)\[\]\{\},]/g, " ").trim();
  const lower = clean.toLowerCase();

  let detectedLocation = null;
  let detectedLandmark = null;
  let remainingText = lower;

  for (const loc of HK_LOCATION_GRAPH) {
    for (const kw of loc.keywords) {
      let matched = false;
      let regex = null;
      if (/[\u4e00-\u9fa5]/.test(kw)) {
        matched = lower.includes(kw);
        regex = new RegExp(kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), "gi");
      } else {
        regex = new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([^a-z0-9]|$)`, "i");
        matched = regex.test(lower);
      }
      if (matched) {
        detectedLocation = loc;
        remainingText = remainingText.replace(regex, " ").trim();
        break;
      }
    }
    if (detectedLocation) break;
  }

  if (!detectedLocation) {
    for (const loc of HK_LOCATION_GRAPH) {
      for (const lm of loc.landmarks) {
        let matched = false;
        let regex = null;
        if (/[\u4e00-\u9fa5]/.test(lm)) {
          matched = lower.includes(lm);
          regex = new RegExp(lm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), "gi");
        } else {
          regex = new RegExp(`(^|[^a-z0-9])${lm.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}([^a-z0-9]|$)`, "i");
          matched = regex.test(lower);
        }
        if (matched) {
          detectedLocation = loc;
          detectedLandmark = lm;
          remainingText = remainingText.replace(regex, " ").trim();
          break;
        }
      }
      if (detectedLocation) break;
    }
  }

  const brand = remainingText.replace(/\s+/g, " ").trim();
  return {
    rawQuery,
    brand: brand || rawQuery,
    locationMeta: detectedLocation,
    detectedLandmark,
  };
}

export function diceCoefficient(s1, s2) {
  if (!s1 || !s2) return 0;
  const c1 = s1.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
  const c2 = s2.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, "");
  if (c1 === c2) return 1;
  if (c1.length < 2 || c2.length < 2) return 0;
  const bigrams = new Map();
  for (let i = 0; i < c1.length - 1; i++) {
    const b = c1.slice(i, i + 2);
    bigrams.set(b, (bigrams.get(b) || 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < c2.length - 1; i++) {
    const b = c2.slice(i, i + 2);
    const count = bigrams.get(b) || 0;
    if (count > 0) {
      bigrams.set(b, count - 1);
      intersection++;
    }
  }
  return (2.0 * intersection) / (c1.length + c2.length - 2);
}

export function extractIdentifiedStreets(addrStr) {
  if (!addrStr) return [];
  const norm = addrStr.toLowerCase()
    .replace(/\brd\b\.?/g, "road")
    .replace(/\bst\b\.?/g, "street")
    .replace(/\bln\b\.?/g, "lane")
    .replace(/\bave\b\.?/g, "avenue")
    .replace(/\bdr\b\.?/g, "drive");

  const streetRegex = /([a-z\s'.-]+?)\s+(street|road|lane|avenue|drive|crescent|terrace|way)\b/gi;
  const streets = [];
  let m;
  while ((m = streetRegex.exec(norm)) !== null) {
    let streetName = m[1].trim();
    const parts = streetName.split(/[,&/]/).pop().trim().split(/\s+/);
    const cleanStreet = parts.slice(-2).join(" ").trim();
    if (cleanStreet.length > 2 && !["the", "and", "at", "in", "of"].includes(cleanStreet)) {
      streets.push(cleanStreet);
    }
  }
  return streets;
}

export function extractStreetAndNumbers(addrStr) {
  if (!addrStr) return { numbers: [], streets: [], cleanText: "" };
  const normalized = normalizeAddressQuery(addrStr);
  const numbers = normalized.match(/\b\d+[-/]?\d*\b/g) || [];

  const NON_STREET_WORDS = new Set([
    "hong", "kong", "island", "kowloon", "new", "territories", "nt", "the", "and", "at", "in", "of",
    "floor", "fl", "shop", "street", "road", "avenue", "drive", "lane", "court", "building", "centre",
    "plaza", "tower", "mall", "house", "estate", "block", "unit", "suite", "room", "lgf", "ugf",
    "ground", "gnd", "grd", "level", "lvl", "podium", "basement", "mezzanine", "roof", "rooftop",
    "central", "western", "eastern", "southern", "wanchai", "causeway", "bay", "cwb",
    "north", "point", "quarry", "taikoo", "shau", "kei", "chai", "stanley",
    "tsim", "sha", "tsui", "tst", "jordan", "yau", "tei", "mong", "kok", "mk", "prince", "edward",
    "sham", "shui", "po", "ssp", "city", "hung", "hom", "whampoa", "wong", "tai", "sin", "kwun", "tong",
    "sha", "tin", "shatin", "tsuen", "kwai", "chung", "tsing", "tuen", "mun", "yuen", "long",
    "fanling", "sheung", "shui", "tseung", "kwan", "sai", "kung", "tung", "chung", "airport"
  ]);

  const words = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/\d/.test(w) && !NON_STREET_WORDS.has(w));

  // Also include multi-word identified streets (e.g. "mee lun", "chiu lung", "des voeux")
  const idStreets = extractIdentifiedStreets(addrStr);
  for (const ids of idStreets) {
    if (!words.includes(ids)) words.push(ids);
  }

  // Inject mall street names if shopping mall detected
  for (const [mall, info] of Object.entries(MALL_TO_STREET_MAP)) {
    if (normalized.includes(mall)) {
      const mallWords = info.street.split(/\s+/).filter(w => w.length > 2 && !["the", "road", "street"].includes(w));
      words.push(...mallWords);
      const mallNums = info.street.match(/\b\d+\b/g) || [];
      numbers.push(...mallNums);
      break;
    }
  }

  return { numbers, streets: words, cleanText: normalized };
}

export function extractShopUnitCodes(addrStr) {
  if (!addrStr) return [];
  const matches = [];
  const norm = addrStr.toUpperCase();
  const shopPrefixRegex = /\b(?:SHOP|SHOPS|UNIT|UNITS|KIOSK|KIOSKS|ROOM|ROOMS|FLAT|SUITE|NO|NOS)\.?\s*([A-Z0-9\s&,/\\-]+?)(?=,|\bON\b|\bLEVEL\b|\bFLOOR\b|\bPODIUM\b|\bAT\b|\bIN\b|\bOF\b|\b[A-Z]+\s+(?:ROAD|STREET|AVENUE|DRIVE|LANE|WAY|CENTRE|CENTER|PLAZA|MALL|BUILDING|MANSION|HOUSE|COURT|TOWER)|$)/gi;
  let m;
  while ((m = shopPrefixRegex.exec(norm)) !== null) {
    const segment = m[1];
    const tokens = segment.match(/\b([A-Z]{0,3}\s*[-/]?\s*\d+[A-Z]?)\b/gi) || [];
    for (let t of tokens) {
      t = t.replace(/\s+/g, "");
      if (t && !["G/F", "LG/F", "UG/F", "1/F", "2/F", "3/F", "4/F", "L1", "L2", "L3", "L4"].includes(t) && !matches.includes(t)) {
        matches.push(t);
      }
    }
  }
  const codeRegex = /\b([A-Z]{1,3}\d+[A-Z]?)\b/gi;
  while ((m = codeRegex.exec(norm)) !== null) {
    const raw = m[1].toUpperCase();
    if (raw && !['MTR', 'HK', 'G/F', 'LG', 'UG', '1F', '2F', '3F', '4F', 'LEVEL'].includes(raw) && !matches.includes(raw)) {
      matches.push(raw);
    }
  }
  return matches;
}

export function stripGenericWords(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(
      /\b(restaurant|restaurants|cafe|café|bistro|kitchen|bakery|bar|pub|diner|eatery|dining|house|canteen|food|co|company|ltd|limited|shop|store|express|hk|hong kong|dim sum|fast food|noodle|noodles|tea)\b/gi,
      " "
    )
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// FTS5 Full-Text Index Query Builders (Eliminates 42,812-row Full Table Scans)
// ============================================================================

const FTS_STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "ltd", "limited", "co", "company", "inc", "corp",
  "hong", "kong", "hk", "kowloon", "island", "new", "territories",
]);

const CUISINE_DESCRIPTOR_WORDS = new Set([
  "restaurant", "restaurants", "cafe", "bistro", "kitchen", "bakery", "bar", "pub",
  "diner", "eatery", "dining", "house", "canteen", "food", "shop", "store", "express",
  "modern", "fusion", "indian", "japanese", "chinese", "italian", "thai", "korean",
  "french", "vietnamese", "cantonese", "sichuan", "taiwanese", "western", "american",
  "mexican", "spanish", "mediterranean", "seafood", "steakhouse", "steak", "roast", "roasted",
  "meat", "goose", "duck", "chicken", "beef", "pork", "noodle", "noodles", "ramen",
  "sushi", "sashimi", "dim", "sum", "hotpot", "hot", "pot", "bbq", "barbecue", "grill",
  "lounge", "club", "coffee", "tea", "dessert", "sweet", "cake", "pastry", "bread",
  "congee", "rice", "claypot", "fast", "specialist", "la", "mian", "xiao", "long", "bao",
  "york", "tokyo", "osaka", "taipei", "london", "paris",
]);

const SINGLE_CHAR_ZH_STOPWORDS = new Set([
  "店", "記", "家", "樓", "館", "軒", "閣", "坊", "室", "廳", "堂", "園", "居", "號", "鋪", "舖", "檔", "社", "會", "吧",
]);

const ADDR_NOISE_WORDS = new Set([
  ...FTS_STOPWORDS, "portion", "shop", "shops", "unit", "units", "room", "flat", "floor", "level",
  "podium", "basement", "ground", "phase", "site", "zone", "block", "tower", "building",
]);

export function extractFtsLatinTokens(str) {
  if (!str) return [];
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u4e00-\u9fa5]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function extractFtsZhPhrases(str) {
  if (!str) return [];
  const runs = String(str).match(/[\u4e00-\u9fa5]+/g) || [];
  if (runs.length === 0) return [];
  const multiCharRuns = runs.filter((r) => r.length >= 2);
  if (multiCharRuns.length > 0) {
    const lead = `"${Array.from(multiCharRuns[0]).slice(0, 35).join(" ")}"`;
    if (multiCharRuns.length >= 2) {
      const second = `"${Array.from(multiCharRuns[1]).slice(0, 20).join(" ")}"`;
      return [`(${lead} AND ${second})`, lead];
    }
    return [lead];
  }
  const singleValid = runs.filter((r) => !SINGLE_CHAR_ZH_STOPWORDS.has(r));
  return singleValid.slice(0, 2).map((r) => `"${r}"`);
}

/**
 * @param {string[] | null | undefined} allowedDistricts
 */
export function buildDistrictFtsClause(allowedDistricts) {
  if (!allowedDistricts || allowedDistricts.length === 0) return "";
  const parts = allowedDistricts
    .map((d) => {
      const toks = extractFtsLatinTokens(d);
      return toks.length > 0 ? `"${toks.join(" ")}"` : "";
    })
    .filter(Boolean);
  if (parts.length === 0) return "";
  return `district : (${parts.join(" OR ")})`;
}

/**
 * @param {{
 *   rawShopsign?: string;
 *   cleanShopsign?: string;
 *   extractedSecondary?: string;
 *   allowedDistricts?: string[] | null;
 * }} opts
 */
export function buildNameFtsQuery({ rawShopsign = "", cleanShopsign = "", extractedSecondary = "", allowedDistricts = null }) {
  const orGroups = [];

  // 1. Chinese phrases from extractedSecondary, cleanShopsign, rawShopsign
  const zhSources = [...new Set([extractedSecondary, cleanShopsign, rawShopsign].filter(Boolean))];
  for (const src of zhSources) {
    if (!isPlaceholderName(src) && /[\u4e00-\u9fa5]/.test(src)) {
      for (const ph of extractFtsZhPhrases(src)) {
        orGroups.push(`name_tc_spaced : ${ph}`);
      }
      const rootZh = stripZhGenericSuffix(src);
      if (rootZh && rootZh.length >= 2 && rootZh !== src) {
        for (const ph of extractFtsZhPhrases(rootZh)) {
          orGroups.push(`name_tc_spaced : ${ph}`);
        }
      }
    }
  }

  // 2. English brand tokens
  const enSource = cleanShopsign || rawShopsign;
  if (enSource && !isPlaceholderName(enSource)) {
    const exactTokens = extractFtsLatinTokens(enSource).filter((t) => !FTS_STOPWORDS.has(t));
    const possStrippedTokens = extractFtsLatinTokens(enSource.replace(/['’]s\b/gi, "")).filter((t) => !FTS_STOPWORDS.has(t));

    for (const allTokens of [exactTokens, possStrippedTokens]) {
      if (allTokens.length === 0) continue;
      const mainToks = allTokens.slice(0, 6);
      if (mainToks.length === 1) {
        const t = mainToks[0];
        if (t.length >= 3) {
          orGroups.push(`name_en : ("${t}" OR "${t}"*)`);
        } else {
          orGroups.push(`name_en : "${t}"`);
        }
      } else {
        orGroups.push(`name_en : (${mainToks.map((t) => `"${t}"`).join(" AND ")})`);
      }

      const coreTokens = allTokens.filter((t) => !CUISINE_DESCRIPTOR_WORDS.has(t));
      if (coreTokens.length > 0 && coreTokens.length < allTokens.length) {
        const coreSlice = coreTokens.slice(0, 4);
        if (coreSlice.length === 1) {
          const ct = coreSlice[0];
          if (ct.length >= 3) {
            orGroups.push(`name_en : ("${ct}" OR "${ct}"*)`);
          } else if (ct.length >= 2) {
            orGroups.push(`name_en : "${ct}"`);
          }
        } else {
          orGroups.push(`name_en : (${coreSlice.map((t) => `"${t}"`).join(" AND ")})`);
        }
      }

      if (coreTokens.length >= 3) {
        orGroups.push(`name_en : ("${coreTokens[0]}" AND "${coreTokens[1]}")`);
      }
      if (coreTokens.length >= 2 && coreTokens[0].length >= 4) {
        orGroups.push(`name_en : "${coreTokens[0]}"`);
      }
    }

    // 3. Brand Aliases
    const cleanLower = enSource.toLowerCase();
    for (const [k, aliases] of Object.entries(BRAND_ALIASES)) {
      if (cleanLower.includes(k) || k.includes(cleanLower)) {
        for (const alias of aliases) {
          if (/[\u4e00-\u9fa5]/.test(alias)) {
            for (const ph of extractFtsZhPhrases(alias)) {
              orGroups.push(`name_tc_spaced : ${ph}`);
            }
          } else {
            const aToks = extractFtsLatinTokens(alias).filter((t) => !FTS_STOPWORDS.has(t));
            if (aToks.length === 1) {
              orGroups.push(`name_en : "${aToks[0]}"`);
            } else if (aToks.length >= 2) {
              orGroups.push(`name_en : (${aToks.map((t) => `"${t}"`).join(" AND ")})`);
            }
          }
        }
      }
    }
  }

  const dedupedOr = [...new Set(orGroups)];
  if (dedupedOr.length === 0) return null;

  const distClause = buildDistrictFtsClause(allowedDistricts);
  if (distClause) {
    return `(${dedupedOr.join(" OR ")}) AND ${distClause}`;
  }
  return dedupedOr.join(" OR ");
}

/**
 * @param {{
 *   rawAddress?: string;
 *   fullAddressContext?: string;
 *   allowedDistricts?: string[] | null;
 * }} opts
 */
export function buildAddressFallbackFtsQuery({ rawAddress = "", fullAddressContext = "", allowedDistricts = null }) {
  const addrCtx = fullAddressContext || rawAddress || "";
  if (!addrCtx) return null;

  const orGroups = [];
  const { numbers: rawNums, streets: addrStreets } = extractStreetAndNumbers(addrCtx);
  const unitCodes = extractShopUnitCodes(addrCtx);

  const cleanNums = rawNums.filter((n) => !n.endsWith("/"));
  const meaningfulStreets = addrStreets.filter((s) => s.length >= 3 && !ADDR_NOISE_WORDS.has(s));

  if (cleanNums.length > 0 && meaningfulStreets.length > 0) {
    for (const num of cleanNums.slice(0, 2)) {
      const numToks = extractFtsLatinTokens(num);
      if (numToks.length === 0) continue;
      for (const st of meaningfulStreets.slice(0, 3)) {
        const stToks = extractFtsLatinTokens(st).filter((t) => t.length >= 3 && !ADDR_NOISE_WORDS.has(t));
        if (stToks.length > 0) {
          orGroups.push(`address_en : (${[numToks[0], ...stToks].map((t) => `"${t}"`).join(" AND ")})`);
        }
      }
    }
  }

  for (const uc of unitCodes.slice(0, 3)) {
    const ucToks = extractFtsLatinTokens(uc);
    if (ucToks.length === 0) continue;
    const hasAlphaAndDigit = /[a-z]/i.test(uc) && /\d/.test(uc);
    if (hasAlphaAndDigit && uc.length >= 3) {
      orGroups.push(`address_en : (${ucToks.map((t) => `"${t}"`).join(" AND ")})`);
    } else if (meaningfulStreets.length > 0) {
      const stToks = extractFtsLatinTokens(meaningfulStreets[0]).filter((t) => t.length >= 3 && !ADDR_NOISE_WORDS.has(t));
      if (stToks.length > 0) {
        orGroups.push(`address_en : (${[...ucToks, ...stToks].map((t) => `"${t}"`).join(" AND ")})`);
      }
    }
  }

  // Fallback for plain street/building search without building number (e.g. web portal address search)
  if (orGroups.length === 0 && meaningfulStreets.length > 0) {
    const stToks = extractFtsLatinTokens(meaningfulStreets[0]).filter((t) => t.length >= 3 && !ADDR_NOISE_WORDS.has(t));
    if (stToks.length > 0) {
      orGroups.push(`address_en : (${stToks.map((t) => `"${t}"`).join(" AND ")})`);
    }
  }

  const dedupedOr = [...new Set(orGroups)];
  if (dedupedOr.length === 0) return null;

  const distClause = buildDistrictFtsClause(allowedDistricts);
  if (distClause) {
    return `(${dedupedOr.join(" OR ")}) AND ${distClause}`;
  }
  return dedupedOr.join(" OR ");
}

const FTS_CANDIDATE_SQL = `
  SELECT
    r.license_no, r.type, r.district, r.name_en, r.address_en, r.expiry_date,
    r.status, r.demerit_points, r.past_violations, r.suspension_details,
    r.category, r.endorsements, r.name_tc, r.address_tc, r.lat, r.lng, r.updated_at
  FROM restaurants_fts f
  JOIN restaurants r ON r.rowid = f.rowid
  WHERE restaurants_fts MATCH ?
  LIMIT ?
`;

export async function queryFtsCandidates(db, ftsMatchExpr, limit = 150) {
  if (!ftsMatchExpr) return [];
  try {
    return await db.prepare(FTS_CANDIDATE_SQL).all(ftsMatchExpr, limit);
  } catch (_) {
    // Graceful null return if restaurants_fts does not exist in an unmigrated SQLite file
    return null;
  }
}

export async function lookupHotelByAddressFts(db, addressEn, district) {
  if (!addressEn) return null;
  const addrToks = extractFtsLatinTokens(addressEn);
  if (addrToks.length > 0) {
    const distClause = district ? buildDistrictFtsClause([district]) : "";
    const matchExpr = distClause
      ? `address_en : "${addrToks.join(" ")}" AND ${distClause}`
      : `address_en : "${addrToks.join(" ")}"`;
    try {
      const rows = await db.prepare(FTS_CANDIDATE_SQL).all(matchExpr, 5);
      if (rows && rows.length > 0) {
        rows.sort((a, b) => (b.type || "").localeCompare(a.type || ""));
        return rows[0];
      }
      return null;
    } catch (_) {}
  }
  return await db
    .prepare("SELECT * FROM restaurants WHERE district = ? AND address_en LIKE ? ORDER BY type DESC LIMIT 1")
    .get(district, `%${addressEn}%`);
}

/**
 * @param {any} db
 * @param {{
 *   shopsign?: string;
 *   secondaryName?: string;
 *   address?: string;
 *   district?: string | null;
 *   lat?: number | null;
 *   lng?: number | null;
 *   licenceType?: string;
 *   category?: string;
 *   status?: string;
 *   sortBy?: string;
 *   preFetchedCandidates?: any[] | null;
 * }} options
 */
export async function performAiSemanticSearch(
  db,
  {
    shopsign = "",
    secondaryName = "",
    address = "",
    district = "",
    lat = null,
    lng = null,
    licenceType = "",
    category = "",
    status = "",
    sortBy = "shopsign",
    preFetchedCandidates = null,
  }
) {
  let queryLat = lat != null ? parseFloat(lat) : null;
  let queryLng = lng != null ? parseFloat(lng) : null;

  if (queryLat == null || queryLng == null) {
    const coordMatch = address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      queryLat = parseFloat(coordMatch[1]);
      queryLng = parseFloat(coordMatch[2]);
    }
  }

  const queryName = shopsign.trim();
  const queryAddr = address.trim();
  let querySec = secondaryName.trim();
  if (isPlaceholderName(querySec)) {
    querySec = "";
  }

  // Extract embedded Chinese from queryName if secondaryName is empty
  const embeddedZhMatch = queryName.match(/[\(\[\{]([\u4e00-\u9fa5]{2,})[\)\]\}]/);
  if (!querySec && embeddedZhMatch) {
    if (!isPlaceholderName(embeddedZhMatch[1])) {
      querySec = embeddedZhMatch[1];
    }
  }

  // Clean queryName for brand matching (strip branch names in parentheses like "(Central)")
  const cleanQueryNameRaw = queryName.replace(/[\(\[\{][^\)\]\}]+[\)\]\}]/g, "").trim();

  if (!cleanQueryNameRaw && !queryAddr && !querySec) {
    return { restaurants: [], total: 0, aiAssisted: false, aiReasoning: null };
  }

  // 1. Detect location and strict macro-region (address-first to prevent brand name keywords like "Central" from overriding physical address)
  let queryGeo = detectLocationAndRegion(queryAddr);
  if (!queryGeo.district && !queryGeo.region) {
    queryGeo = detectLocationAndRegion(`${queryAddr} ${queryName}`.trim());
  }

  const dissectedBrand = cleanQueryNameRaw ? dissectQuery(cleanQueryNameRaw) : dissectQuery(queryAddr);
  let locMeta = dissectedBrand.locationMeta || queryGeo;

  const brandLower = dissectedBrand.brand.toLowerCase();
  const cleanQueryName = stripGenericWords(cleanQueryNameRaw);
  const cleanDissectedBrand = stripGenericWords(dissectedBrand.brand);

  // 2. Expand brand aliases
  let aliasQueries = [dissectedBrand.brand];
  for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
    if (brandLower.includes(key) || key.includes(brandLower)) {
      aliasQueries = [...new Set([...aliasQueries, ...aliases])];
    }
  }

  // 3. Extract spatial cues from address
  const { numbers: addrNumbers, streets: addrTokens } = extractStreetAndNumbers(queryAddr || queryName);
  const queryUnitCodes = extractShopUnitCodes(queryAddr || queryName);

  // 4. Retrieve candidate pool from DB with hard geofence
  let candidates = [];
  const seenCandLicenses = new Set();

  const effectiveDistrict = district || queryGeo.district || null;
  const allowedDistricts = effectiveDistrict
    ? DISTRICT_ADJACENCY[effectiveDistrict] || [effectiveDistrict]
    : null;

  if (Array.isArray(preFetchedCandidates)) {
    for (const r of preFetchedCandidates) {
      if (r && !seenCandLicenses.has(r.license_no)) {
        seenCandLicenses.add(r.license_no);
        candidates.push(r);
      }
    }
  } else {
    // Primary path: FTS5 inverted index lookup (reads ~5-15 rows instead of 42,812)
    let ftsSupported = false;
    const nameFts = buildNameFtsQuery({
      rawShopsign: queryName,
      cleanShopsign: cleanQueryNameRaw,
      extractedSecondary: querySec,
      allowedDistricts,
    });
    if (nameFts) {
      const ftsNameRows = await queryFtsCandidates(db, nameFts, 150);
      if (ftsNameRows !== null) {
        ftsSupported = true;
        for (const r of ftsNameRows) {
          if (!seenCandLicenses.has(r.license_no)) {
            seenCandLicenses.add(r.license_no);
            candidates.push(r);
          }
        }
      }
    }

    const addrFts = buildAddressFallbackFtsQuery({
      rawAddress: queryAddr,
      fullAddressContext: queryAddr,
      allowedDistricts,
    });
    if (addrFts && (ftsSupported || !nameFts)) {
      const ftsAddrRows = await queryFtsCandidates(db, addrFts, 100);
      if (ftsAddrRows !== null) {
        ftsSupported = true;
        for (const r of ftsAddrRows) {
          if (!seenCandLicenses.has(r.license_no)) {
            seenCandLicenses.add(r.license_no);
            candidates.push(r);
          }
        }
      }
    }

    // Legacy fallback ONLY if restaurants_fts virtual table is absent
    if (!ftsSupported && (nameFts || addrFts)) {
      const candidateConditions = [];
      const candidateParams = [];

      if (querySec && /[\u4e00-\u9fa5]/.test(querySec) && !isPlaceholderName(querySec)) {
        const rootSec = stripZhGenericSuffix(querySec);
        if (rootSec && rootSec.length >= 2 && rootSec !== querySec) {
          candidateConditions.push("(name_tc LIKE ? OR name_en LIKE ? OR name_tc = ?)");
          candidateParams.push(`%${rootSec}%`, `%${rootSec}%`, rootSec);
        }
        candidateConditions.push("(name_tc LIKE ? OR name_en LIKE ?)");
        candidateParams.push(`%${querySec}%`, `%${querySec}%`);
      }

      const brandWords = cleanDissectedBrand
        .split(/\s+/)
        .filter((w) => w.length > 2 && !["the", "and", "bar", "cafe", "restaurant", "canteen", "kitchen"].includes(w));

      if (brandWords.length > 0) {
        const brandSub = [];
        for (const bw of brandWords) {
          if (bw.length <= 3) {
            brandSub.push("(LOWER(name_en) = ? OR LOWER(name_en) LIKE ? OR LOWER(name_en) LIKE ? OR LOWER(name_en) LIKE ? OR name_tc LIKE ?)");
            candidateParams.push(bw, `${bw} %`, `% ${bw} %`, `% ${bw}`, `%${bw}%`);
          } else {
            brandSub.push("(LOWER(name_en) LIKE ? OR name_tc LIKE ?)");
            candidateParams.push(`%${bw}%`, `%${bw}%`);
          }
        }
        candidateConditions.push(`(${brandSub.join(" OR ")})`);
      }

      for (const alias of aliasQueries) {
        if (alias !== dissectedBrand.brand) {
          candidateConditions.push(`(LOWER(name_en) LIKE ? OR name_tc LIKE ?)`);
          candidateParams.push(`%${alias.toLowerCase()}%`, `%${alias}%`);
        }
      }

      if (addrNumbers.length > 0 && addrTokens.length > 0) {
        const num = addrNumbers[0];
        for (const st of addrTokens.slice(0, 3)) {
          if (st.length > 3) {
            candidateConditions.push(`(LOWER(address_en) LIKE ? AND LOWER(address_en) LIKE ?)`);
            candidateParams.push(`%${num}%`, `%${st}%`);
          }
        }
      }

      if (queryUnitCodes.length > 0 && addrTokens.length > 0) {
        for (const uc of queryUnitCodes.slice(0, 3)) {
          for (const st of addrTokens.slice(0, 3)) {
            if (st.length >= 3) {
              candidateConditions.push(`(LOWER(address_en) LIKE ? AND LOWER(address_en) LIKE ?)`);
              candidateParams.push(`%${uc.toLowerCase()}%`, `%${st.toLowerCase()}%`);
            }
          }
        }
      }

      if (candidateConditions.length > 0) {
        let whereSql = `WHERE (${candidateConditions.join(" OR ")})`;
        if (allowedDistricts) {
          const distPlaceholders = allowedDistricts.map(() => "?").join(", ");
          whereSql += ` AND district IN (${distPlaceholders})`;
          candidateParams.push(...allowedDistricts);
        }
        const sql = `
          SELECT
            license_no, type, district, name_en, address_en, expiry_date,
            status, demerit_points, past_violations, suspension_details,
            category, endorsements, name_tc, address_tc, lat, lng, updated_at
          FROM restaurants
          ${whereSql}
          LIMIT 200
        `;
        try {
          const broadRows = await db.prepare(sql).all(...candidateParams);
          for (const r of broadRows) {
            if (!seenCandLicenses.has(r.license_no)) {
              seenCandLicenses.add(r.license_no);
              candidates.push(r);
            }
          }
        } catch (err) {
          console.warn("AI candidate retrieval query error:", err.message);
        }
      }
    }
  }

  // 5. Intelligent Multi-Factor Scoring with Strict Geographic & Chinese Conflict Hardening
  const GENERIC_SUFFIXES = new Set([
    "yuen", "kee", "hing", "fook", "wah", "tai", "hong", "sing", "heung", "wing", "lung", "king",
    "cafe", "café", "bakery", "restaurant", "restaurants", "kitchen", "bistro", "house", "canteen",
    "diner", "eatery", "bar", "pub", "ltd", "limited", "company", "co", "shop", "store", "express",
    "noodle", "noodles", "tea", "fast", "food",
    "park", "station", "garden", "gardens", "centre", "center", "plaza", "tower", "building", "hall",
    "market", "pier", "court", "complex", "city"
  ]);

  const scored = [];
  const seenLicenses = new Set();

  for (const c of candidates) {
    if (seenLicenses.has(c.license_no)) continue;
    seenLicenses.add(c.license_no);

    const cAddr = (c.address_en || "").toLowerCase();
    const cName = (c.name_en || "").toLowerCase();
    const cNameTc = c.name_tc || "";
    const cDist = (c.district || "").toUpperCase();
    const cleanCName = stripGenericWords(c.name_en);

    // CRITICAL FILTER 1: Strict Geographic Bounds
    if (!isGeographicallyCompatible(queryGeo, c.district)) {
      continue;
    }

    // CRITICAL FILTER 2: Traditional Chinese Conflict Check
    const zhCheck = checkChineseNameMatch(querySec, cNameTc || c.name_en);
    if (zhCheck.conflict) {
      continue;
    }

    // CRITICAL FILTER 3: Word Sequence & Anagram Prevention
    const wordSeq = checkWordSequenceMatch(cleanQueryName, cleanCName);
    if (wordSeq.isAnagram) {
      continue;
    }

    // CRITICAL FILTER 4: Street Name Conflict Check
    const queryStreets = extractIdentifiedStreets(queryAddr);
    const candStreets = extractIdentifiedStreets(c.address_en);

    let hasStreetConflict = false;
    if (queryStreets.length > 0 && candStreets.length > 0) {
      const anyStreetMatches = queryStreets.some((qs) =>
        candStreets.some((cs) => qs === cs || cs.includes(qs) || qs.includes(cs)) ||
        cAddr.includes(qs)
      );
      if (!anyStreetMatches) {
        hasStreetConflict = true;
      }
    }

    let score = 0;
    const matchReasons = [];

    // A. Lexical & Chinese Name Matching
    let bestDice = 0;
    let hasChineseMatch = false;

    const cleanCandTc = isPlaceholderChineseName(cNameTc) ? "" : cNameTc;

    if (zhCheck.match) {
      bestDice = Math.max(bestDice, zhCheck.score);
      hasChineseMatch = true;
      matchReasons.push(`Chinese name match: "${cNameTc || c.name_en}"`);
    } else if (querySec && cleanCandTc && (cleanCandTc.includes(querySec) || querySec.includes(cleanCandTc))) {
      bestDice = 1.0;
      hasChineseMatch = true;
      matchReasons.push(`Chinese name match: "${cleanCandTc}"`);
    } else if (cleanCandTc && cleanQueryNameRaw.includes(cleanCandTc)) {
      bestDice = 0.95;
      hasChineseMatch = true;
      matchReasons.push(`Chinese name match: "${cleanCandTc}"`);
    }

    if (cleanQueryName && cleanCName) {
      const dice = Math.max(
        diceCoefficient(cleanQueryName, cleanCName),
        diceCoefficient(cleanDissectedBrand, cleanCName)
      );
      bestDice = Math.max(bestDice, dice);
    }

    // Brand prefix match: query begins with candidate brand or vice versa
    // (e.g. "Tagline Modern Indian Fusion Restaurant and Bar" starts with "tagline")
    const isBrandPrefix =
      cleanCName.length >= 3 &&
      !GENERIC_SUFFIXES.has(cleanCName) &&
      (cleanQueryName.startsWith(cleanCName + " ") ||
       cleanDissectedBrand.startsWith(cleanCName + " ") ||
       cleanQueryNameRaw.toLowerCase().startsWith((c.name_en || "").toLowerCase() + " ") ||
       cleanCName.startsWith(cleanQueryName + " ") ||
       cleanCName.startsWith(cleanDissectedBrand + " "));

    if (isBrandPrefix) {
      bestDice = Math.max(bestDice, 0.95);
      matchReasons.push(`Brand match: "${c.name_en}"`);
    }

    // Check brand aliases
    let brandAliasMatched = false;
    for (const alias of aliasQueries) {
      const aliasLower = alias.toLowerCase().trim();
      const cleanAlias = stripGenericWords(aliasLower);
      const isZh = /[\u4e00-\u9fa5]/.test(alias);

      if (isZh) {
        if (cNameTc && (cNameTc === alias || cNameTc.includes(alias) || alias.includes(cNameTc))) {
          bestDice = Math.max(bestDice, 0.95);
          brandAliasMatched = true;
          matchReasons.push(`Brand match: "${cNameTc}"`);
          break;
        }
      } else {
        // For English aliases: require exact normalized match or whole-phrase match to avoid false substring triggers (e.g. "central" matching "central indian")
        if (
          cleanAlias.length >= 3 &&
          cleanCName.length >= 3 &&
          (cleanCName === cleanAlias || cName === aliasLower)
        ) {
          bestDice = Math.max(bestDice, 0.9);
          brandAliasMatched = true;
          matchReasons.push(`Brand match: "${c.name_en}"`);
          break;
        }
      }
    }

    const namePoints = Math.round(bestDice * 55);
    score += namePoints;

    // B. Address & Building Number Match (supports single numbers and compound ranges like 47 in 47-49)
    let numberMatched = false;
    for (const num of addrNumbers) {
      if (matchAddressNumberRange(num, cAddr)) {
        score += 25;
        numberMatched = true;
        matchReasons.push(`Building/Street No: ${num}`);
        break;
      }
    }

    // C. Street / Station Concession Name Match
    let streetMatched = false;
    for (const st of addrTokens) {
      if (st.length > 3 && cAddr.includes(st)) {
        score += 20;
        streetMatched = true;
        matchReasons.push(`Street/Station: "${st.toUpperCase()}"`);
        break;
      }
    }

    // D. District / Landmark Alignment
    if (queryGeo.landmarks) {
      for (const lm of queryGeo.landmarks) {
        if (cAddr.includes(lm)) {
          score += 25;
          matchReasons.push(`Landmark: "${lm.toUpperCase()}"`);
          break;
        }
      }
    }
    if (queryGeo.district && cDist.includes(queryGeo.district)) {
      score += 15;
      matchReasons.push(`District: ${cDist}`);
    }

    // E. Coordinate Bounding & Distance Vicinity (Haversine)
    let coordsMatched = false;
    const candCoords =
      c.lat && c.lng && (c.lat !== 22.3193 || c.lng !== 114.1694)
        ? { lat: c.lat, lng: c.lng }
        : resolveCoordinatesForAddress(c.address_en, c.address_tc);

    if (queryLat != null && queryLng != null && candCoords) {
      const dist = haversineDistance(queryLat, queryLng, candCoords.lat, candCoords.lng);
      if (dist <= 150) {
        score += 35;
        coordsMatched = true;
        matchReasons.push(`Spatial: within ${Math.round(dist)}m`);
      } else if (dist <= 400) {
        score += 20;
        coordsMatched = true;
        matchReasons.push(`Spatial: within ${Math.round(dist)}m`);
      } else if (dist > 2500) {
        // Disqualify distant candidates to prevent cross-harbour and multi-branch chain mixups
        continue;
      }
    }

    // Multi-word generic syllable rejection: prevent "Sing Heung Yuen" matching "Wing Lok Yuen" on "yuen" alone
    const qWords = cleanQueryName.split(/\s+/).filter((w) => w.length > 1);
    const cWords = cleanCName.split(/\s+/).filter((w) => w.length > 1);

    // Reject single generic word query matching unless Chinese matches or brand alias matches
    if (qWords.length === 1 && GENERIC_SUFFIXES.has(qWords[0]) && !hasChineseMatch && !brandAliasMatched) {
      continue;
    }

    let commonWords = 0;
    let commonDistinctive = 0;
    for (const w of qWords) {
      if (cWords.includes(w)) {
        commonWords++;
        if (!GENERIC_SUFFIXES.has(w)) {
          commonDistinctive++;
        }
      }
    }

    const isGenericOverlapOnly = qWords.length >= 2 && cWords.length >= 2 && commonWords <= 1 && commonDistinctive === 0;

    const isExactBrandMatch =
      (hasChineseMatch && zhCheck.score >= 0.9) ||
      (bestDice >= 0.85 && !isGenericOverlapOnly) ||
      brandAliasMatched ||
      isBrandPrefix;

    // Disqualify candidates on a conflicting street if not an exact brand match
    if (hasStreetConflict && !isExactBrandMatch) {
      continue;
    }

    // Exact unit match for "No Record" / "沒有記錄" licensed premises in commercial complexes
    const isNoRecordPremise =
      (!c.name_en || isPlaceholderName(c.name_en)) &&
      (!c.name_tc || isPlaceholderName(c.name_tc));

    let isUnitConcessionMatch = false;
    let matchedUnitStr = "";
    if (isNoRecordPremise && queryUnitCodes.length > 0) {
      const candUnits = extractShopUnitCodes(c.address_en || "");
      const matchedUnit = queryUnitCodes.find((qu) =>
        candUnits.some((cu) => qu === cu || cu.includes(qu) || qu.includes(cu))
      );
      if (matchedUnit) {
        // Ensure at least one building / landmark / street token matches
        const anyBuildingOrStreetMatches = addrTokens.some(
          (tok) => tok.length >= 3 && cAddr.includes(tok.toLowerCase())
        );
        if (anyBuildingOrStreetMatches) {
          isUnitConcessionMatch = true;
          matchedUnitStr = matchedUnit;
          bestDice = 0.90;
          score += 55;
          matchReasons.push(`Unit concession match: ${matchedUnit}`);
        }
      }
    }

    const hasStrongNameMatch =
      (bestDice >= 0.70 && !isGenericOverlapOnly) ||
      (bestDice >= 0.45 && (commonDistinctive >= 1 || commonWords >= 2)) ||
      hasChineseMatch ||
      brandAliasMatched ||
      isBrandPrefix ||
      isUnitConcessionMatch;

    if (hasStrongNameMatch && score >= 45) {
      if (isUnitConcessionMatch) {
        scored.push({
          ...c,
          aiScore: score,
          aiMatchNote: matchReasons.join(" • ") || "AI verified candidate",
          matchConfidence: "CONCESSION",
          confidence: "CONCESSION",
          matchType: "CONCESSION",
          discrepancyNote: `Active FEHD food premises licence registered at this exact unit (${matchedUnitStr}). Note: Listed in FEHD open data registry under general premises registration without separate English trade name.`,
        });
        continue;
      }

      const isExact =
        (hasChineseMatch && zhCheck.score >= 0.9) ||
        (bestDice >= 0.85 && !isGenericOverlapOnly && (streetMatched || numberMatched)) ||
        (brandAliasMatched && (numberMatched || streetMatched || coordsMatched)) ||
        (isBrandPrefix && (streetMatched || numberMatched));
      scored.push({
        ...c,
        aiScore: score,
        aiMatchNote: matchReasons.join(" • ") || "AI verified candidate",
        matchConfidence: isExact ? "EXACT" : score >= 65 ? "HIGH" : "LOW",
        matchType: hasChineseMatch
          ? "CHINESE_SUBTITLE"
          : brandAliasMatched
          ? "BRAND_ALIAS"
          : "FUZZY_NAME",
      });
    }
  }

  // 6. Hotel & Corporate Entity Master Licence Fallback
  if (scored.length === 0) {
    const fullQueryLower = `${cleanQueryNameRaw} ${querySec} ${queryAddr}`.toLowerCase();
    const normFullQuery = normalizeTextForMatching(fullQueryLower);
    for (const hotel of HOTEL_CONCESSIONS) {
      const normHotelName = normalizeTextForMatching(hotel.hotelName);
      const normHotelAddr = normalizeTextForMatching(hotel.addressEn);
      const hotelMatched =
        normFullQuery.includes(normHotelName) ||
        normFullQuery.includes(normHotelAddr) ||
        (hotel.hotelNameZh && fullQueryLower.includes(hotel.hotelNameZh));

      if (hotelMatched) {
        for (const brand of hotel.brands) {
          if (
            normFullQuery.includes(brand.name.toLowerCase()) ||
            (brand.nameZh && fullQueryLower.includes(brand.nameZh))
          ) {
            let parentLicence = null;
            if (brand.licenceNo) {
              parentLicence = await db
                .prepare("SELECT * FROM restaurants WHERE license_no = ?")
                .get(brand.licenceNo);
            }
            if (!parentLicence) {
              parentLicence = await lookupHotelByAddressFts(db, hotel.addressEn, hotel.district);
            }

            if (parentLicence) {
              scored.push({
                ...parentLicence,
                aiScore: 85,
                aiMatchNote: `Operating under ${hotel.hotelName} Master Restaurant Licence (${brand.floor || "Hotel Premises"}, ${hotel.addressEn})`,
                matchConfidence: "CONCESSION",
                matchType: "HOTEL_MASTER_LICENCE",
                parentEntity: hotel.hotelName,
                discrepancyNote: `Individual dining venue "${queryName}" operates under the official ${hotel.hotelName} master FEHD restaurant licence at this address.`,
              });
              break;
            }
          }
        }
      }
      if (scored.length > 0) break;
    }
  }

  // 7. General Address-Level Hotel / Complex Fallback (e.g. Amber at 15 Queen's Road Central)
  if (scored.length === 0 && (queryAddr.includes("15 QUEEN'S ROAD") || queryAddr.includes("LANDMARK") || queryAddr.includes("FOUR SEASONS") || queryAddr.includes("PENINSULA"))) {
    for (const hotel of HOTEL_CONCESSIONS) {
      if (queryAddr.toUpperCase().includes(hotel.addressEn)) {
        const master = await lookupHotelByAddressFts(db, hotel.addressEn, hotel.district);
        if (master) {
          scored.push({
            ...master,
            aiScore: 75,
            aiMatchNote: `Operating under ${hotel.hotelName} Master Restaurant Licence (${hotel.addressEn})`,
            matchConfidence: "CONCESSION",
            matchType: "HOTEL_MASTER_LICENCE",
            parentEntity: hotel.hotelName,
            discrepancyNote: `Venue "${queryName}" operates under ${hotel.hotelName} master restaurant licence at this address.`,
          });
          break;
        }
      }
    }
  }

  // Sort by AI relevance score
  scored.sort((a, b) => b.aiScore - a.aiScore);

  const topResults = scored.slice(0, 50);

  let aiExplanation = "";
  if (topResults.length > 0) {
    const top = topResults[0];
    aiExplanation = `AI Match identified "${top.name_en}" based on ${top.aiMatchNote}.`;
  } else {
    aiExplanation = `AI analyzed "${queryName || queryAddr}" with geographic and Chinese character constraints, but found no verified FEHD record.`;
  }

  return {
    restaurants: topResults,
    total: topResults.length,
    aiAssisted: true,
    aiReasoning: aiExplanation,
    detectedIntent: {
      originalQuery: `${queryName} ${queryAddr}`.trim(),
      recognizedBrand: dissectedBrand.brand,
      recognizedDistrict: queryGeo.district,
      recognizedRegion: queryGeo.region,
    },
  };
}
