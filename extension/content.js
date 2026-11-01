// extension/content.js
// EatSafe HK - Google Maps In-Page Restaurant Hygiene Inspector

(function () {
  console.log("[EatSafe HK] Google Maps Inspector content script active.");

  let lastPlaceKey = "";
  let lastResolvedName = "";
  let lastResolvedAddress = "";
  let hydrationRetriedForName = "";
  let debounceTimerId = null;
  let pendingRecheck = false;
  let isChecking = false;

  // Persistent user minimization state across place selections and map movements
  let isUserMinimized = false;
  try {
    isUserMinimized = sessionStorage.getItem("eatsafe_minimized") === "true";
  } catch (_) {}

  let hasUserManuallyDragged = false;

  // Detect if a string is latitude/longitude coordinates or a Plus Code
  function isCoordinateString(str) {
    if (!str) return false;
    const s = str.trim();
    // Decimal coordinates e.g. "22.2809, 114.1282" or "22.2809,114.1282"
    if (/^[-+]?\d{1,3}\.\d+\s*,\s*[-+]?\d{1,3}\.\d+$/.test(s)) return true;
    // DMS coordinates e.g. 22°16'51.2"N 114°07'41.5"E
    if (/^\d+°\d+['′]?\d*["″]?\s*[NSEW]/i.test(s)) return true;
    // Plus codes e.g. "74MH+57" or "74MH+57 Kennedy Town, Hong Kong"
    if (/^[2-9CFGHJMPQRVWX]{4}\+[2-9CFGHJMPQRVWX]{2,}/i.test(s)) return true;
    // Pure numbers and punctuation
    if (/^[\d\s.,°'"+-]+$/.test(s) && s.length > 5) return true;
    return false;
  }

  // Hong Kong Territory boundary (geofencing: 22.14°N - 22.58°N, 113.82°E - 114.44°E)
  const HK_BOUNDS = {
    minLat: 22.14,
    maxLat: 22.58,
    minLng: 113.82,
    maxLng: 114.44,
  };

  function isWithinHongKong(lat, lng, addressText) {
    if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
      if (lat >= HK_BOUNDS.minLat && lat <= HK_BOUNDS.maxLat &&
          lng >= HK_BOUNDS.minLng && lng <= HK_BOUNDS.maxLng) {
        return true;
      }
      return false;
    }
    const addr = (addressText || "").toLowerCase();
    const nonHkPlaces = [
      "japan", "tokyo", "osaka", "kyoto", "united states", "usa", "united kingdom", "london",
      "singapore", "taiwan", "taipei", "macau", "macao", "shenzhen", "guangzhou", "korea", "seoul",
      "australia", "sydney", "melbourne", "canada", "toronto", "vancouver", "france", "paris",
      "germany", "berlin", "thailand", "bangkok", "vietnam", "hanoi", "ho chi minh"
    ];
    for (const c of nonHkPlaces) {
      if (addr.includes(c) && !addr.includes("hong kong") && !addr.includes("香港")) {
        return false;
      }
    }
    return true;
  }

  function hasWholeWord(text, phrase) {
    if (!text || !phrase) return false;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}s?(?=$|[^a-z0-9])`, "i").test(text);
  }

  // Detect whether the selected Google Maps place is a restaurant/dining establishment
  function isFoodOrRestaurantCategory(categoryStr, nameStr, paneEl) {
    const cat = (categoryStr || "").toLowerCase().trim();
    const name = (nameStr || "").toLowerCase().trim();

    // Explicit Non-Food categories: parks, hotels, subways, beaches, banks, barbers, etc.
    const nonFoodCategories = [
      "park", "garden", "hotel", "motel", "hostel", "resort", "lodging",
      "subway station", "metro station", "train station", "transit station", "bus stop", "tram stop", "ferry terminal", "station",
      "beach", "hiking", "trail", "viewpoint", "peak", "mountain", "tourist attraction", "historical landmark",
      "school", "university", "college", "kindergarten", "education",
      "hospital", "clinic", "dentist", "pharmacy", "doctor",
      "bank", "atm", "currency exchange", "barber", "hair salon", "beauty salon", "laundry",
      "church", "temple", "mosque", "synagogue", "monastery",
      "apartment", "condominium", "residential", "housing", "estate",
      "parking", "garage", "car park",
      "public bathroom", "restroom", "toilet",
      "gym", "fitness", "swimming pool", "stadium", "sports",
      "gas station", "petrol",
      "post office", "police", "fire station", "embassy", "consulate", "government"
    ];

    // Special exception for Hotel Dining / Concession Venues (e.g. The Lobby at The Peninsula, Gaddi's, Chesa)
    const hotelDiningKeywordsEn = [
      "the lobby", "lobby lounge", "hotel lounge", "lounge", "grill", "restaurant",
      "cafe", "café", "bar", "chesa", "felix", "gaddi", "spring moon", "verandah",
      "imasa", "dining", "bistro", "steakhouse", "tea room"
    ];
    const hotelDiningKeywordsZh = [
      "大堂茶座", "餐廳", "酒樓", "咖啡廳", "酒吧", "嘉麟樓", "宴會廳"
    ];
    const hasHotelDiningCue =
      hotelDiningKeywordsEn.some((k) => hasWholeWord(name, k) || hasWholeWord(cat, k)) ||
      hotelDiningKeywordsZh.some((k) => (nameStr || "").includes(k) || (categoryStr || "").includes(k));

    // If category explicitly contains an excluded entity and no dining terms
    for (const nf of nonFoodCategories) {
      if (hasWholeWord(cat, nf)) {
        if ((nf === "hotel" || nf === "resort" || nf === "lodging") && hasHotelDiningCue) {
          return true;
        }
        if (!hasWholeWord(cat, "restaurant") && !hasWholeWord(cat, "cafe") && !hasWholeWord(cat, "food") && !hasWholeWord(cat, "bar")) {
          return false;
        }
      }
    }

    if (hasHotelDiningCue) {
      return true;
    }

    // Food & Dining keywords in English (matched on whole-word boundaries to avoid "Barclays", "barber", "team", etc.)
    const foodKeywords = [
      "restaurant", "resturant", "cafe", "café", "coffee", "bakery", "bakehouse",
      "bistro", "bar", "pub", "brewery", "diner", "eatery", "canteen", "kitchen",
      "noodle", "sushi", "ramen", "fast food", "tea", "ice cream", "dessert",
      "takeout", "takeaway", "dim sum", "buffet", "grill", "steak", "seafood",
      "hot pot", "hotpot", "confectionery", "deli", "delicatessen", "pizza", "pizzeria",
      "burger", "hamburger", "supermarket", "grocery", "grocer", "butcher", "pastry",
      "sandwich", "shawarma", "kebab", "taco", "tapas", "brasserie", "gastropub",
      "food court", "hawker", "dai pai dong", "daipaidong", "food stall", "cooked food",
      "patisserie", "izakaya", "cha chaan teng", "sui mei", "siu mei",
      "bbq", "barbecue", "chophouse", "taqueria", "roastery", "cookie shop"
    ];

    // Chinese food keywords
    const foodKeywordsZh = [
      "餐廳", "食肆", "食家", "菜館", "酒樓", "酒家", "冰室", "茶餐廳", "咖啡",
      "麵", "粉麵", "壽司", "快餐", "甜品", "小食", "點心", "烘焙", "麵包", "餅店", "曲奇",
      "酒吧", "食店", "私房菜", "居酒屋", "火鍋", "茶飲", "燒味", "料理", "茶館", "包點",
      "大牌檔", "大排檔", "熟食", "冬菇亭",
      "超市", "超級市場", "士多", "凍肉"
    ];

    for (const kw of foodKeywords) {
      if (hasWholeWord(cat, kw) || hasWholeWord(name, kw)) return true;
    }

    for (const kw of foodKeywordsZh) {
      if ((categoryStr || "").includes(kw) || (nameStr || "").includes(kw)) return true;
    }

    // Check dining indicators in left pane (Dine-in, Takeout, Delivery, Menu, Order online)
    if (paneEl) {
      const text = paneEl.textContent || "";
      if (
        (text.includes("Dine-in") || text.includes("堂食")) &&
        (text.includes("Takeout") || text.includes("外賣") || text.includes("Delivery"))
      ) {
        return true;
      }
      if (text.includes("Order online") || text.includes("點餐") || text.includes("View menu") || text.includes("查看菜單")) {
        return true;
      }
    }

    return false;
  }

  // Food Item and Menu Dish Blacklist to strictly prevent DOM Scraper Pollution
  const FOOD_TAG_BLACKLIST = new Set([
    "牛肉", "牛腩", "牛排", "牛扒", "肥牛", "雞肉", "海南雞", "白切雞", "燒鵝", "燒鴨", "叉燒", "燒肉",
    "豬肉", "豬扒", "羊肉", "羊扒", "海鮮", "魚", "魚蛋", "生蠔", "刺身", "壽司", "燒味", "點心", "蝦餃",
    "燒賣", "雲吞", "水餃", "餃子", "拉麵", "意粉", "薄餅", "漢堡", "薯條", "沙律", "沙拉", "甜品", "雪糕",
    "糖水", "咖啡", "奶茶", "檸茶", "啤酒", "紅酒", "白酒", "雞尾酒", "小食", "飲品", "湯", "飯", "麵", "粉",
    "粥", "炒飯", "炒麵", "蛋撻", "菠蘿包", "多士", "西多士",
    "beef", "chicken", "pork", "lamb", "duck", "goose", "seafood", "fish", "oyster", "sashimi",
    "sushi", "dim sum", "dumpling", "noodles", "pasta", "pizza", "burger", "steak", "salad",
    "dessert", "ice cream", "coffee", "tea", "beer", "wine", "cocktail", "hummus", "tapas"
  ]);

  // Known location keywords to distinguish from Chinese brand subtitles
  const LOCATION_KEYWORDS = new Set([
    "central", "sheung wan", "sai ying pun", "kennedy town", "admiralty", "wan chai", "causeway bay",
    "north point", "quarry bay", "shau kei wan", "chai wan", "aberdeen", "stanley", "tsim sha tsui",
    "tst", "jordan", "yau ma tei", "mong kok", "mk", "prince edward", "sham shui po", "kowloon city",
    "hung hom", "whampoa", "wong tai sin", "kwun tong", "sha tin", "shatin", "tsuen wan", "kwai chung",
    "tsing yi", "tuen mun", "yuen long", "tai po", "fanling", "sheung shui", "tseung kwan o", "tko",
    "sai kung", "tung chung", "ifc", "ifc mall", "star ferry", "star ferry pier", "harbour city",
    "times square", "pacific place", "k11", "citygate", "festival walk", "apm", "new town plaza",
    "中環", "上環", "西環", "金鐘", "灣仔", "銅鑼灣", "跑馬地", "北角", "鰂魚涌", "太古", "筲箕灣", "柴灣",
    "香港仔", "赤柱", "尖沙咀", "尖東", "佐敦", "油麻地", "旺角", "太子", "深水埗", "長沙灣", "荔枝角",
    "九龍城", "紅磡", "土瓜灣", "黃埔", "黃大仙", "鑽石山", "新蒲崗", "觀塘", "九龍灣", "沙田", "大圍",
    "荃灣", "葵涌", "青衣", "屯門", "元朗", "大埔", "粉嶺", "上水", "將軍澳", "西貢", "東涌", "機場",
    "國金", "國際金融中心", "時代廣場", "海港城", "太古廣場", "分店", "總店"
  ]);

  // Extract place name, secondary name/subtitle, category, and address from Google Maps DOM
  function extractCurrentPlace() {
    let name = "";
    let secondaryName = "";
    let category = "";
    let address = "";

    const GENERIC_SEARCH_TITLES = new Set([
      "restaurants", "restaurant", "results", "search results", "food", "dining",
      "bars", "coffee", "cafes", "takeout", "groceries", "nearby", "things to do",
      "explore", "hong kong", "directions", "transit", "hotels", "hotel", "gas", "atms", "pharmacies", "sponsored"
    ]);

    // 1. Try Google Maps DOM selectors specifically for the place title
    let titleEl = null;
    const duwCandidate = document.querySelector("h1.DUwDvf");
    if (duwCandidate && duwCandidate.isConnected && duwCandidate.offsetParent !== null) {
      const duwText = (duwCandidate.textContent || "").trim();
      if (duwText && !GENERIC_SEARCH_TITLES.has(duwText.toLowerCase()) && !duwText.toLowerCase().startsWith("sponsored")) {
        titleEl = duwCandidate;
      }
    }

    if (!titleEl) {
      const candidates = document.querySelectorAll(
        "h1.fontHeadlineLarge, h1.ITQ08c, h1.bJzME, h1.Q41nfe, .x352Kt h1, .fpN89e h1, div[role='main'] h1, h1"
      );
      for (const el of candidates) {
        if (!el.isConnected || el.offsetParent === null) continue;
        const text = (el.textContent || "").trim();
        if (text && text.length >= 2 && !GENERIC_SEARCH_TITLES.has(text.toLowerCase()) && !text.toLowerCase().startsWith("sponsored")) {
          titleEl = el;
          break;
        }
      }
    }

    if (titleEl && titleEl.textContent) {
      name = titleEl.textContent.trim();
    }

    // If title element is absent, disconnected, or hidden (no place open)
    if (!titleEl || !titleEl.isConnected || titleEl.offsetParent === null || titleEl.getBoundingClientRect().width === 0) {
      return { name: "", secondaryName: "", category: "", address: "", lat: null, lng: null, isRestaurant: false, isCoordinate: false, outsideHongKong: false };
    }

    if (!name || name.length < 2 || GENERIC_SEARCH_TITLES.has(name.toLowerCase())) {
      return { name: "", secondaryName: "", category: "", address: "", lat: null, lng: null, isRestaurant: false, isCoordinate: false, outsideHongKong: false };
    }

    // 2. Check if name is coordinates
    if (isCoordinateString(name)) {
      return { name: "", secondaryName: "", category: "", address: "", isRestaurant: false, isCoordinate: true };
    }

    // 3. Extract secondary name / subtitle strictly from the immediate title block
    // NEVER search the entire pane to avoid scraping menu chips (牛肉, Hummus, etc.)!
    if (titleEl && titleEl.parentElement) {
      const headerBox = titleEl.parentElement;
      const candidateEls = headerBox.querySelectorAll("h2, .fontHeadlineSmall");
      for (const el of candidateEls) {
        // Exclude buttons, tabs, reviews, or carousels
        if (el.closest("button, a, [role='button'], [role='tab'], [role='radiogroup'], .m6QErb, .F7nice, .LBgpqf, .k2tWef, .Oq397, .DkEaL, .Io6YTe")) {
          continue;
        }
        const text = (el.textContent || "").trim();
        const textLower = text.toLowerCase();
        if (text && text !== name && text.length <= 30 && !FOOD_TAG_BLACKLIST.has(textLower) && !FOOD_TAG_BLACKLIST.has(text)) {
          // If candidate has Chinese characters
          if (/[\u4e00-\u9fa5]{2,}/.test(text)) {
            secondaryName = text;
            break;
          }
          // If candidate is English and title has Chinese
          if (/^[A-Za-z0-9\s'&.,\-]{2,30}$/.test(text) && /[\u4e00-\u9fa5]/.test(name)) {
            secondaryName = text;
            break;
          }
        }
      }
    }

    // 4. Robust handling of Google Maps parenthetical suffixes and bilingual title combinations:
    // e.g. "Pier 7 Café & Bar (Central)" -> cleanName: "Pier 7 Café & Bar", suffix: "Central"
    // e.g. "Tim Ho Wan (Central)" -> cleanName: "Tim Ho Wan", suffix: "Central"
    // e.g. "Monster BBQ Restaurant (燒味獸)" -> cleanName: "Monster BBQ Restaurant", secondaryName: "燒味獸"
    // e.g. "Australia Dairy Company 澳洲牛奶公司" -> cleanName: "Australia Dairy Company", secondaryName: "澳洲牛奶公司"
    let cleanName = name;
    let extractedSuffix = "";

    // Check for combined EN + ZH without parentheses (e.g. "Australia Dairy Company 澳洲牛奶公司")
    const enZhMatch = cleanName.match(/^([A-Za-z0-9\s'&.,\-]{2,40})\s+([\u4e00-\u9fa5]{2,12})$/);
    if (enZhMatch) {
      cleanName = enZhMatch[1].trim();
      if (!secondaryName && !LOCATION_KEYWORDS.has(enZhMatch[2].toLowerCase()) && !LOCATION_KEYWORDS.has(enZhMatch[2])) {
        secondaryName = enZhMatch[2].trim();
      }
    } else {
      // Check for combined ZH + EN without parentheses (e.g. "澳洲牛奶公司 Australia Dairy Company")
      const zhEnMatch = cleanName.match(/^([\u4e00-\u9fa5]{2,12})\s+([A-Za-z0-9\s'&.,\-]{2,40})$/);
      if (zhEnMatch) {
        cleanName = zhEnMatch[2].trim();
        if (!secondaryName && !LOCATION_KEYWORDS.has(zhEnMatch[1].toLowerCase()) && !LOCATION_KEYWORDS.has(zhEnMatch[1])) {
          secondaryName = zhEnMatch[1].trim();
        }
      }
    }

    const suffixMatch = cleanName.match(/\s*[\(\[\{]([^\)\]\}]+)[\)\]\}]\s*$/);
    if (suffixMatch) {
      const rawSuffix = suffixMatch[1].trim();
      const rawSuffixLower = rawSuffix.toLowerCase();

      // If the suffix is 2-12 Chinese characters and not a known location keyword, it's a Chinese brand name!
      if (/^[\u4e00-\u9fa5]{2,12}$/.test(rawSuffix) && !LOCATION_KEYWORDS.has(rawSuffixLower) && !LOCATION_KEYWORDS.has(rawSuffix)) {
        if (!secondaryName) {
          secondaryName = rawSuffix;
        }
        cleanName = cleanName.replace(suffixMatch[0], "").trim();
      } else {
        // Otherwise, it's a location/branch suffix e.g. "Central", "IFC Mall", "Star Ferry Pier", "中環"
        extractedSuffix = rawSuffix;
        cleanName = cleanName.replace(suffixMatch[0], "").trim();
      }
    }

    // Check for another nested parenthetical (e.g. "Tim Ho Wan (Central) (添好運點心專門店)")
    const secondSuffixMatch = cleanName.match(/\s*[\(\[\{]([^\)\]\}]+)[\)\]\}]\s*$/);
    if (secondSuffixMatch) {
      const secondRaw = secondSuffixMatch[1].trim();
      if (/^[\u4e00-\u9fa5]{2,12}$/.test(secondRaw) && !LOCATION_KEYWORDS.has(secondRaw.toLowerCase()) && !LOCATION_KEYWORDS.has(secondRaw)) {
        if (!secondaryName) {
          secondaryName = secondRaw;
        }
        cleanName = cleanName.replace(secondSuffixMatch[0], "").trim();
      }
    }

    // Check for trailing branch/location suffixes without parentheses (e.g. "Pici Central", "Pici - Central")
    if (!extractedSuffix) {
      for (const locKw of LOCATION_KEYWORDS) {
        if (locKw.length >= 2) {
          const locRegex = new RegExp(`(?:\\s+[-–—,]?\\s*|\\s+)${locKw}$`, "i");
          if (locRegex.test(cleanName)) {
            extractedSuffix = locKw;
            cleanName = cleanName.replace(locRegex, "").trim();
            break;
          }
        }
      }
    }

    // 5. Try URL if title not found
    if (!cleanName) {
      const match = window.location.href.match(/\/maps\/place\/([^/@]+)/);
      if (match && match[1]) {
        cleanName = decodeURIComponent(match[1].replace(/\+/g, " "));
      }
    }

    // Check URL decoded name for secondary Chinese name if still missing
    if (!secondaryName) {
      const match = window.location.href.match(/\/maps\/place\/([^/@]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1].replace(/\+/g, " "));
        if (decoded && decoded !== cleanName && /[\u4e00-\u9fa5]{2,}/.test(decoded) && !/^\d/.test(decoded)) {
          secondaryName = decoded.replace(/[\(\[\{][^\)\]\}]+[\)\]\}]/g, "").trim();
        }
      }
    }

    if (isCoordinateString(cleanName)) {
      return { name: "", secondaryName: "", category: "", address: "", lat: null, lng: null, isRestaurant: false, isCoordinate: true };
    }

    // 6. Extract category
    const catEl =
      document.querySelector('button[jsaction*="category"]') ||
      document.querySelector('button.DkEaL') ||
      document.querySelector('span.DkEaL') ||
      document.querySelector('.LBgpqf button') ||
      document.querySelector('.fontBodyMedium button');

    if (catEl && catEl.textContent) {
      category = catEl.textContent.trim();
    }

    // 7. Extract address from address button
    const addrEl =
      document.querySelector('button[data-item-id*="address"]') ||
      document.querySelector('button[aria-label*="Address"]') ||
      document.querySelector('button[aria-label*="地址"]') ||
      document.querySelector('button.CsEnBe[data-tooltip*="address"]') ||
      document.querySelector('div.Io6YTe.fontBodyMedium') ||
      document.querySelector('span.Io6YTe');

    if (addrEl && addrEl.textContent) {
      const rawAddr = addrEl.textContent.trim();
      if (!isCoordinateString(rawAddr)) {
        address = rawAddr;
      }
    }

    // If extracted suffix exists and address doesn't contain it, prepend suffix context to address
    if (extractedSuffix && !address.toLowerCase().includes(extractedSuffix.toLowerCase())) {
      address = `${address} ${extractedSuffix}`.trim();
    }

    // 8. Extract Coordinates
    let lat = null;
    let lng = null;
    let viewportLat = null;
    let viewportLng = null;

    // Prioritize place pin coordinates (!3d<lat>!4d<lng>) which are invariant to viewport dragging
    const pinCoordMatch = window.location.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (pinCoordMatch) {
      lat = parseFloat(pinCoordMatch[1]);
      lng = parseFloat(pinCoordMatch[2]);
    }

    const urlCoordMatch = window.location.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlCoordMatch) {
      viewportLat = parseFloat(urlCoordMatch[1]);
      viewportLng = parseFloat(urlCoordMatch[2]);
    }

    const mainPane = document.querySelector('div[role="main"]') || document.querySelector('.m6QErb');
    const isRestaurant = isFoodOrRestaurantCategory(category, cleanName, mainPane);
    const outsideHongKong = !isWithinHongKong(lat || viewportLat, lng || viewportLng, address);

    return { name: cleanName, rawName: name, secondaryName, category, address, lat, lng, isRestaurant, isCoordinate: false, outsideHongKong };
  }

  // Create or get the widget DOM container
  function getOrCreateWidget() {
    let container = document.getElementById("eatsafe-hk-widget-root");
    if (!container) {
      container = document.createElement("div");
      container.id = "eatsafe-hk-widget-root";
      document.body.appendChild(container);
    }
    return container;
  }

  // Setup robust pointer-capture dragging across all states
  function setupDraggable(element, handle) {
    if (!handle) return;
    handle.style.cursor = "grab";
    handle.style.userSelect = "none";
    handle.style.touchAction = "none";

    handle.onpointerdown = (e) => {
      // Don't drag if clicking buttons or links
      if (e.target.closest("button") || e.target.closest("a")) return;

      e.preventDefault();
      handle.style.cursor = "grabbing";

      const rect = element.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;

      try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {}

      const onPointerMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        const maxLeft = Math.max(10, window.innerWidth - element.offsetWidth - 10);
        const maxTop = Math.max(10, window.innerHeight - element.offsetHeight - 10);

        const newLeft = Math.max(10, Math.min(maxLeft, startLeft + dx));
        const newTop = Math.max(10, Math.min(maxTop, startTop + dy));

        hasUserManuallyDragged = true;
        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
      };

      const onPointerUp = (ev) => {
        handle.style.cursor = "grab";
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
    };
  }

  // Detect rightmost edge of open Google Maps side panel(s)
  function getPlacePanelRightEdge() {
    // Locate the active place details panel title
    const GENERIC_TITLES = new Set([
      "restaurants", "restaurant", "results", "search results", "food", "dining", "sponsored"
    ]);

    let placeTitleEl = null;
    const duw = document.querySelector("h1.DUwDvf");
    if (duw && duw.isConnected && duw.offsetParent !== null) {
      const t = (duw.textContent || "").trim().toLowerCase();
      if (t && !GENERIC_TITLES.has(t) && !t.startsWith("sponsored")) {
        placeTitleEl = duw;
      }
    }

    if (!placeTitleEl) {
      const allH1s = document.querySelectorAll(
        "h1.fontHeadlineLarge, h1.ITQ08c, h1.bJzME, h1.Q41nfe, .x352Kt h1, .fpN89e h1, div[role='main'] h1, h1"
      );
      for (const h of allH1s) {
        if (!h.isConnected || h.offsetParent === null) continue;
        const t = (h.textContent || "").trim().toLowerCase();
        if (t && t.length >= 2 && !GENERIC_TITLES.has(t) && !t.startsWith("sponsored")) {
          placeTitleEl = h;
          break;
        }
      }
    }

    if (!placeTitleEl) {
      return null;
    }

    let bestRight = 0;

    // A. Climb up from the verified place title element to find its enclosing tab container
    let curr = placeTitleEl;
    while (curr && curr !== document.body) {
      const rect = curr.getBoundingClientRect();
      // Side panel container width in Google Maps is between 260px and 600px
      // Or if master container w6VYqd: can be up to 1100px when 2 tabs are open
      if (rect.width >= 260 && rect.width <= 1100 && rect.height >= 200) {
        if (rect.right > bestRight && rect.right < window.innerWidth - 60) {
          bestRight = rect.right;
        }
      }
      curr = curr.parentElement;
    }

    // B. Check all Google Maps visible side tab panels (.noYW3) and master panel (.w6VYqd)
    // In Google Maps desktop:
    // When 1 tab is open: .noYW3 or .w6VYqd has right ≈ 408px - 496px
    // When 2 tabs are open: the second .noYW3 or .w6VYqd has right ≈ 816px - 912px
    const panelTabs = document.querySelectorAll(".noYW3, div[role='region']");
    for (const tab of panelTabs) {
      if (!tab.isConnected || tab.offsetParent === null) continue;
      const tRect = tab.getBoundingClientRect();
      if (tRect.width >= 260 && tRect.width <= 600 && tRect.height >= 200) {
        if (tRect.right > bestRight && tRect.right < window.innerWidth - 60) {
          bestRight = tRect.right;
        }
      }
    }

    const masterSidePane = document.querySelector(".w6VYqd");
    if (masterSidePane && masterSidePane.isConnected && masterSidePane.offsetParent !== null) {
      const mRect = masterSidePane.getBoundingClientRect();
      if (mRect.width >= 300 && mRect.width <= 1200 && mRect.height >= 200) {
        if (mRect.right > bestRight && mRect.right < window.innerWidth - 60) {
          bestRight = mRect.right;
        }
      }
    }

    // C. Check for any side panel collapse/toggle button on the pane's right edge
    const toggleBtns = document.querySelectorAll(
      "button[aria-label*='Collapse'], button[aria-label*='collapse'], button[aria-label*='side panel'], .widget-pane-toggle-button"
    );
    for (const btn of toggleBtns) {
      if (!btn.isConnected || btn.offsetParent === null) continue;
      const bRect = btn.getBoundingClientRect();
      if (bRect.width > 0 && bRect.left >= bestRight - 30 && bRect.right <= bestRight + 70) {
        bestRight = Math.max(bestRight, bRect.right);
      }
    }

    if (bestRight > 100) {
      return bestRight;
    }

    const tRect = placeTitleEl.getBoundingClientRect();
    return tRect.right > 0 ? tRect.right + 40 : 420;
  }

  // Dynamically position widget to move with side tabs
  function updateWidgetPosition(forceReset = false) {
    const container = document.getElementById("eatsafe-hk-widget-root");
    if (!container || container.style.display === "none") return;

    if (window.innerWidth <= 900) {
      container.style.left = "";
      container.style.top = "";
      return;
    }

    if (hasUserManuallyDragged && !forceReset) {
      return;
    }

    const panelRight = getPlacePanelRightEdge();
    if (panelRight && panelRight > 50) {
      const targetLeft = Math.round(panelRight + 14);
      const maxLeft = Math.max(10, window.innerWidth - (container.offsetWidth || 340) - 16);
      const safeLeft = Math.min(targetLeft, maxLeft);
      container.style.left = `${safeLeft}px`;
      container.style.top = "68px";
      container.style.right = "auto";
      container.style.bottom = "auto";
    }
  }

  // Wire common header controls (minimize, close)
  function attachHeaderControls(container) {
    const minBtn = container.querySelector("#eatsafe-min-btn");
    const card = container.querySelector(".eatsafe-card");
    const guidePopover = container.querySelector("#eatsafe-licence-popover");
    const guideTrigger = container.querySelector("#eatsafe-licence-guide-trigger");

    // Sync DOM state to isUserMinimized
    if (isUserMinimized) {
      card?.classList.add("minimized");
      if (minBtn) {
        minBtn.textContent = "+";
        minBtn.title = "Expand";
      }
      if (guidePopover) guidePopover.classList.remove("open");
      if (guideTrigger) guideTrigger.classList.remove("active");
    } else {
      card?.classList.remove("minimized");
      if (minBtn) {
        minBtn.textContent = "–";
        minBtn.title = "Minimize";
      }
    }

    minBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isMin = card?.classList.toggle("minimized");
      isUserMinimized = !!isMin;
      try {
        sessionStorage.setItem("eatsafe_minimized", isUserMinimized ? "true" : "false");
      } catch (_) {}

      minBtn.textContent = isMin ? "+" : "–";
      minBtn.title = isMin ? "Expand" : "Minimize";

      // If minimized, also dismiss any open licence guide popover
      if (isMin) {
        if (guidePopover) guidePopover.classList.remove("open");
        if (guideTrigger) guideTrigger.classList.remove("active");
      }
    });

    const closeBtn = container.querySelector("#eatsafe-close-btn");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      container.style.display = "none";
      if (guidePopover) guidePopover.classList.remove("open");
      if (guideTrigger) guideTrigger.classList.remove("active");
    });

    setupDraggable(container, container.querySelector("#eatsafe-drag-handle"));
  }

  // Render the widget UI
  function renderWidget({ status, placeName, secondaryName = "", data, error }) {
    const container = getOrCreateWidget();
    container.style.display = "block";

    // 1. Loading State
    if (status === "loading") {
      container.innerHTML = `
        <div class="eatsafe-card${isUserMinimized ? " minimized" : ""}" id="eatsafe-card">
          <div class="eatsafe-header" id="eatsafe-drag-handle">
            <div class="eatsafe-header-title">
              <span>EatSafe HK</span>
              <span class="eatsafe-header-badge">FEHD Inspector</span>
            </div>
            <div class="eatsafe-header-actions">
              <button class="eatsafe-btn-icon" id="eatsafe-min-btn" title="${isUserMinimized ? "Expand" : "Minimize"}">${isUserMinimized ? "+" : "–"}</button>
              <button class="eatsafe-btn-icon" id="eatsafe-close-btn" title="Close">✕</button>
            </div>
          </div>
          <div class="eatsafe-loading">
            <div class="eatsafe-spinner"></div>
            <div>Verifying official FEHD food safety records for <strong>${escapeHtml(placeName)}</strong>...</div>
          </div>
        </div>
      `;
      attachHeaderControls(container);
      updateWidgetPosition(true);
      return;
    }

    // 2. Service Busy / Rate-Limited State
    if (status === "quota") {
      container.innerHTML = `
        <div class="eatsafe-card eatsafe-card-offline${isUserMinimized ? " minimized" : ""}" id="eatsafe-card" style="border-left: 4px solid #3b82f6;">
          <div class="eatsafe-header" id="eatsafe-drag-handle">
            <div class="eatsafe-header-title">
              <span>EatSafe HK</span>
              <span class="eatsafe-header-badge" style="background:#dbeafe; color:#1e40af;">Service Busy</span>
            </div>
            <div class="eatsafe-header-actions">
              <button class="eatsafe-btn-icon" id="eatsafe-min-btn" title="${isUserMinimized ? "Expand" : "Minimize"}">${isUserMinimized ? "+" : "–"}</button>
              <button class="eatsafe-btn-icon" id="eatsafe-close-btn" title="Close">✕</button>
            </div>
          </div>
          <div class="eatsafe-offline-body">
            <div class="eatsafe-restaurant-name">${escapeHtml(placeName)}</div>
            <div class="eatsafe-offline-msg" style="color: #1e3a8a;">
              EatSafe HK is experiencing high lookup volume right now. Please try again shortly or search on the EatSafe HK web portal.
            </div>
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button type="button" class="eatsafe-retry-btn" id="eatsafe-quota-retry-btn" style="flex: 1;">
                <span>Retry Lookup</span> ↻
              </button>
              <a href="https://eatsafe-hk.pages.dev" target="_blank" rel="noopener noreferrer" class="eatsafe-retry-btn" style="flex: 1; text-decoration:none; display:inline-block; text-align:center;">
                Web Portal ↗
              </a>
            </div>
          </div>
        </div>
      `;
      const quotaRetryBtn = container.querySelector("#eatsafe-quota-retry-btn");
      quotaRetryBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        lastPlaceKey = "";
        checkForPlaceUpdate();
      });
      attachHeaderControls(container);
      updateWidgetPosition(true);
      return;
    }

    if (status === "offline") {
      container.innerHTML = `
        <div class="eatsafe-card eatsafe-card-offline${isUserMinimized ? " minimized" : ""}" id="eatsafe-card">
          <div class="eatsafe-header" id="eatsafe-drag-handle">
            <div class="eatsafe-header-title">
              <span>EatSafe HK</span>
              <span class="eatsafe-header-badge eatsafe-badge-offline">Connection Issue</span>
            </div>
            <div class="eatsafe-header-actions">
              <button class="eatsafe-btn-icon" id="eatsafe-min-btn" title="${isUserMinimized ? "Expand" : "Minimize"}">${isUserMinimized ? "+" : "–"}</button>
              <button class="eatsafe-btn-icon" id="eatsafe-close-btn" title="Close">✕</button>
            </div>
          </div>
          <div class="eatsafe-offline-body">
            <div class="eatsafe-restaurant-name">${escapeHtml(placeName)}</div>
            <div class="eatsafe-offline-msg">
              Unable to reach EatSafe HK verification server (Cloudflare Pages). Please check your internet connection or click below to retry.
            </div>
            <button type="button" class="eatsafe-retry-btn" id="eatsafe-retry-btn">
              <span>Retry Connection</span> ↻
            </button>
          </div>
        </div>
      `;
      const retryBtn = container.querySelector("#eatsafe-retry-btn");
      retryBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        lastPlaceKey = "";
        checkForPlaceUpdate();
      });
      attachHeaderControls(container);
      updateWidgetPosition(true);
      return;
    }

    // 3. Not Found State (Grey Theme - only shown when server is online and confirmed no licence)
    if (status === "not_found" || !data?.restaurant) {
      container.innerHTML = `
        <div class="eatsafe-card eatsafe-card-not-found${isUserMinimized ? " minimized" : ""}" id="eatsafe-card">
          <div class="eatsafe-header" id="eatsafe-drag-handle">
            <div class="eatsafe-header-title">
              <span>EatSafe HK</span>
              <span class="eatsafe-header-badge">No FEHD Record</span>
            </div>
            <div class="eatsafe-header-actions">
              <button class="eatsafe-btn-icon" id="eatsafe-min-btn" title="${isUserMinimized ? "Expand" : "Minimize"}">${isUserMinimized ? "+" : "–"}</button>
              <button class="eatsafe-btn-icon" id="eatsafe-close-btn" title="Close">✕</button>
            </div>
          </div>
          <div class="eatsafe-not-found">
            <div class="eatsafe-restaurant-name">${escapeHtml(placeName)}</div>
            <div style="color: #64748b; margin-bottom: 4px;">
              No licensed food premises found under this exact name or location in the FEHD open data registry.
            </div>
          </div>
        </div>
      `;
      attachHeaderControls(container);
      updateWidgetPosition(true);
      return;
    }

    // 3. Found Restaurant Record
    const r = data.restaurant;
    const isDaiPaiDong = !!(r.isDaiPaiDong || r.matchType === "DAI_PAI_DONG_HAWKER" || (r.type && r.type.includes("Hawker")));
    const isPrepackaged = !!(r.isPrepackagedRetail || r.matchType === "PREPACKAGED_RETAIL");
    const isWarning = r.status === "DEMERIT_WARNING";
    const isSuspended = r.status === "SUSPENDED" && r.isCurrentlySuspended === true && r.suspensionActive === true;
    const isPreviouslySuspended = !!(r.isPreviouslySuspended || r.status === "PREVIOUSLY_SUSPENDED");
    const isConcession = r.matchConfidence === "CONCESSION" || r.matchType === "HOTEL_MASTER_LICENCE";
    const isLowConfidence = r.matchConfidence === "LOW";

    let badgeClass = "eatsafe-score-clean";
    let badgeTitle = "No Active Suspensions on Record";
    let demeritTagText = "Active Licence";

    if (isDaiPaiDong) {
      badgeClass = "eatsafe-score-clean";
      badgeTitle = "Fixed Pitch Hawker Stall (Cap. 132AI)";
      demeritTagText = "Hawker Licence";
    } else if (isPrepackaged) {
      badgeClass = "eatsafe-score-prepackaged";
      badgeTitle = "Licence-Exempt (Cap. 132X)";
      demeritTagText = "Pre-packaged Only";
    } else if (isLowConfidence) {
      badgeClass = "eatsafe-score-unverified";
      badgeTitle = "Unverified Match";
      demeritTagText = "Branch Unconfirmed";
    } else if (isSuspended) {
      // An active suspension outranks the master-licence label: the venue trades under that licence
      badgeClass = "eatsafe-score-suspended";
      badgeTitle = r.suspensionBadgeText || "Suspension Active";
      demeritTagText = "Suspension Active";
    } else if (isConcession) {
      badgeClass = "eatsafe-score-concession";
      badgeTitle = `Master Licence (${escapeHtml(r.parentEntity || "Parent Entity")})`;
      demeritTagText = "Active Licence";
    } else if (isPreviouslySuspended) {
      badgeClass = "eatsafe-score-previously-suspended";
      badgeTitle = r.suspensionBadgeText || "Previously Suspended (Past Record)";
      demeritTagText = "Active Licence";
    } else if (isWarning) {
      badgeClass = "eatsafe-score-warning";
      badgeTitle = "Past Demerit Warning";
      demeritTagText = "Active Licence";
    } else {
      badgeClass = "eatsafe-score-clean";
      badgeTitle = "No Active Suspensions on Record";
      demeritTagText = "Active Licence";
    }

    const headerBadgeClass = isDaiPaiDong
      ? "eatsafe-badge-verified"
      : isPrepackaged
      ? "eatsafe-badge-prepackaged"
      : isLowConfidence
      ? "eatsafe-badge-unverified"
      : isConcession
      ? "eatsafe-badge-concession"
      : isPreviouslySuspended
      ? "eatsafe-badge-previously-suspended"
      : "eatsafe-badge-verified";

    const headerBadgeText = isDaiPaiDong
      ? "Fixed Pitch Hawker"
      : isPrepackaged
      ? "Pre-packaged Retail"
      : isLowConfidence
      ? "Unverified"
      : isConcession
      ? "Master Licence"
      : isPreviouslySuspended
      ? "Past Suspension"
      : "Verified Licence";

    const violationsClass = isSuspended
      ? "eatsafe-violations-suspended"
      : isWarning || isPreviouslySuspended
      ? "eatsafe-violations-warning"
      : "eatsafe-violations-clean";

    container.innerHTML = `
      <div class="eatsafe-card${isUserMinimized ? " minimized" : ""}" id="eatsafe-card">
        <!-- Header -->
        <div class="eatsafe-header" id="eatsafe-drag-handle">
          <div class="eatsafe-header-title">
            <span>EatSafe HK</span>
            <span class="eatsafe-header-badge ${headerBadgeClass}">${headerBadgeText}</span>
          </div>
          <div class="eatsafe-header-actions">
            <button class="eatsafe-btn-icon" id="eatsafe-min-btn" title="${isUserMinimized ? "Expand" : "Minimize"}">${isUserMinimized ? "+" : "–"}</button>
            <button class="eatsafe-btn-icon" id="eatsafe-close-btn" title="Close">✕</button>
          </div>
        </div>

        <!-- Body Summary -->
        <div class="eatsafe-body" id="eatsafe-body-content">
          <div class="eatsafe-restaurant-name">
            ${escapeHtml(placeName)}
          </div>
          ${
            secondaryName && secondaryName !== placeName
              ? `<div class="eatsafe-restaurant-tc">(${escapeHtml(secondaryName)})</div>`
              : r.name_tc && r.name_tc !== r.name_en
              ? `<div class="eatsafe-restaurant-tc">(${escapeHtml(r.name_tc)})</div>`
              : ""
          }

          <div class="eatsafe-address">
            <span>${escapeHtml(r.address_en)}</span>
          </div>

          <!-- Official Registered Licence Name Discrepancy Box if name differs -->
          ${
            r.name_en && r.name_en.toLowerCase() !== placeName.toLowerCase()
              ? `<div class="eatsafe-registered-name-box">
                  <span class="eatsafe-tag-label">Official Registered Licence Name:</span>
                  <span class="eatsafe-tag-val">${escapeHtml(r.name_en)}${r.name_tc && r.name_tc !== r.name_en ? ` (${escapeHtml(r.name_tc)})` : ""}</span>
                 </div>`
              : ""
          }

          <!-- Score Pill -->
          <div class="eatsafe-score-badge ${badgeClass}">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${badgeTitle}</span>
            </div>
            <span class="eatsafe-demerit-tag">${demeritTagText}</span>
          </div>

          <!-- Dai Pai Dong / Hawker Stall Notice -->
          ${
            isDaiPaiDong
              ? `<div class="eatsafe-discrepancy-box" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">
                  <strong>Fixed Pitch Hawker Notice:</strong> Operates as an official FEHD licensed street food stall (Dai Pai Dong). Regulated under the Hawker Regulation (Cap. 132AI) separately from standard indoor food premises.
                </div>`
              : ""
          }

          <!-- Pre-packaged Retail Notice -->
          ${
            isPrepackaged
              ? `<div class="eatsafe-discrepancy-box" style="background: #f0f9ff; border-color: #bae6fd; color: #0369a1;">
                  <strong>Pre-packaged Retail Notice:</strong> Sells sealed/boxed goods only; exempt from on-site licensing under Cap. 132X. Central manufacturing licensed under Food Factory #${escapeHtml(r.license_no)}.
                </div>`
              : ""
          }

          <!-- Concession / Discrepancy Notice -->
          ${
            r.discrepancyNote
              ? `<div class="eatsafe-discrepancy-box">
                  <strong>Master Licence Notice:</strong> ${escapeHtml(r.discrepancyNote)}
                </div>`
              : ""
          }

          ${
            isLowConfidence
              ? `<div class="eatsafe-unverified-warning">
                  ⚠️ This venue could not be matched to one specific FEHD licence (several outlets share this name, or the address could not be confirmed). The licence shown may belong to a different branch.
                </div>`
              : ""
          }

          <!-- Dropdown Button -->
          <button class="eatsafe-dropdown-btn" id="eatsafe-toggle-details">
            <span>View Violations & Licence History (詳細紀錄)</span>
            <span class="eatsafe-chevron" id="eatsafe-chevron">▼</span>
          </button>
        </div>

        <!-- Expanded Details Panel (Hidden by default, opens on dropdown click) -->
        <div class="eatsafe-details-panel" id="eatsafe-details-panel">
          ${
            isDaiPaiDong
              ? `<div class="eatsafe-section-title" style="color: #166534;">Fixed Pitch Hawker Licence (Cap. 132AI)</div>
                 <div class="eatsafe-violations-box" style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534;"><strong>Statutory Hawker Stall Notice:</strong><br>This eatery is an iconic Hong Kong open-air cooked food stall (Dai Pai Dong). It is regulated under the Hawker Regulation (Cap. 132AI / Cap. 132BK) under an official FEHD Fixed Pitch Hawker Licence (${escapeHtml(r.license_no)}).</div>`
              : ""
          }

          ${
            isPrepackaged
              ? `<div class="eatsafe-section-title" style="color: #0369a1;">Pre-packaged Retail Exemption (Cap. 132X)</div>
                 <div class="eatsafe-violations-box" style="background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1;"><strong>Statutory Exemption Notice:</strong><br>This shop sells sealed, pre-packaged retail food products only. Under the Food Business Regulation (Cap. 132X), on-site food preparation and restaurant licences are not required. Central manufacturing is licensed under Food Factory Licence #${escapeHtml(r.license_no)} (${escapeHtml(r.address_en)}).</div>`
              : ""
          }

          ${
            isSuspended && r.suspension_details
              ? `<div class="eatsafe-section-title" style="color: #b91c1c;">Statutory Suspension Notice</div>
                 <div class="eatsafe-violations-box eatsafe-violations-suspended"><strong>FEHD Suspension Order (Active):</strong><br>${escapeHtml(r.suspension_details.trim())}</div>`
              : ""
          }

          ${
            isPreviouslySuspended
              ? `<div class="eatsafe-section-title" style="color: #d97706;">Past Statutory Suspension (Resolved)</div>
                 <div class="eatsafe-violations-box eatsafe-violations-warning"><strong>FEHD Historical Order:</strong><br>${escapeHtml((r.suspensionBadgeText || r.suspension_details || "A previous temporary suspension has expired. Venue is currently licensed.").trim())}</div>`
              : ""
          }

          <div class="eatsafe-section-title">Suspension History (Demerit Points System)</div>
          <div class="eatsafe-violations-box ${violationsClass}">${escapeHtml((r.past_violations || "No suspension orders for this licence in FEHD's published suspension list. FEHD does not publish full inspection or conviction records.").trim())}</div>

          <div class="eatsafe-section-title">Official FEHD Licence Details</div>
          <div class="eatsafe-grid-meta">
            <div class="eatsafe-meta-item">
              <strong>Licence No.</strong>
              <span>${escapeHtml(r.license_no)}</span>
            </div>
            <div class="eatsafe-meta-item">
              <strong>District</strong>
              <span>${escapeHtml(r.district)}</span>
            </div>
            <div class="eatsafe-meta-item">
              <div class="eatsafe-meta-title-row">
                <strong>Licence Type</strong>
                <button type="button" class="eatsafe-fidelity-help-btn" id="eatsafe-licence-guide-trigger" title="Licence Type Guide">?</button>
              </div>
              <span>${escapeHtml(r.type)}</span>
            </div>
            <div class="eatsafe-meta-item">
              <strong>Expiry Date</strong>
              <span>${escapeHtml(r.expiry_date || "Active")}</span>
            </div>
          </div>

          ${
            r.endorsements
              ? `<div class="eatsafe-section-title">Endorsements & Permissions</div>
                 <div style="font-size: 10px; color: #475569; margin-bottom: 8px;">${escapeHtml(r.endorsements)}</div>`
              : ""
          }
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
            <span>Source: FEHD Open Data (DATA.GOV.HK)</span>
            <span>© 2026 EatSafe HK</span>
          </div>
        </div>
      </div>

      <!-- Fidelity-Style Help Popover Box for FEHD Food Licence Types -->
      <div class="eatsafe-fidelity-popover" id="eatsafe-licence-popover">
        <div class="eatsafe-fidelity-header">
          <h3 class="eatsafe-fidelity-title">Licence Type</h3>
          <button type="button" class="eatsafe-fidelity-close" id="eatsafe-guide-close-btn" title="Close">✕</button>
        </div>
        <div class="eatsafe-fidelity-scroll">
          <div class="eatsafe-fidelity-subhead">The most common licence types:</div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">General Restaurant</div>
            <p class="eatsafe-fidelity-item-desc">Allows full-scale food preparation, cooking (stir-frying, roasting, dim sum, banquet dishes), and on-premises dining for all food varieties.</p>
          </div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">Light Refreshment Restaurant</div>
            <p class="eatsafe-fidelity-item-desc">Restricted to preparing and selling specified simple food items (sandwiches, noodles, boiled snacks) using limited heating apparatus without excessive heat or fumes.</p>
          </div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">Food Factory</div>
            <p class="eatsafe-fidelity-item-desc">Authorises food preparation and manufacturing for takeaway, takeaway delivery, catering, central kitchens, or wholesale sale (no dining on-site).</p>
          </div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">Bakery</div>
            <p class="eatsafe-fidelity-item-desc">Authorises baking and retailing of bread, western cakes, pastries, and confectionery on premises.</p>
          </div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">Factory Canteen</div>
            <p class="eatsafe-fidelity-item-desc">Operates inside industrial buildings to serve food and drinks exclusively to factory workers employed within the same building.</p>
          </div>

          <div class="eatsafe-fidelity-item">
            <div class="eatsafe-fidelity-item-name">Fixed Pitch Hawker (Dai Pai Dong)</div>
            <p class="eatsafe-fidelity-item-desc">Regulated under Cap. 132AI (Hawker Regulation). Authorises traditional open-air street stalls and cooked food stalls.</p>
          </div>

          <div class="eatsafe-fidelity-divider"></div>

          <button type="button" class="eatsafe-fidelity-accordion-btn" id="eatsafe-guide-accordion-btn">
            <span class="eatsafe-fidelity-accordion-chevron" id="eatsafe-accordion-chevron">›</span>
            <span>Other licence types &amp; permits</span>
          </button>

          <div class="eatsafe-fidelity-accordion-content" id="eatsafe-guide-accordion-content">
            <div class="eatsafe-fidelity-subhead" style="color: #4b5563; font-size: 12px; margin: 6px 0 10px 0;">For specialized food operations &amp; permits:</div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Siu Mei and Lo Mei Shop</div>
              <p class="eatsafe-fidelity-item-desc">Retail sale of traditional roasted meats (siu mei) and marinated cooked food products (lo mei).</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Fresh Provision Shop</div>
              <p class="eatsafe-fidelity-item-desc">Authorises retail sale of fresh, chilled, or frozen beef, pork, mutton, poultry, fish, or edible reptiles.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Frozen Confection Factory</div>
              <p class="eatsafe-fidelity-item-desc">Manufacturing, freezing, and packing of ice creams, frozen yogurt, and popsicles.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Milk Factory</div>
              <p class="eatsafe-fidelity-item-desc">Processing, pasteurising, sterilising, and bottling or packaging of milk and reconstituted dairy products.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Cold Store</div>
              <p class="eatsafe-fidelity-item-desc">Commercial storage of wholesale food items under mechanical refrigeration and sub-zero chilled temperatures.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Composite Food Shop</div>
              <p class="eatsafe-fidelity-item-desc">Reheating, assembly, and retailing of diverse pre-cooked convenience foods and snacks within one shop.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Restricted Food Permit</div>
              <p class="eatsafe-fidelity-item-desc">Statutory permits required under Cap. 132X to sell high-risk foods including sashimi, sushi, raw oysters, cut meat, live marine fish, and soft-serve ice cream.</p>
            </div>

            <div class="eatsafe-fidelity-item">
              <div class="eatsafe-fidelity-item-name">Pre-packaged Retail Food (Exempt)</div>
              <p class="eatsafe-fidelity-item-desc">Retail sales of factory-sealed, boxed, or canned goods require no on-site restaurant licence under Cap. 132X.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook up interactive events
    const toggleBtn = container.querySelector("#eatsafe-toggle-details");
    const detailsPanel = container.querySelector("#eatsafe-details-panel");
    const chevron = container.querySelector("#eatsafe-chevron");

    toggleBtn?.addEventListener("click", () => {
      const isOpen = detailsPanel.classList.toggle("open");
      chevron.classList.toggle("open", isOpen);
      if (!isOpen) {
        guidePopover?.classList.remove("open");
        guideTrigger?.classList.remove("active");
      }
    });

    // Fidelity-style Licence Classification Guide toggle events
    const guideTrigger = container.querySelector("#eatsafe-licence-guide-trigger");
    const guidePopover = container.querySelector("#eatsafe-licence-popover");
    const guideCloseBtn = container.querySelector("#eatsafe-guide-close-btn");
    const accordionBtn = container.querySelector("#eatsafe-guide-accordion-btn");
    const accordionContent = container.querySelector("#eatsafe-guide-accordion-content");
    const accordionChevron = container.querySelector("#eatsafe-accordion-chevron");

    function positionPopover() {
      if (!guideTrigger || !guidePopover) return;
      if (window.innerWidth >= 1150) {
        const btnRect = guideTrigger.getBoundingClientRect();
        const rootRect = container.getBoundingClientRect();
        const topOffset = Math.max(10, Math.min(btnRect.top - rootRect.top - 70, 240));
        guidePopover.style.top = `${topOffset}px`;
        const arrowOffset = btnRect.top - rootRect.top - topOffset + (btnRect.height / 2) - 8;
        guidePopover.style.setProperty("--arrow-top", `${Math.max(16, arrowOffset)}px`);
      }
    }

    guideTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = guidePopover?.classList.toggle("open");
      guideTrigger.classList.toggle("active", isOpen);
      if (isOpen) {
        positionPopover();
      }
    });

    guideCloseBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      guidePopover?.classList.remove("open");
      guideTrigger?.classList.remove("active");
    });

    accordionBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isExpanded = accordionContent?.classList.toggle("open");
      accordionChevron?.classList.toggle("open", isExpanded);
      if (isExpanded) {
        setTimeout(() => {
          accordionContent?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      }
    });

    attachHeaderControls(container);
    updateWidgetPosition(true);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let isContextInvalidated = false;
  let observer = null;
  let pollIntervalId = null;

  function onWindowResize() {
    updateWidgetPosition();
  }

  function onWindowPopState() {
    setTimeout(checkForPlaceUpdate, 40);
  }

  function onDocumentClick(e) {
    // 1. Dismiss open licence guide popover when clicking outside
    const container = document.getElementById("eatsafe-hk-widget-root");
    if (container) {
      const guidePopover = container.querySelector("#eatsafe-licence-popover");
      const guideTrigger = container.querySelector("#eatsafe-licence-guide-trigger");
      if (guidePopover && guidePopover.classList.contains("open")) {
        if (!guidePopover.contains(e.target) && !guideTrigger?.contains(e.target)) {
          guidePopover.classList.remove("open");
          guideTrigger?.classList.remove("active");
        }
      }
    }

    // 2. Listen for clicks on Google Maps close buttons to immediately hide widget
    if (e.target && typeof e.target.closest === "function") {
      const closeBtn = e.target.closest(
        "button[aria-label*='Close'], button[aria-label*='close'], button[jsaction*='pane.close'], [data-tooltip*='Close']"
      );
      if (closeBtn) {
        setTimeout(checkForPlaceUpdate, 40);
      }
    }
  }

  // Check if Chrome extension runtime context is still alive
  function isRuntimeValid() {
    try {
      return typeof chrome !== "undefined" && !!chrome.runtime && typeof chrome.runtime.id === "string";
    } catch (e) {
      return false;
    }
  }

  // Graceful teardown when extension is reloaded or updated
  function handleContextInvalidated() {
    if (isContextInvalidated) return;
    isContextInvalidated = true;
    console.info("[EatSafe HK] Extension context invalidated (extension was reloaded/updated). Teardown active listeners. Please refresh the page (F5) to re-enable.");

    if (observer) {
      try { observer.disconnect(); } catch (_) {}
      observer = null;
    }
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("popstate", onWindowPopState);
    document.removeEventListener("click", onDocumentClick, true);

    const container = document.getElementById("eatsafe-hk-widget-root");
    if (container) {
      const card = container.querySelector(".eatsafe-card");
      if (card && !container.querySelector(".eatsafe-reload-notice")) {
        const reloadNotice = document.createElement("div");
        reloadNotice.className = "eatsafe-reload-notice";
        reloadNotice.style.cssText = "background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 6px 12px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center;";
        const labelSpan = document.createElement("span");
        labelSpan.textContent = "Extension updated.";
        const refreshBtn = document.createElement("button");
        refreshBtn.type = "button";
        refreshBtn.style.cssText = "background: none; border: none; padding: 0; cursor: pointer; color: #0284c7; font-weight: 600; font-size: 11px; text-decoration: underline;";
        refreshBtn.textContent = "Refresh page ↻";
        refreshBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.reload();
        });
        reloadNotice.appendChild(labelSpan);
        reloadNotice.appendChild(refreshBtn);
        card.appendChild(reloadNotice);
      }
    }
  }

  function schedulePlaceCheck(delayMs = 160) {
    if (debounceTimerId) clearTimeout(debounceTimerId);
    debounceTimerId = setTimeout(() => {
      debounceTimerId = null;
      checkForPlaceUpdate();
    }, delayMs);
  }

  // Check current place and update if changed
  async function checkForPlaceUpdate() {
    if (isContextInvalidated || !isRuntimeValid()) {
      handleContextInvalidated();
      return;
    }
    if (isChecking) {
      pendingRecheck = true;
      return;
    }

    const { name, secondaryName, category, address, lat, lng, isRestaurant, isCoordinate, outsideHongKong } = extractCurrentPlace();
    const container = document.getElementById("eatsafe-hk-widget-root");

    // Do NOT update or show widget for non-Hong Kong places or non-restaurant places (parks, hotels, subways, beaches, coordinates, etc.)
    // or when no restaurant is pulled up
    if (outsideHongKong || isCoordinate || !isRestaurant || !name || name.length < 2) {
      if (container) {
        container.style.display = "none";
      }
      const guidePopover = container?.querySelector("#eatsafe-licence-popover");
      if (guidePopover) guidePopover.classList.remove("open");
      lastPlaceKey = "";
      lastResolvedName = "";
      hydrationRetriedForName = "";
      return;
    }

    const normName = name.toLowerCase();
    const normAddr = (address || "").toLowerCase();

    // SPA Hydration Guard: When clicking a new restaurant on Google Maps, h1.DUwDvf updates
    // ~120-200ms BEFORE the address button & URL pin coordinates finish hydrating (often still empty
    // or temporarily holding the previous venue's address). Wait 1 brief settle tick so we fire
    // 1 single complete request instead of 2 requests!
    if (
      normName !== lastResolvedName &&
      hydrationRetriedForName !== normName &&
      (!normAddr || (lastResolvedAddress && normAddr === lastResolvedAddress))
    ) {
      hydrationRetriedForName = normName;
      schedulePlaceCheck(180);
      return;
    }

    // A valid restaurant is pulled up: ensure widget is visible
    if (container && container.style.display === "none") {
      container.style.display = "block";
    }

    const key = `${normName}::${(secondaryName || "").toLowerCase()}::${normAddr}`;
    if (key === lastPlaceKey) {
      // Same restaurant, but side panel may have moved or toggled: update position smoothly
      updateWidgetPosition();
      return;
    }

    lastPlaceKey = key;
    lastResolvedName = normName;
    if (normAddr) lastResolvedAddress = normAddr;
    hasUserManuallyDragged = false;
    isChecking = true;

    console.log("[EatSafe HK] Verified restaurant selection:", { name, secondaryName, category, address, lat, lng });
    renderWidget({ status: "loading", placeName: secondaryName ? `${name} (${secondaryName})` : name });

    if (!isRuntimeValid()) {
      handleContextInvalidated();
      return;
    }

    try {
      chrome.runtime.sendMessage(
        {
          action: "CHECK_RESTAURANT",
          name: name,
          secondaryName: secondaryName,
          address: address,
          lat: lat,
          lng: lng,
        },
        (response) => {
          isChecking = false;
          if (pendingRecheck) {
            pendingRecheck = false;
            schedulePlaceCheck(120);
          }

          if (!isRuntimeValid()) {
            handleContextInvalidated();
            return;
          }

          const lastError = chrome.runtime.lastError;
          if (lastError) {
            if (lastError.message && lastError.message.includes("Extension context invalidated")) {
              handleContextInvalidated();
              return;
            }
            console.warn("[EatSafe HK] Communication notice:", lastError.message);
            renderWidget({ status: "offline", placeName: name, secondaryName, error: lastError.message });
            return;
          }

          if (response && response.isQuotaExceeded) {
            console.warn("[EatSafe HK] Daily D1 free tier limit reached:", response.error);
            renderWidget({
              status: "quota",
              placeName: name,
              secondaryName: secondaryName,
              error: response.error,
            });
            return;
          }

          if (response && response.isOffline) {
            console.warn("[EatSafe HK] Backend server offline:", response.error);
            renderWidget({
              status: "offline",
              placeName: name,
              secondaryName: secondaryName,
              error: response.error,
            });
            return;
          }

          if (response && response.outsideHongKong) {
            console.log("[EatSafe HK] Venue is outside Hong Kong territorial boundary. Suppressing widget.");
            const widgetRoot = document.getElementById("eatsafe-hk-widget-root");
            if (widgetRoot) widgetRoot.style.display = "none";
            lastPlaceKey = "";
            return;
          }

          if (response && response.found) {
            console.log("Match found:", response.restaurant?.name_en);
            renderWidget({
              status: "found",
              placeName: name,
              secondaryName: secondaryName,
              data: response,
            });
          } else {
            console.log("No match found for:", name);
            renderWidget({
              status: "not_found",
              placeName: name,
              secondaryName: secondaryName,
              data: response,
            });
          }
        }
      );
    } catch (e) {
      isChecking = false;
      if (e?.message && e.message.includes("Extension context invalidated")) {
        handleContextInvalidated();
        return;
      }
      console.warn("[EatSafe HK] Communication error:", e.message);
      renderWidget({ status: "offline", placeName: name, secondaryName, error: e.message });
    }
  }

  // Observer on Google Maps pane and URL changes (debounced so SPA hydration settles cleanly)
  try {
    observer = new MutationObserver((mutations) => {
      if (!isRuntimeValid()) {
        handleContextInvalidated();
        return;
      }
      // Ignore mutations that occurred strictly inside our own widget container
      const widgetRoot = document.getElementById("eatsafe-hk-widget-root");
      if (widgetRoot && mutations.length > 0 && mutations.every((m) => widgetRoot.contains(m.target))) {
        return;
      }
      schedulePlaceCheck(160);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (_) {}

  // Single global listeners (cleaned up on context invalidation)
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("popstate", onWindowPopState);
  document.addEventListener("click", onDocumentClick, true);

  // Lightweight polling fallback for dynamic SPA navigation and panel movements
  pollIntervalId = setInterval(() => {
    if (!isRuntimeValid()) {
      handleContextInvalidated();
      return;
    }
    checkForPlaceUpdate();
  }, 1500);

  // Initial check
  setTimeout(checkForPlaceUpdate, 500);
})();
