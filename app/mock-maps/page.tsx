"use client";

import React, { useState } from "react";

interface DemoPlace {
  name: string;
  subtitle: string;
  address: string;
  rating: string;
  tag: string;
  price: string;
  coords?: string;
  menuChips?: string[];
}

const DEMO_PLACES: DemoPlace[] = [
  {
    name: "Krua Walaiphan",
    subtitle: "",
    address: "G/F, Hang Sing Mansion, 64-70 High Street, Sai Ying Pun, Hong Kong",
    rating: "4.5 ★★★★☆ (420 reviews)",
    tag: "Thai restaurant",
    price: "HK$100-250",
    coords: "@22.2858,114.1415",
  },
  {
    name: "Australia Dairy Company",
    subtitle: "澳洲牛奶公司",
    address: "47 Parkes St, Jordan, Kowloon",
    rating: "4.1 ★★★★☆ (9,850 reviews)",
    tag: "Cha chaan teng",
    price: "HK$40-70",
    coords: "@22.3045338,114.1705646",
  },
  {
    name: "Monster BBQ Restaurant",
    subtitle: "燒味獸",
    address: "Shop 4, G/F, Seaview Garden, 31-33 Shau Kei Wan Main Street East, Shau Kei Wan, Hong Kong",
    rating: "4.3 ★★★★☆ (420 reviews)",
    tag: "Cantonese restaurant",
    price: "HK$50-100",
    coords: "@22.2801,114.2288",
  },
  {
    name: "Lung King Heen",
    subtitle: "龍景軒",
    address: "Four Seasons Hotel Hong Kong, 8 Finance St, Central, Hong Kong",
    rating: "4.6 ★★★★★ (1,980 reviews)",
    tag: "Cantonese restaurant",
    price: "HK$800+",
    coords: "@22.2866,114.1578",
  },
  {
    name: "Tim Ho Wan (Central)",
    subtitle: "添好運點心專門店",
    address: "Shop 12A & 12B, Level 1, MTR Hong Kong Station, Central, Hong Kong",
    rating: "4.0 ★★★★☆ (3,150 reviews)",
    tag: "Dim sum restaurant",
    price: "HK$60-120",
    coords: "@22.2842,114.1582",
  },
  {
    name: "Yat Lok Restaurant",
    subtitle: "一樂燒鵝",
    address: "G/F, 34-38 Stanley Street, Central, Hong Kong",
    rating: "4.1 ★★★★☆ (2,600 reviews)",
    tag: "Cantonese restaurant",
    price: "HK$70-150",
    coords: "@22.2818,114.1554",
  },
  {
    name: "Kam's Roast Goose",
    subtitle: "甘牌燒鵝",
    address: "G/F, Po Wah Commercial Centre, 226 Hennessy Road, Wan Chai, Hong Kong",
    rating: "4.2 ★★★★☆ (4,320 reviews)",
    tag: "Cantonese restaurant",
    price: "HK$100-200",
    coords: "@22.2777,114.1748",
  },
  {
    name: "King Lung Heen",
    subtitle: "璟瓏軒",
    address: "Museum Restaurant on 4/F., Hong Kong Palace Museum, 8 Museum Drive, West Kowloon Cultural District, Kowloon",
    rating: "4.0 ★★★★☆ (310 reviews)",
    tag: "Chinese restaurant",
    price: "HK$200-400",
    coords: "@22.3015,114.1595",
  },
  {
    name: "Sun Hing Restaurant",
    subtitle: "新興食家",
    address: "地下8號舖, Markfield Building, Smithfield, Kennedy Town, Hong Kong Island, Hong Kong",
    rating: "4.1 ★★★★☆ (2,210 reviews)",
    tag: "Dim sum restaurant",
    price: "HK$50-100",
    coords: "@22.2815,114.1287",
  },
  {
    name: "Bakehouse Soho",
    subtitle: "",
    address: "G/F., Asiarich Court, 5 Staunton Street, Central, Hong Kong",
    rating: "4.4 ★★★★☆ (3,400 reviews)",
    tag: "Bakery",
    price: "HK$20-60",
    coords: "@22.2824,114.1517",
  },
  {
    name: "Hong Kong Park",
    subtitle: "香港公園",
    address: "19 Cotton Tree Dr, Central, Hong Kong",
    rating: "4.6 ★★★★★ (18,450 reviews)",
    tag: "Public park",
    price: "",
    coords: "@22.2775,114.1610",
  },
  {
    name: "Kennedy Town Station",
    subtitle: "堅尼地城站",
    address: "Kennedy Town, Hong Kong",
    rating: "4.2 ★★★★☆ (1,120 reviews)",
    tag: "Subway station",
    price: "",
    coords: "@22.2812,114.1288",
  },
  {
    name: "Pier 7 Café & Bar (Central)",
    subtitle: "",
    address: "Shop M, Level 2, Central Pier No. 7, Star Ferry Pier, Central, Hong Kong",
    rating: "4.2 ★★★★☆ (860 reviews)",
    tag: "Bar & grill",
    price: "HK$100-200",
    coords: "@22.2868,114.1618",
    menuChips: ["牛肉", "Hummus", "Cocktail", "Fish & Chips"],
  },
  {
    name: "Samsen (Central)",
    subtitle: "",
    address: "G/F, 18 On Lan St, Central, Hong Kong",
    rating: "4.5 ★★★★★ (1,840 reviews)",
    tag: "Thai restaurant",
    price: "HK$150-300",
    coords: "@22.2818,114.1554",
  },
  {
    name: "Amber",
    subtitle: "",
    address: "7/F, The Landmark Mandarin Oriental, 15 Queen's Road Central, Central, Hong Kong",
    rating: "4.5 ★★★★★ (980 reviews)",
    tag: "French restaurant",
    price: "HK$1,000+",
    coords: "@22.2810,114.1555",
  },
  {
    name: "The Landmark Mandarin Oriental",
    subtitle: "置地文華東方酒店",
    address: "15 Queen's Road Central, Central, Hong Kong",
    rating: "4.7 ★★★★★ (2,430 reviews)",
    tag: "Hotel",
    price: "",
    coords: "@22.2810,114.1555",
  },
  {
    name: "The Lobby at The Peninsula",
    subtitle: "半島酒店 大堂茶座",
    address: "The Peninsula Hong Kong, Salisbury Road, Tsim Sha Tsui, Kowloon",
    rating: "4.5 ★★★★★ (2,890 reviews)",
    tag: "Hotel lounge",
    price: "HK$400-800",
    coords: "@22.2952,114.1719",
  },
  {
    name: "Jenny Bakery",
    subtitle: "珍妮曲奇聰明小熊",
    address: "Shop 24, G/F, Mirador Mansion, 54-64 Nathan Road, Tsim Sha Tsui, Kowloon",
    rating: "4.2 ★★★★☆ (4,120 reviews)",
    tag: "Cookie shop",
    price: "HK$80-160",
    coords: "@22.2974,114.1722",
  },
  {
    name: "Genki Sushi (Admiralty)",
    subtitle: "元氣壽司",
    address: "Shop C1, G/F, Far East Finance Centre, 16 Harcourt Road, Admiralty, Hong Kong",
    rating: "3.9 ★★★☆☆ (920 reviews)",
    tag: "Sushi restaurant",
    price: "HK$100-200",
    coords: "@22.2796,114.1648",
  },
  {
    name: "Ichiran Ramen Shibuya",
    subtitle: "一蘭 渋谷店",
    address: "1 Chome-22-7 Jinnan, Shibuya City, Tokyo 150-0041, Japan",
    rating: "4.4 ★★★★☆ (8,900 reviews)",
    tag: "Ramen restaurant",
    price: "¥1,000-2,000",
    coords: "@35.6617,139.7006",
  },
  {
    name: "RESBYNE",
    subtitle: "",
    address: "G/F., NO. 4 POUND LANE, SHEUNG WAN, HONG KONG",
    rating: "4.5 ★★★★★ (180 reviews)",
    tag: "Restaurant",
    price: "HK$200-400",
    coords: "@22.2845,114.1481",
  },
  {
    name: "Hong Lin Restaurant",
    subtitle: "康年餐廳",
    address: "Shop 2-3, G/F, 143-145 Tung Choi Street, Mong Kok, Kowloon",
    rating: "3.8 ★★★☆☆ (650 reviews)",
    tag: "Cha chaan teng",
    price: "HK$40-80",
    coords: "@22.3204,114.1708",
  },
  {
    name: "Luk On Kui",
    subtitle: "六安居",
    address: "1/F(PORTION), 2/F & 3/F, 40-50 DES VOEUX ROAD WEST, SHEUNG WAN, HONG KONG",
    rating: "4.2 ★★★★☆ (3,100 reviews)",
    tag: "Dim sum restaurant",
    price: "HK$80-150",
    coords: "@22.2875236,114.1468924",
  },
  {
    name: "Tin Lung Heen",
    subtitle: "天龍軒",
    address: "102/F, The Ritz-Carlton, Hong Kong, International Commerce Centre (ICC), 1 Austin Rd W, West Kowloon",
    rating: "4.7 ★★★★★ (2,150 reviews)",
    tag: "Cantonese restaurant",
    price: "HK$600-1,200",
    coords: "@22.3033,114.1601",
  },
  {
    name: "Pici Central",
    subtitle: "",
    address: "G/F, No. 24-26 Aberdeen St, Central, Hong Kong",
    rating: "4.5 ★★★★★ (3,800 reviews)",
    tag: "Italian restaurant",
    price: "HK$150-300",
    coords: "@22.2831,114.1524",
  },
  {
    name: "Sing Heung Yuen",
    subtitle: "勝香園",
    address: "2 Mee Lun Street, Central, Hong Kong",
    rating: "4.0 ★★★★☆ (3,100 reviews)",
    tag: "Dai pai dong",
    price: "HK$40-70",
    coords: "@22.2841,114.1523",
  },
  {
    name: "Wing Lok Yuen Restaurant",
    subtitle: "永樂園餐廳",
    address: "19 Chiu Lung Street, Central, Hong Kong",
    rating: "4.0 ★★★★☆ (1,850 reviews)",
    tag: "Cha chaan teng",
    price: "HK$40-80",
    coords: "@22.2825,114.1575",
  },
  {
    name: "Kau Kee Restaurant",
    subtitle: "九記清湯牛腩",
    address: "21 Gough Street, Central, Hong Kong",
    rating: "3.9 ★★★☆☆ (4,920 reviews)",
    tag: "Noodle shop",
    price: "HK$60-120",
    coords: "@22.2843,114.1522",
  },
  {
    name: "Lan Fong Yuen",
    subtitle: "蘭芳園",
    address: "2 Gage Street, Central, Hong Kong",
    rating: "3.9 ★★★☆☆ (4,200 reviews)",
    tag: "Cha chaan teng",
    price: "HK$40-80",
    coords: "@22.2830,114.1534",
  },
  {
    name: "Central Restaurant",
    subtitle: "中央飯店",
    address: "Tung Lo Court, 136-154 Tai Po Rd, Tong Mi, Kowloon",
    rating: "4.1 ★★★★☆ (2,840 reviews)",
    tag: "Dim sum restaurant",
    price: "HK$60-120",
    coords: "@22.3275,114.1648",
  },
];

