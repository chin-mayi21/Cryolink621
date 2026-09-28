"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMarker } from "@/lib/maps/expedition-map-data";

const kindColor: Record<MapMarker["kind"], string> = {
  station: "#127475",
  checkin: "#1CA7C4",
  incident: "#C1272D",
};

export function SimulatedGpsMap({
  markers,
  center,
}: {
  markers: MapMarker[];
  center: [number, number];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  const fallbackPositions = useMemo(() => {
    if (markers.length === 0) return [];

    const west = Math.min(...markers.map((marker) => marker.lng));
    const east = Math.max(...markers.map((marker) => marker.lng));
    const south = Math.min(...markers.map((marker) => marker.lat));
    const north = Math.max(...markers.map((marker) => marker.lat));

    return markers.map((marker) => {
      const x = ((marker.lng - west) / Math.max(east - west, 0.0001)) * 100;
      const y = ((north - marker.lat) / Math.max(north - south, 0.0001)) * 100;
      return { ...marker, x, y };
    });
  }, [markers]);

  useEffect(() => {
    if (!containerRef.current) return;

    setMapFailed(false);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: 4,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    mapRef.current = map;

    const popup = new maplibregl.Popup({ closeButton: false, offset: 12 });

    map.on("error", () => {
      setMapFailed(true);
      map.remove();
      mapRef.current = null;
    });

    map.on("load", () => {
      for (const m of markers) {
        const el = document.createElement("div");
        el.className = "h-3 w-3 rounded-full border-2 border-white shadow-md";
        el.style.backgroundColor = kindColor[m.kind];

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .addTo(map);

        el.addEventListener("mouseenter", () => {
          popup
            .setLngLat([m.lng, m.lat])
            .setHTML(
              `<strong>${m.title}</strong><br/><span style="font-size:11px">${m.subtitle}</span>${
                m.at ? `<br/><span style="font-size:10px;font-family:monospace">${m.at.slice(0, 19)}Z</span>` : ""
              }`
            )
            .addTo(map);
        });
        el.addEventListener("mouseleave", () => popup.remove());
        marker.getElement().setAttribute("aria-label", `${m.kind}: ${m.title}`);
      }

      if (markers.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        markers.forEach((m) => bounds.extend([m.lng, m.lat]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 6 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [markers, center]);

  if (mapFailed || markers.length === 0) {
    const roughMapPaths = [
      "M9 18 C16 14, 22 14, 29 18 L35 23 L40 31 L46 36 L51 44 L54 58 L50 68 L46 76 L34 82 L24 76 L18 66 L12 61 L7 51 L5 38 Z",
      "M39 20 L44 17 L49 19 L52 24 L48 28 L41 27 Z",
      "M52 28 L58 25 L61 30 L57 36 L52 34 Z",
      "M56 48 L60 43 L64 45 L66 52 L63 58 L57 57 Z",
    ];

    return (
      <div className="overflow-hidden border border-border bg-surface rounded-[2px]">
        <div className="border-b border-border px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber">Simulated GPS — offline fallback</p>
          <p className="text-xs text-text-secondary">
            A saved local rough map is available while remote tiles are unavailable.
          </p>
        </div>
        <div className="relative h-[min(420px,55vh)] w-full overflow-hidden bg-[radial-gradient(circle_at_top,#1d3f52_0%,#0b1a27_42%,#08141d_100%)]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
            <rect x="0" y="0" width="100" height="100" fill="rgba(12,32,44,0.55)" />
            <g opacity="0.78">
              {roughMapPaths.map((path, index) => (
                <path
                  key={path}
                  d={path}
                  fill={index === 0 ? "rgba(15,92,101,0.82)" : "rgba(22,126,145,0.7)"}
                  stroke="rgba(148, 214, 223, 0.65)"
                  strokeWidth="0.6"
                />
              ))}
            </g>
            <g opacity="0.35">
              <path d="M16 30 L32 22 L50 25 L63 17 L78 29 L70 42 L54 49 L38 46 L26 36 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
              <path d="M25 52 L42 58 L54 68 L69 64 L78 74 L60 83 L38 80 L25 68 Z" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.35" />
            </g>
          </svg>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          {fallbackPositions.map((marker) => (
            <button
              key={marker.id}
              type="button"
              aria-label={`${marker.kind}: ${marker.title}`}
              title={`${marker.title} · ${marker.subtitle}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
                width: marker.kind === "incident" ? "14px" : "10px",
                height: marker.kind === "incident" ? "14px" : "10px",
                backgroundColor: kindColor[marker.kind],
              }}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-3 border-t border-border px-4 py-2 text-[10px] text-text-secondary">
          <li><span className="inline-block h-2 w-2 rounded-full bg-teal" /> Station</li>
          <li><span className="inline-block h-2 w-2 rounded-full bg-cyan" /> Check-in</li>
          <li><span className="inline-block h-2 w-2 rounded-full bg-red" /> Incident</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border bg-surface rounded-[2px]">
      <div className="border-b border-border px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber">Simulated GPS — MapLibre</p>
        <p className="text-xs text-text-secondary">
          Stations, last check-in per mission, and open incident positions. Not live tracking.
        </p>
      </div>
      <div ref={containerRef} className="h-[min(420px,55vh)] w-full" role="img" aria-label="Antarctic expedition map with simulated positions" />
      <ul className="flex flex-wrap gap-3 border-t border-border px-4 py-2 text-[10px] text-text-secondary">
        <li><span className="inline-block h-2 w-2 rounded-full bg-teal" /> Station</li>
        <li><span className="inline-block h-2 w-2 rounded-full bg-cyan" /> Check-in</li>
        <li><span className="inline-block h-2 w-2 rounded-full bg-red" /> Incident</li>
      </ul>
    </div>
  );
}
