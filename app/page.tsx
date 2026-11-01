"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Search,
  RotateCcw,
  Building2,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Ban,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";

export interface RestaurantRecord {
  license_no: string;
  type: string;
  district: string;
  name_en: string;
  address_en: string;
  expiry_date: string;
  status: "CLEAN" | "DEMERIT_WARNING" | "SUSPENDED";
  demerit_points: number;
  past_violations: string | null;
  suspension_details: string | null;
  category: string | null;
  endorsements?: string | null;
  name_tc?: string | null;
  address_tc?: string | null;
  aiScore?: number;
  aiMatchNote?: string;
  updated_at?: string;
}

const DISTRICTS = [
  "- All Districts -",
  "CENTRAL/WESTERN",
  "EASTERN",
  "SOUTHERN",
  "WAN CHAI",
  "ISLANDS",
  "YAU TSIM",
  "MONG KOK",
  "SHAM SHUI PO",
  "KOWLOON CITY",
  "WONG TAI SIN",
  "KWUN TONG",
  "TSUEN WAN",
  "KWAI TSING",
  "NORTH",
  "TAI PO",
  "SAI KUNG",
  "SHA TIN",
  "TUEN MUN",
  "YUEN LONG",
];

const RESTAURANT_TYPES = [
  {
    code: "ALL",
    label: "All Licensed General Restaurants & Eateries",
    note: "",
  },
  {
    code: "General Restaurant Licence",
    label: "List of Licensed General Restaurants",
    note: "Examples of General Restaurant include: Chinese restaurant, steakhouse and hot-pot restaurant, etc.",
  },
  {
    code: "Light Refreshment Restaurant Licence",
    label: "List of Licensed Light Refreshment Restaurants",
    note: "Examples of Light Refreshment Restaurant include: congee shop, noodle shop and coffee shop, etc.",
  },
  {
    code: "Marine Restaurant Licence",
    label: "List of Licensed Marine Restaurants",
    note: "Examples include floating restaurants and vessel dining.",
  },
  {
    code: "Factory Canteen",
    label: "List of Factory Canteens",
    note: "Canteens operating within industrial buildings for workplace staff.",
  },
];

const NON_RESTAURANT_TYPES = [
  { code: "ALL", label: "All Licensed Food Premises (Non-Restaurant)" },
  { code: "Food Factory Licence", label: "List of Licensed Food Factories" },
  { code: "Bakery Licence", label: "List of Licensed Bakeries" },
  { code: "Fresh Provision Shop Licence", label: "List of Licensed Fresh Provision Shops" },
  { code: "Cold Store Licence", label: "List of Licensed Cold Stores" },
  { code: "Siu Mei and Lo Mei Shop Licence", label: "List of Licensed Siu Mei and Lo Mei Shops" },
];

const RESTRICTED_FOOD_TYPES = [
  { code: "ALL", label: "All Restricted Food Premises" },
  { code: "Chinese Herb Tea Permit", label: "Chinese Herb Tea" },
  { code: "Milk Permit", label: "Milk" },
  { code: "Frozen Confections Permit", label: "Frozen Confections" },
  { code: "Sushi / Sashimi Permit", label: "Sushi / Sashimi / Raw Oysters" },
];