export default function MockMapsPage() {
  const [currentPlace, setCurrentPlace] = useState(DEMO_PLACES[0]);
  const [isPlacePanelOpen, setIsPlacePanelOpen] = useState(true);
  const [twoTabsMode, setTwoTabsMode] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const coordStr = currentPlace.coords || "@22.3045338,114.1705646";
      const newUrl = `/mock-maps/place/${encodeURIComponent(currentPlace.name)}/${coordStr}`;
      window.history.replaceState(null, currentPlace.name, newUrl);
    }
  }, []);

  const selectPlace = (place: (typeof DEMO_PLACES)[0]) => {
    setCurrentPlace(place);
    setIsPlacePanelOpen(true);
    if (typeof window !== "undefined") {
      const coordStr = place.coords || "@22.3193,114.1694";
      const newUrl = `/mock-maps/place/${encodeURIComponent(place.name)}/${coordStr}`;
      window.history.pushState(null, place.name, newUrl);
      window.dispatchEvent(new Event("popstate"));
    }
  };

  const closePlacePanel = () => {
    setIsPlacePanelOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "Results", "/mock-maps/search/Restaurants");
      window.dispatchEvent(new Event("popstate"));
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden font-sans bg-[#e5e3df]">
      {/* Leftmost Search Results List panel (simulates Picture 2 left tab) */}
      {twoTabsMode && (
        <div
          id="mock-search-panel"
          className="w-[360px] h-full bg-white shadow-md z-10 flex flex-col border-r border-slate-200 shrink-0"
        >
          <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">Results</span>
            <span className="text-xs text-slate-500">Restaurants in Hong Kong</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {DEMO_PLACES.slice(0, 6).map((p) => (
              <button
                key={p.name}
                onClick={() => selectPlace(p)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  currentPlace.name === p.name && isPlacePanelOpen
                    ? "bg-emerald-50 border-emerald-500 shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs text-slate-900">{p.name}</div>
                <div className="text-[11px] text-slate-500">{p.tag} • {p.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mock Google Maps Side Panel with exact Google Maps DOM hierarchy */}
      {isPlacePanelOpen && (
        <div id="mock-side-panel" className="w-[400px] h-full bg-white shadow-xl z-10 flex flex-col overflow-y-auto border-r border-slate-200 shrink-0">
          <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-800"
              value={currentPlace.name}
              readOnly
            />
            <button
              aria-label="Close"
              onClick={closePlacePanel}
              className="px-2 py-1 text-slate-400 hover:text-slate-800 rounded-md text-sm font-bold transition-colors"
              title="Close Restaurant Details"
            >
              ✕
            </button>
          </div>

        <div className="h-28 bg-slate-800 flex items-center justify-center text-white font-bold text-sm tracking-wide">
          <span>Google Maps Hong Kong (Simulation)</span>
        </div>

        <div className="p-4" role="main">
          {/* Matches Google Maps standard classnames DUwDvf and fontHeadlineLarge */}
          <h1 className="DUwDvf fontHeadlineLarge text-2xl font-bold text-slate-900 leading-tight mb-0.5">
            {currentPlace.name}
          </h1>

          {currentPlace.subtitle && (
            <h2 className="fontHeadlineSmall text-sm font-semibold text-slate-600 mb-2">
              {currentPlace.subtitle}
            </h2>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            <span className="text-amber-600 font-bold">{currentPlace.rating}</span>
            {currentPlace.price && (
              <>
                <span>•</span>
                <span>{currentPlace.price}</span>
              </>
            )}
          </div>

          {/* Matches Google Maps Category button DkEaL */}
          <div className="mb-3">
            <button className="DkEaL text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 px-2 py-0.5 rounded">
              {currentPlace.tag}
            </button>
          </div>

          {/* Popular dish / menu tags simulating Google Maps dish chips */}
          {currentPlace.menuChips && currentPlace.menuChips.length > 0 && (
            <div className="m6QErb k2tWef flex gap-1.5 overflow-x-auto py-1 mb-3">
              {currentPlace.menuChips.map((chip) => (
                <span
                  key={chip}
                  className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-4 pb-3 border-b border-slate-200">
            <div className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold text-center">Directions</div>
            <div className="flex-1 py-1.5 px-2 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold text-center">Save</div>
            <div className="flex-1 py-1.5 px-2 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold text-center">Nearby</div>
            <div className="flex-1 py-1.5 px-2 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold text-center">Share</div>
          </div>

          {/* Dine-in / Takeout / Delivery indicators for food venues */}
          {currentPlace.tag.toLowerCase().includes("restaurant") || currentPlace.tag.toLowerCase().includes("cafe") ? (
            <div className="flex items-center gap-3 text-xs text-emerald-700 mb-3 font-medium">
              <span>✓ Dine-in</span>
              <span>•</span>
              <span>✓ Takeout</span>
              <span>•</span>
              <span>✓ Delivery</span>
            </div>
          ) : null}

          {/* Address button matching Google Maps data-item-id */}
          <div className="py-2 border-b border-slate-100">
            <button
              data-item-id="address"
              aria-label={`Address: ${currentPlace.address}`}
              className="w-full text-left text-xs text-slate-700 flex items-start gap-2 hover:text-blue-600"
            >
              <span className="Io6YTe leading-relaxed font-medium">{currentPlace.address}</span>
            </button>
          </div>

          <div className="py-2.5 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <span>🕒</span>
            <span>Open • Closes 10:00 PM</span>
          </div>

          <div className="py-2.5 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <span>📞</span>
            <span>+852 2520 2838</span>
          </div>
        </div>
      </div>
      )}

      {/* Mock Map Canvas */}
      <div
        id="mock-map-canvas"
        className="flex-1 relative bg-[#aad3df] cursor-crosshair"
        onClick={(e) => {
          // If clicking background canvas directly (not on controls), close place panel like real Google Maps
          if (e.target === e.currentTarget) {
            closePlacePanel();
          }
        }}
      >
        {/* Interactive Mode & Panel Controls (Top Left of Canvas) */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg z-10 border border-slate-200 flex items-center gap-2">
          <button
            id="toggle-tabs-mode-btn"
            onClick={() => setTwoTabsMode(!twoTabsMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
              twoTabsMode
                ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            {twoTabsMode ? "📑 2 Tabs Mode (Picture 2)" : "📄 1 Tab Mode (Picture 1)"}
          </button>

          <button
            id="toggle-place-panel-btn"
            onClick={() => {
              if (isPlacePanelOpen) {
                closePlacePanel();
              } else {
                selectPlace(currentPlace);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
              isPlacePanelOpen
                ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
            }`}
          >
            {isPlacePanelOpen ? "✕ Close Restaurant Panel" : "✓ Open Restaurant Panel"}
          </button>
        </div>

        {/* Venue Selector (Top Right of Canvas) */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg z-10 border border-slate-200 max-w-[260px]">
          <div className="text-xs font-bold text-slate-900 mb-1.5">Select Hong Kong Venues:</div>
          <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
            {DEMO_PLACES.map((p) => (
              <button
                key={p.name}
                onClick={() => selectPlace(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all border ${
                  currentPlace.name === p.name && isPlacePanelOpen
                    ? "bg-[#006837] text-white border-[#006837] shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.name} <span className="font-normal text-[11px] opacity-80">({p.tag})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
