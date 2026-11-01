"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { MapPin, AlertTriangle, ShieldCheck, Ban, Compass, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface Restaurant {
  license_no: string;
  type: string;
  district: string;
  name_en: string;
  address_en: string;
  expiry_date: string;
  status: "CLEAN" | "DEMERIT_WARNING" | "SUSPENDED";
  suspension_details: string | null;
  lat: number;
  lng: number;
  updated_at?: string;
}

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onSelectRestaurant: (restaurant: Restaurant | null) => void;
}

// Bounding box for Hong Kong geographic projection
const HK_BOUNDS = {
  minLat: 22.18,
  maxLat: 22.56,
  minLng: 113.84,
  maxLng: 114.42,
};

function latLngToXY(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - HK_BOUNDS.minLng) / (HK_BOUNDS.maxLng - HK_BOUNDS.minLng)) * width;
  const y = height - ((lat - HK_BOUNDS.minLat) / (HK_BOUNDS.maxLat - HK_BOUNDS.minLat)) * height;
  return { x, y };
}

export default function RestaurantMap({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
}: RestaurantMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [hoveredRestaurant, setHoveredRestaurant] = useState<Restaurant | null>(null);

  // Canvas / SVG fallback state for zoom and pan
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(3, z + 0.3));
  const zoomOut = () => setZoomLevel((z) => Math.max(0.8, z - 0.3));

  // If selected restaurant changes, center on fallback map
  useEffect(() => {
    if (selectedRestaurant && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pos = latLngToXY(selectedRestaurant.lat, selectedRestaurant.lng, rect.width || 800, rect.height || 600);
      setPanOffset({
        x: (rect.width / 2 - pos.x) * (zoomLevel - 1),
        y: (rect.height / 2 - pos.y) * (zoomLevel - 1),
      });
    }
  }, [selectedRestaurant, zoomLevel]);

  // If live Google Maps API key is configured, use @vis.gl/react-google-maps
  if (apiKey) {
    return (
      <div className="relative w-full h-full min-h-[400px] bg-slate-900 overflow-hidden">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: 22.3193, lng: 114.1694 }}
            defaultZoom={12}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: "100%", height: "100%" }}
            internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
          >
            {restaurants.map((r) => {
              const isClean = r.status === "CLEAN";
              const isWarning = r.status === "DEMERIT_WARNING";
              const pinBg = isClean ? "#10b981" : isWarning ? "#f59e0b" : "#ef4444";
              const glyphBg = isClean ? "#064e3b" : isWarning ? "#78350f" : "#7f1d1d";

              return (
                <AdvancedMarker
                  key={r.license_no}
                  position={{ lat: r.lat, lng: r.lng }}
                  onClick={() => onSelectRestaurant(r)}
                  title={r.name_en}
                >
                  <Pin
                    background={pinBg}
                    borderColor="#ffffff"
                    glyphColor={glyphBg}
                    scale={selectedRestaurant?.license_no === r.license_no ? 1.3 : 1.0}
                  />
                </AdvancedMarker>
              );
            })}

            {selectedRestaurant && (
              <InfoWindow
                position={{ lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }}
                onCloseClick={() => onSelectRestaurant(null)}
              >
                <div className="p-2 max-w-xs text-slate-900">
                  <div className="font-bold text-sm mb-1">{selectedRestaurant.name_en}</div>
                  <div className="text-xs text-slate-600 mb-1">{selectedRestaurant.address_en}</div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-white mb-1"
                    style={{
                      backgroundColor:
                        selectedRestaurant.status === "CLEAN"
                          ? "#10b981"
                          : selectedRestaurant.status === "DEMERIT_WARNING"
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {selectedRestaurant.status}
                  </div>
                  <div className="text-[11px] text-slate-500">Licence: {selectedRestaurant.license_no}</div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    );
  }

  // High-fidelity fallback Hong Kong interactive SVG tactical map
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-xl"
      onMouseDown={(e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }}
      onMouseMove={(e) => {
        if (!isDragging) return;
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Informational Banner */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-medium text-emerald-400">Tactical FEHD Map Engine</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">Hong Kong Grid (22.3193° N, 114.1694° E)</span>
      </div>

      {/* Map Control Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg p-1.5 shadow-lg">
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="Reset View"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-2 text-xs shadow-lg flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span className="text-slate-300 font-medium">Clean</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-300 font-medium">Demerit Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse" />
          <span className="text-slate-300 font-medium">Suspended</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 1000 700"
        className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-75"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          <radialGradient id="oceanGrad" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>
          <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ocean Background */}
        <rect width="1000" height="700" fill="url(#oceanGrad)" />

        {/* Grid lines */}
        <g stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => (
            <line key={`gx-${x}`} x1={x} y1="0" x2={x} y2="700" />
          ))}
          {[100, 200, 300, 400, 500, 600].map((y) => (
            <line key={`gy-${y}`} x1="0" y1={y} x2="1000" y2={y} />
          ))}
        </g>

        {/* Hong Kong Geographic Landmass Silhouettes */}
        <g fill="#1e293b" stroke="#334155" strokeWidth="1.2">
          {/* New Territories & Mainland Boundary */}
          <path
            d="M 120 50 L 320 40 L 520 60 L 750 70 L 920 120 L 950 250 L 850 350 L 720 320 L 650 380 L 520 360 L 420 390 L 320 350 L 220 300 L 150 200 Z"
            fill="#131d2e"
          />
          {/* Kowloon Peninsula */}
          <path
            d="M 450 340 L 560 340 L 580 430 L 520 460 L 460 440 Z"
            fill="#162235"
          />
          {/* Hong Kong Island */}
          <path
            d="M 430 480 L 580 470 L 690 490 L 730 560 L 650 610 L 510 590 L 440 550 Z"
            fill="#162235"
          />
          {/* Lantau Island */}
          <path
            d="M 180 440 L 320 420 L 360 480 L 320 560 L 220 580 L 140 520 Z"
            fill="#131d2e"
          />
          {/* Lamma Island */}
          <ellipse cx="460" cy="640" rx="35" ry="25" fill="#131d2e" />
          {/* Cheung Chau */}
          <circle cx="360" cy="610" r="14" fill="#131d2e" />
        </g>

        {/* Territory & District Labels */}
        <g fill="#475569" fontSize="11" fontWeight="600" letterSpacing="1">
          <text x="500" y="200" textAnchor="middle">NEW TERRITORIES (新界)</text>
          <text x="510" y="410" textAnchor="middle">KOWLOON (九龍)</text>
          <text x="560" y="540" textAnchor="middle">HONG KONG ISLAND (香港島)</text>
          <text x="250" y="500" textAnchor="middle">LANTAU (大嶼山)</text>
          <text x="510" y="468" textAnchor="middle" fill="#0284c7" fontSize="9">Victoria Harbour (維多利亞港)</text>
        </g>

        {/* Plotted Restaurant Markers */}
        {restaurants.map((r, idx) => {
          const { x, y } = latLngToXY(r.lat, r.lng, 1000, 700);
          const isSelected = selectedRestaurant?.license_no === r.license_no;
          const isHovered = hoveredRestaurant?.license_no === r.license_no;

          let color = "#10b981";
          let strokeColor = "#34d399";
          let filter = "url(#glow-green)";
          let radius = isSelected ? 9 : 6;

          if (r.status === "DEMERIT_WARNING") {
            color = "#f59e0b";
            strokeColor = "#fbbf24";
            filter = "";
          } else if (r.status === "SUSPENDED") {
            color = "#ef4444";
            strokeColor = "#fca5a5";
            filter = "url(#glow-red)";
            radius = isSelected ? 11 : 7;
          }

          return (
            <g
              key={r.license_no}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer transition-all duration-150"
              onClick={(e) => {
                e.stopPropagation();
                onSelectRestaurant(r);
              }}
              onMouseEnter={() => setHoveredRestaurant(r)}
              onMouseLeave={() => setHoveredRestaurant(null)}
            >
              {/* Pulsing ring for Suspended or Selected */}
              {(r.status === "SUSPENDED" || isSelected) && (
                <circle
                  r={radius * 1.8}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  opacity="0.6"
                  className="animate-ping"
                />
              )}

              {/* Marker pin shadow */}
              <ellipse cx="0" cy="8" rx="5" ry="2" fill="#000000" opacity="0.4" />

              {/* Marker pin circle */}
              <circle
                r={radius}
                fill={color}
                stroke={isSelected ? "#ffffff" : strokeColor}
                strokeWidth={isSelected ? 3 : 1.5}
                filter={filter}
              />

              {/* Status indicator icon inside marker */}
              {r.status === "SUSPENDED" && (
                <line x1="-3" y1="-3" x2="3" y2="3" stroke="#ffffff" strokeWidth="1.8" />
              )}
              {r.status === "DEMERIT_WARNING" && (
                <circle r="2" fill="#ffffff" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Interactive Marker Tooltip */}
      {hoveredRestaurant && (
        <div
          className="absolute pointer-events-none z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-2xl text-slate-100 max-w-xs transition-opacity"
          style={{
            left: Math.min(
              window?.innerWidth ? window.innerWidth - 220 : 600,
              Math.max(16, (latLngToXY(hoveredRestaurant.lat, hoveredRestaurant.lng, 1000, 700).x * zoomLevel + panOffset.x))
            ),
            top: Math.max(16, (latLngToXY(hoveredRestaurant.lat, hoveredRestaurant.lng, 1000, 700).y * zoomLevel + panOffset.y) - 55),
          }}
        >
          <div className="font-semibold text-slate-100 truncate">{hoveredRestaurant.name_en}</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                hoveredRestaurant.status === "CLEAN"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : hoveredRestaurant.status === "DEMERIT_WARNING"
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-rose-950 text-rose-300 border border-rose-800"
              }`}
            >
              {hoveredRestaurant.status}
            </span>
            <span className="text-slate-400 text-[11px]">{hoveredRestaurant.district}</span>
          </div>
        </div>
      )}
    </div>
  );
}