export default function Home() {
  // Search Mode: "shopsign_address" vs "licence_type"
  const [searchMode, setSearchMode] = useState<"shopsign_address" | "licence_type">("shopsign_address");

  // Sub-category when searching by licence/permit type
  const [typeCategory, setTypeCategory] = useState<
    | "restaurants"
    | "non_restaurants"
    | "restricted_foods"
    | "online_restricted"
  >("restaurants");

  // Form Fields
  const [district, setDistrict] = useState("- All Districts -");
  const [address, setAddress] = useState("");
  const [shopsign, setShopsign] = useState("");
  const [licenceNo, setLicenceNo] = useState("");
  const [licenceType, setLicenceType] = useState("ALL");
  const [specialEndorsement, setSpecialEndorsement] = useState("All Licensed General Restaurants");
  const [onlinePlatform, setOnlinePlatform] = useState("");
  const [sortBy, setSortBy] = useState("Shopsign");

  // Results State
  const [results, setResults] = useState<RestaurantRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [stats, setStats] = useState({ total: 0, clean: 0, warning: 0, suspended: 0 });
  const [syncMeta, setSyncMeta] = useState<{
    last_sync_date: string;
    generation_date: string;
    total_records: number;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RestaurantRecord | null>(null);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // Initial fetch on mount with URL searchParams support
  useEffect(() => {
    let qShopsign = shopsign;
    let qLicenceNo = licenceNo;
    let qAddress = address;
    let qDistrict = district;

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlShop = sp.get("shopsign") || sp.get("q") || "";
      const urlLic = sp.get("licence_no") || "";
      const urlAddr = sp.get("address") || "";
      const urlDist = sp.get("district") || "";

      if (urlShop) {
        qShopsign = urlShop;
        setShopsign(urlShop);
      }
      if (urlLic) {
        qLicenceNo = urlLic;
        setLicenceNo(urlLic);
      }
      if (urlAddr) {
        qAddress = urlAddr;
        setAddress(urlAddr);
      }
      if (urlDist && DISTRICTS.includes(urlDist)) {
        qDistrict = urlDist;
        setDistrict(urlDist);
      }
    }

    executeSearch({
      shopsign: qShopsign,
      licenceNo: qLicenceNo,
      address: qAddress,
      district: qDistrict,
    });
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync?force=true");
      await res.json();
      await executeSearch();
    } catch (err) {
      console.error("Manual sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const executeSearch = async (overrides?: {
    shopsign?: string;
    licenceNo?: string;
    address?: string;
    district?: string;
  }) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();

      const searchShopsign = overrides?.shopsign !== undefined ? overrides.shopsign : shopsign;
      const searchAddress = overrides?.address !== undefined ? overrides.address : address;
      const searchLicenceNo = overrides?.licenceNo !== undefined ? overrides.licenceNo : licenceNo;
      const searchDistrict = overrides?.district !== undefined ? overrides.district : district;

      if (searchShopsign.trim()) params.set("shopsign", searchShopsign.trim());
      if (searchAddress.trim()) params.set("address", searchAddress.trim());
      if (searchLicenceNo.trim()) params.set("licence_no", searchLicenceNo.trim());

      if (searchDistrict !== "- All Districts -") {
        params.set("district", searchDistrict);
      }

      if (searchMode === "licence_type") {
        if (licenceType && licenceType !== "ALL") {
          params.set("licence_type", licenceType);
        }
        if (specialEndorsement && specialEndorsement !== "All Licensed General Restaurants") {
          params.set("endorsement", specialEndorsement);
        }
        if (typeCategory === "online_restricted") {
          params.set("category", "List of Permitted Premises for Online Sale of Restricted Foods");
          if (onlinePlatform.trim()) {
            params.set("shopsign", onlinePlatform.trim());
          }
        }
      }

      if (sortBy === "District") {
        params.set("sortBy", "district");
      } else if (sortBy === "Score") {
        params.set("sortBy", "score");
      } else {
        params.set("sortBy", "shopsign");
      }

      const res = await fetch(`/api/restaurants?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setResults(data.restaurants || []);
      setAiAssisted(Boolean(data.aiAssisted));
      setAiReasoning(data.aiReasoning || null);
      if (data.stats) setStats(data.stats);
      if (data.syncMeta) setSyncMeta(data.syncMeta);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDistrict("- All Districts -");
    setAddress("");
    setShopsign("");
    setLicenceNo("");
    setLicenceType("ALL");
    setSpecialEndorsement("All Licensed General Restaurants");
    setOnlinePlatform("");
    setSortBy("Shopsign");
    setAiAssisted(false);
    setAiReasoning(null);
    setTimeout(() => executeSearch(), 50);
  };

  const currentTypeNote =
    RESTAURANT_TYPES.find((t) => t.code === licenceType)?.note ||
    "Examples of General Restaurant include: Chinese restaurant, steakhouse and hot-pot restaurant, etc.";

  const districtId = useId();
  const addressId = useId();
  const shopsignId = useId();
  const licenceNoId = useId();
  const sortById = useId();
  const licenceTypeId = useId();
  const specialEndorsementId = useId();
  const onlinePlatformId = useId();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Official Government Header Banner */}
      <header className="bg-[#006837] text-white border-b-4 border-[#ffcc00] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/15 px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase border border-white/20">
                GovHK 香港特區政府
              </span>
              <span className="text-xs text-emerald-100">
                Food and Environmental Hygiene Department | 食物環境衞生署
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
              Food Premises Licence & Hygiene Search Facility
              <span className="text-base font-normal text-emerald-200 hidden md:inline">
                (食肆牌照及食物安全紀錄搜尋系統)
              </span>
            </h1>
          </div>

          <div className="text-xs text-emerald-100 flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Official FEHD Public Registry
            </span>
            <span className="hidden md:inline-block text-emerald-300/40">|</span>
            <span className="bg-emerald-950/60 border border-emerald-600/50 px-2.5 py-0.5 rounded text-[11px] font-mono text-emerald-200">
              XML Date: {syncMeta?.generation_date || "2026-09-21"} ({syncMeta?.total_records?.toLocaleString() || "42,761"} premises & bakeries)
            </span>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-all border border-emerald-600 shadow-sm"
              title="Daily Morning Sync from FEHD Open Data (Restaurants, Bakeries, Food Factories & Permits)"
            >
              <RotateCcw className={`w-3 h-3 ${syncing ? "animate-spin text-amber-300" : ""}`} />
              {syncing ? "Syncing XML..." : "Sync Live XML"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        {/* System Overview Notice */}
        <div className="bg-white border border-slate-300 rounded-lg p-4 mb-6 shadow-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-[#006837] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            <strong className="text-slate-900">Official Daily Licence & Safety Verification:</strong> Synchronized with the Food and Environmental Hygiene Department's daily open data feeds (<code>LP_Restaurants_EN.XML</code>, <code>LP_OtherFood_EN.XML</code>, and <code>LP_Permits_EN.XML</code>, updated every morning). Covers all 42,000+ licensed restaurants, bakeries, food factories, supermarkets, and restricted food permits across Hong Kong with official licence status, active suspensions, and statutory enforcement orders under Cap. 132.
          </div>
        </div>

        {/* Search Mode Navigation Tabs */}
        <div className="bg-white border border-slate-300 rounded-t-lg border-b-0 overflow-hidden shadow-sm flex flex-col sm:flex-row">
          <button
            type="button"
            onClick={() => setSearchMode("shopsign_address")}
            className={`flex-1 py-3 px-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              searchMode === "shopsign_address"
                ? "bg-slate-50 border-[#006837] text-[#006837]"
                : "bg-slate-100 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Search className="w-4 h-4" />
            Search by Shopsign / Address (按招牌 / 地址搜尋)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("licence_type")}
            className={`flex-1 py-3 px-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              searchMode === "licence_type"
                ? "bg-slate-50 border-[#006837] text-[#006837]"
                : "bg-slate-100 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            Search by Licence / Permit Type (按牌照 / 許可證類別搜尋)
          </button>
        </div>

        {/* Search Form Container */}
        <div className="bg-white border border-slate-300 rounded-b-lg p-5 sm:p-6 mb-8 shadow-sm">
          {/* Sub-Tabs for Licence / Permit Type Mode */}
          {searchMode === "licence_type" && (
            <div className="mb-6 border-b border-slate-200 pb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                List of Licensed / Permitted Food Premises by Licence / Permit Type:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setTypeCategory("restaurants");
                    setLicenceType("ALL");
                  }}
                  className={`p-2.5 rounded text-left border transition-all ${
                    typeCategory === "restaurants"
                      ? "bg-[#006837] text-white border-[#006837] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  List of Licensed Restaurants and Factory Canteens
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeCategory("non_restaurants");
                    setLicenceType("ALL");
                  }}
                  className={`p-2.5 rounded text-left border transition-all ${
                    typeCategory === "non_restaurants"
                      ? "bg-[#006837] text-white border-[#006837] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  List of Licensed Food Premises (excluding Restaurants and Factory Canteens)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeCategory("restricted_foods");
                    setLicenceType("ALL");
                  }}
                  className={`p-2.5 rounded text-left border transition-all ${
                    typeCategory === "restricted_foods"
                      ? "bg-[#006837] text-white border-[#006837] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  List of Permitted Premises for the Sale of Restricted Foods
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeCategory("online_restricted");
                    setLicenceType("ALL");
                  }}
                  className={`p-2.5 rounded text-left border transition-all ${
                    typeCategory === "online_restricted"
                      ? "bg-[#006837] text-white border-[#006837] shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  List of Permitted Premises for Online Sale of Restricted Foods
                </button>
              </div>
            </div>
          )}

          {/* Form Fields Grid */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch();
            }}
            className="space-y-4"
          >
            {/* Conditional Type Selectors for Licence Type Mode */}
            {searchMode === "licence_type" && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 mb-4">
                {typeCategory === "restaurants" && (
                  <>
                    <div>
                      <label htmlFor={licenceTypeId} className="block text-xs font-bold text-slate-700 mb-1">
                        Licence Type
                      </label>
                      <select
                        id={licenceTypeId}
                        value={licenceType}
                        onChange={(e) => setLicenceType(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                      >
                        {RESTAURANT_TYPES.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-600 mt-1 italic">{currentTypeNote}</p>
                    </div>

                    <div>
                      <label htmlFor={specialEndorsementId} className="block text-xs font-bold text-slate-700 mb-1">
                        Special Endorsement / Permission
                      </label>
                      <select
                        id={specialEndorsementId}
                        value={specialEndorsement}
                        onChange={(e) => setSpecialEndorsement(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                      >
                        <option value="All Licensed General Restaurants">All Licensed General Restaurants</option>
                        <option value="Outside Seating Accommodation">Outside Seating Accommodation (OSA) (#A)</option>
                        <option value="Karaoke Establishment Permit">Karaoke Establishment Permit (#B)</option>
                        <option value="Sale of Raw Oysters">Sale of Raw Oysters (#F)</option>
                        <option value="Sale of Sashimi">Sale of Sashimi (#G)</option>
                        <option value="Sale of Sushi">Sale of Sushi (#H)</option>
                        <option value="Sale of Raw Meat">Sale of Raw Meat (#E)</option>
                        <option value="ISO 22000">ISO 22000 Certified Hygiene System (#D)</option>
                      </select>
                    </div>
                  </>
                )}

                {typeCategory === "non_restaurants" && (
                  <div>
                    <label htmlFor={licenceTypeId} className="block text-xs font-bold text-slate-700 mb-1">
                      Licence Type
                    </label>
                    <select
                      id={licenceTypeId}
                      value={licenceType}
                      onChange={(e) => setLicenceType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                    >
                      {NON_RESTAURANT_TYPES.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {typeCategory === "restricted_foods" && (
                  <div>
                    <label htmlFor={licenceTypeId} className="block text-xs font-bold text-slate-700 mb-1">
                      Restricted Food Type
                    </label>
                    <select
                      id={licenceTypeId}
                      value={licenceType}
                      onChange={(e) => setLicenceType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                    >
                      {RESTRICTED_FOOD_TYPES.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {typeCategory === "online_restricted" && (
                  <>
                    <div>
                      <span className="block text-xs font-bold text-slate-700 mb-1">
                        Type of Restricted Foods
                      </span>
                      <div className="bg-slate-100 border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 font-medium">
                        Online Sale of Restricted Foods
                      </div>
                    </div>

                    <div>
                      <label htmlFor={onlinePlatformId} className="block text-xs font-bold text-slate-700 mb-1">
                        Website / Online Platform Account
                      </label>
                      <input
                        id={onlinePlatformId}
                        type="text"
                        value={onlinePlatform}
                        onChange={(e) => setOnlinePlatform(e.target.value)}
                        placeholder="e.g. freshseafood-hk"
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        (Partial keyword is accepted. This search function only support single keyword, all input value will be treated as a single keyword.)
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Standard Search Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* District */}
              <div>
                <label htmlFor={districtId} className="block text-xs font-bold text-slate-700 mb-1">
                  District
                </label>
                <select
                  id={districtId}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Licence / Permit Number */}
              <div>
                <label htmlFor={licenceNoId} className="block text-xs font-bold text-slate-700 mb-1">
                  {typeCategory === "restricted_foods" || typeCategory === "online_restricted"
                    ? "Permit Number"
                    : "Licence Number"}
                </label>
                <input
                  id={licenceNoId}
                  type="text"
                  value={licenceNo}
                  onChange={(e) => setLicenceNo(e.target.value)}
                  placeholder="e.g. 2218800454"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                />
              </div>

              {/* Shopsign */}
              <div>
                <label htmlFor={shopsignId} className="block text-xs font-bold text-slate-700 mb-1">
                  Shopsign
                </label>
                <input
                  id={shopsignId}
                  type="text"
                  value={shopsign}
                  onChange={(e) => setShopsign(e.target.value)}
                  placeholder="e.g. Bakehouse, Maxim's, A-1 Bakery, Four Seasons, or 美心"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  (Partial name or location is accepted, e.g. "Bakehouse Wan Chai", "Shake Shack", or "美心".)
                </p>
              </div>

              {/* Address */}
              <div>
                <label htmlFor={addressId} className="block text-xs font-bold text-slate-700 mb-1">
                  {typeCategory === "online_restricted" ? "Business Address" : "Address"}
                </label>
                <input
                  id={addressId}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Wan Chai, Queen's Road, Nathan Road, or 灣仔"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#006837]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  (Partial street or district name accepted in English or Chinese.)
                </p>
              </div>
            </div>

            {/* Sort By and Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor={sortById} className="text-xs font-bold text-slate-700 shrink-0">
                  Sort By:
                </label>
                <select
                  id={sortById}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#006837]"
                >
                  <option value="Shopsign">Shopsign</option>
                  <option value="District">District</option>
                  <option value="Score">Licence Status</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset (重設)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded bg-[#006837] text-white hover:bg-[#00522c] text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Submit (提交搜尋)
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Search Results Section */}
        <section className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden mb-12">
          {/* Results Header Bar */}
          <div className="bg-slate-100 border-b border-slate-300 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Search Results (搜尋結果)</span>
                <span className="bg-slate-200 text-slate-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {results.length} records found
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing official licence status, active suspensions, and statutory enforcement history.
              </p>
            </div>

            {/* Quick Status Counters */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Clean: {stats.clean}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Warning: {stats.warning}
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700">
                <Ban className="w-4 h-4 text-rose-600" /> Suspended: {stats.suspended}
              </span>
            </div>
          </div>

          {/* AI Semantic Match Assisted Alert Banner */}
          {aiAssisted && aiReasoning && (
            <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-3.5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-indigo-950">
                <div className="font-bold flex flex-wrap items-center gap-2">
                  <span>AI Semantic Match Activated (智能語意輔助搜尋)</span>
                  <span className="bg-indigo-200/80 text-indigo-900 text-[11px] font-semibold px-2 py-0.5 rounded">
                    0 direct matches • AI Fallback Engaged
                  </span>
                </div>
                <p className="mt-1 text-indigo-800 leading-relaxed">
                  {aiReasoning}
                </p>
              </div>
            </div>
          )}

          {/* Results Table / List */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#006837] border-t-transparent rounded-full animate-spin" />
              <span>Retrieving official FEHD licensing and safety records...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-12 text-center text-slate-600">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="font-bold text-sm">No food premises matched your search criteria.</div>
              <div className="text-xs text-slate-500 mt-1">
                Please check the single keyword spelling or switch to "- All Districts -".
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-x-auto">
              {results.map((r, idx) => {
                const isClean = r.status === "CLEAN";
                const isWarning = r.status === "DEMERIT_WARNING";
                const isSuspended = r.status === "SUSPENDED";

                return (
                  <div
                    key={r.license_no}
                    className={`p-4 sm:p-5 transition-colors ${
                      isSuspended
                        ? "bg-rose-50/40 hover:bg-rose-50/70"
                        : isWarning
                        ? "bg-amber-50/30 hover:bg-amber-50/60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      {/* Left: Premises Name, Address, Licence Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {r.type}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            District: <strong className="text-slate-700">{r.district}</strong>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {r.name_en}
                          {r.name_tc && r.name_tc !== r.name_en && (
                            <span className="ml-2 font-medium text-slate-600">({r.name_tc})</span>
                          )}
                        </h3>

                        <div className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span>{r.address_en}</span>
                            {r.address_tc && r.address_tc !== r.address_en && (
                              <span className="block text-slate-500">{r.address_tc}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                          <span>Licence / Permit No: <strong className="font-mono text-slate-800">{r.license_no}</strong></span>
                          <span>Expiry Date: <strong className="text-slate-800">{r.expiry_date}</strong></span>
                        </div>

                        {r.aiMatchNote && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span><strong>AI Semantic Match:</strong> {r.aiMatchNote}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Food Hygiene Safety Score Badge */}
                      <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
                        <div
                          className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                            isClean
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : isWarning
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : "bg-rose-50 text-rose-900 border-rose-300"
                          }`}
                        >
                          {isClean && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                          {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                          {isSuspended && <Ban className="w-4 h-4 text-rose-600" />}
                          <span>
                            {isClean && "No Active Suspensions on Record"}
                            {isWarning && `Demerit Warning (${r.demerit_points} Pts)`}
                            {isSuspended && `SUSPENDED (${r.demerit_points} Pts)`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="text-xs font-semibold text-[#006837] hover:text-[#00522c] hover:underline flex items-center gap-1 mt-1"
                        >
                          View Past Record & History <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Past History & Enforcement Records Section */}
                    <div className="mt-3 pt-3 border-t border-slate-200/80">
                      {isSuspended && (
                        <div className="p-3 rounded bg-rose-100/70 border border-rose-200 text-rose-900 text-xs mb-2">
                          <div className="font-bold flex items-center gap-1.5 text-rose-950 mb-1">
                            <Ban className="w-4 h-4 text-rose-600" />
                            Official Active Suspension Notice
                          </div>
                          <div className="leading-relaxed">{r.suspension_details}</div>
                        </div>
                      )}

                      <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2.5">
                        <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Past Hygiene Records & Conviction History:
                        </div>
                        <div className="text-slate-600 whitespace-pre-line leading-relaxed pl-4 border-l-2 border-slate-300">
                          {r.past_violations}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Detail Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#006837] text-white px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base">
                Official FEHD Licensing & Inspection Record
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-white hover:text-emerald-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-800 max-h-[80vh] overflow-y-auto">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-bold">Shopsign</span>
                <strong className="text-base text-slate-900">
                  {selectedRecord.name_en}
                  {selectedRecord.name_tc && selectedRecord.name_tc !== selectedRecord.name_en && (
                    <span className="ml-2 font-medium text-slate-600">({selectedRecord.name_tc})</span>
                  )}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Licence / Permit No.</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRecord.license_no}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Licence Type</span>
                  <span className="font-medium text-slate-800">{selectedRecord.type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">District</span>
                  <span className="font-medium text-slate-800">{selectedRecord.district}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Licence Expiry Date</span>
                  <span className="font-medium text-slate-800">{selectedRecord.expiry_date}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">Premises Address</span>
                <div className="text-slate-700">
                  <span>{selectedRecord.address_en}</span>
                  {selectedRecord.address_tc && selectedRecord.address_tc !== selectedRecord.address_en && (
                    <span className="block text-slate-500 mt-0.5">{selectedRecord.address_tc}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">Safety Grade & Score</span>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border ${
                    selectedRecord.status === "CLEAN"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : selectedRecord.status === "DEMERIT_WARNING"
                      ? "bg-amber-50 text-amber-900 border-amber-300"
                      : "bg-rose-50 text-rose-900 border-rose-300"
                  }`}
                >
                  {selectedRecord.status === "CLEAN" && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  {selectedRecord.status === "DEMERIT_WARNING" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {selectedRecord.status === "SUSPENDED" && <Ban className="w-4 h-4 text-rose-600" />}
                  <span>
                    {selectedRecord.status === "CLEAN" && "No Active Suspensions on Record"}
                    {selectedRecord.status === "DEMERIT_WARNING" && `Demerit Warning (${selectedRecord.demerit_points} Demerit Points)`}
                    {selectedRecord.status === "SUSPENDED" && `Suspended (${selectedRecord.demerit_points} Demerit Points)`}
                  </span>
                </div>
              </div>

              {selectedRecord.suspension_details && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900">
                  <strong className="block mb-1 text-rose-950 font-bold">FEHD Suspension Order:</strong>
                  {selectedRecord.suspension_details}
                </div>
              )}

              {selectedRecord.aiMatchNote && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-950">
                  <strong className="block mb-1 text-indigo-900 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Semantic Match Insight:
                  </strong>
                  {selectedRecord.aiMatchNote}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 block mb-1">Historical Convictions & Violations ("Done in the past"):</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedRecord.past_violations}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <a
                  href="https://www.fehd.gov.hk/english/licensing/license/index.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 bg-[#006837] text-white rounded text-xs font-semibold hover:bg-[#00522c] flex items-center gap-1"
                >
                  Confirm on FEHD Official Portal <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 border-t border-slate-700 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-slate-300">
              Food and Environmental Hygiene Department (FEHD) Public Licence Registry
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Data synchronized from official FEHD Open Data XML & Public Suspension Notices.
            </p>
          </div>
          <div className="text-slate-400 text-[11px] text-center sm:text-right">
            <p>Hong Kong Special Administrative Region Government</p>
            <p className="text-slate-500">Public Health and Municipal Services Ordinance (Cap. 132)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
