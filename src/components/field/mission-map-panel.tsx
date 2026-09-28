"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Clock3, MapPin, Radio, Route } from "lucide-react";
import type { FieldDashboard } from "@/lib/field/dashboard";

type MissionMapPanelProps = {
  mission: FieldDashboard["activeMission"];
  station: FieldDashboard["station"];
  teamName: string | null;
  checkIns: FieldDashboard["recentCheckIns"];
};

type MissionPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  checkedInAt: string;
  message: string | null;
};

type MissionView = "map" | "details" | "stats";

function distanceKm(start: [number, number], end: [number, number]) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const latitudeDelta = radians(endLat - startLat);
  const longitudeDelta = radians(endLng - startLng);
  const arc =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(startLat)) *
      Math.cos(radians(endLat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function formatTime(value: string | null | undefined) {
  if (!value) return "No check-in recorded";
  return `${value.slice(0, 16).replace("T", " ")} UTC`;
}

export function MissionMapPanel({ mission, station, teamName, checkIns }: MissionMapPanelProps) {
  const [view, setView] = useState<MissionView>("map");
  const [mapError, setMapError] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapPoints = useMemo<MissionPoint[]>(
    () => checkIns
      .filter(
        (checkIn): checkIn is typeof checkIn & { simulatedLatitude: number; simulatedLongitude: number } =>
          checkIn.simulatedLatitude != null && checkIn.simulatedLongitude != null
      )
      .map((checkIn) => ({
        id: checkIn.id,
        name: checkIn.personnelName,
        latitude: checkIn.simulatedLatitude,
        longitude: checkIn.simulatedLongitude,
        checkedInAt: checkIn.checkedInAt,
        message: checkIn.message,
      }))
      .sort((first, second) => first.checkedInAt.localeCompare(second.checkedInAt)),
    [checkIns]
  );

  const stationCoordinates = useMemo<[number, number] | null>(
    () => station?.latitude != null && station.longitude != null
      ? [station.longitude, station.latitude]
      : null,
    [station]
  );
  const newestPoint = mapPoints.at(-1) ?? null;
  const newestCoordinates: [number, number] | null = newestPoint
    ? [newestPoint.longitude, newestPoint.latitude]
    : null;
  const routeDistance = stationCoordinates && newestCoordinates
    ? distanceKm(stationCoordinates, newestCoordinates)
    : null;

  useEffect(() => {
    if (view !== "map" || !mapElement.current) return;

    const coordinates = [
      ...(stationCoordinates ? [stationCoordinates] : []),
      ...mapPoints.map((point) => [point.longitude, point.latitude] as [number, number]),
    ];
    const center: [number, number] = coordinates[0] ?? [12.14, -71.02];
    const map = new maplibregl.Map({
      container: mapElement.current,
      style: "https://demotiles.maplibre.org/style.json",
      center,
      zoom: 7,
      attributionControl: {},
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => setMapError(true));
    map.on("load", () => {
      setMapError(false);
      if (coordinates.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        coordinates.forEach((coordinate) => bounds.extend(coordinate));
        map.fitBounds(bounds, { padding: 48, maxZoom: 10 });
      }

      if (stationCoordinates && mapPoints.length > 0) {
        map.addSource("mission-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [stationCoordinates, ...mapPoints.map((point) => [point.longitude, point.latitude])],
            },
          },
        });
        map.addLayer({
          id: "mission-route-line",
          type: "line",
          source: "mission-route",
          paint: {
            "line-color": "#1ca7c4",
            "line-width": 2.5,
            "line-dasharray": [2, 1.5],
          },
        });
      }

      if (stationCoordinates && station) {
        const stationElement = document.createElement("div");
        stationElement.setAttribute("aria-label", `${station.name} station`);
        stationElement.style.cssText =
          "width:14px;height:14px;background:#127475;border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #102b4380";
        new maplibregl.Marker({ element: stationElement })
          .setLngLat(stationCoordinates)
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`${station.name} · station`))
          .addTo(map);
      }

      mapPoints.forEach((point, index) => {
        const isNewest = point.id === newestPoint?.id;
        const pointElement = document.createElement("div");
        pointElement.setAttribute("aria-label", `Simulated check-in: ${point.name}`);
        pointElement.style.cssText = `width:${isNewest ? 16 : 12}px;height:${isNewest ? 16 : 12}px;background:${isNewest ? "#c1272d" : "#1ca7c4"};border:3px solid white;border-radius:50%;box-shadow:0 1px 6px #102b4380`;
        const popupText = [
          `${index + 1}. ${point.name}`,
          formatTime(point.checkedInAt),
          point.message ?? "No status note",
          "Simulated position",
        ].join("\n");
        new maplibregl.Marker({ element: pointElement })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(popupText))
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [mapPoints, newestPoint, station, stationCoordinates, view]);

  const views: { id: MissionView; label: string }[] = [
    { id: "map", label: "Map" },
    { id: "details", label: "Details" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <section className="overflow-hidden border border-border bg-surface" aria-label="Mission route and location">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-teal" aria-hidden />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {mission?.title ?? "Mission map"}
            </h2>
            <p className="font-mono text-[10px] text-text-secondary">
              {mission?.code ?? "No active mission"} · {station?.name ?? "Station unavailable"}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-amber">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />
          Simulated locations
        </p>
      </header>

      <div className="grid grid-cols-3 border-b border-border bg-bg/60 p-1" role="tablist" aria-label="Mission map views">
        {views.map(({ id, label }) => (
          <button
            key={id}
            id={`mission-${id}-tab`}
            type="button"
            role="tab"
            aria-selected={view === id}
            aria-controls={`mission-${id}-panel`}
            onClick={() => setView(id)}
            className={`min-h-10 border-b-2 px-3 text-sm font-medium ${
              view === id
                ? "border-teal bg-surface text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <div id="mission-map-panel" role="tabpanel" aria-labelledby="mission-map-tab">
          <div className="relative h-[min(52vh,390px)] min-h-64 bg-[#e4f0f2]">
            <div ref={mapElement} className="h-full w-full" aria-label="Map of the assigned station and simulated mission check-ins" />
            {mapError ? (
              <p className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] border border-border bg-surface/95 px-3 py-2 text-xs text-text-secondary">
                Map tiles are unavailable. Check-in coordinates are still listed below.
              </p>
            ) : null}
            {!stationCoordinates && mapPoints.length === 0 ? (
              <p className="absolute left-3 top-3 border border-border bg-surface/95 px-3 py-2 text-xs text-text-secondary">
                No station coordinates or simulated check-ins are available.
              </p>
            ) : null}
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2 text-[10px] text-text-secondary sm:px-4">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" aria-hidden />Station</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan" aria-hidden />Prior check-in</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red" aria-hidden />Latest check-in</li>
            <li className="ml-auto">Dashed line: simulated route preview, not navigation guidance</li>
          </ul>
        </div>
      ) : null}

      {view === "details" ? (
        <div id="mission-details-panel" role="tabpanel" aria-labelledby="mission-details-tab" className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-3">
            <MissionDetail label="Mission" value={mission?.title ?? "No mission assigned"} />
            <MissionDetail label="Team" value={teamName ?? "Not assigned"} />
            <MissionDetail label="Station" value={station ? `${station.name} (${station.code})` : "Not assigned"} />
          </div>
          <div className="space-y-3">
            <MissionDetail label="Check-in cadence" value={mission ? `Every ${mission.checkInIntervalMinutes} minutes` : "Not available"} />
            <MissionDetail label="Expected return" value={mission ? formatTime(mission.expectedReturnAt) : "Not available"} />
            <MissionDetail label="Briefing" value={mission?.briefingNotes ?? "No briefing notes"} />
          </div>
        </div>
      ) : null}

      {view === "stats" ? (
        <div id="mission-stats-panel" role="tabpanel" aria-labelledby="mission-stats-tab" className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <MissionStat icon={Route} label="Station to latest check-in" value={routeDistance == null ? "Not available" : `${routeDistance.toFixed(1)} km`} />
          <MissionStat icon={Radio} label="Recorded check-ins" value={String(mapPoints.length)} />
          <MissionStat icon={Clock3} label="Latest position update" value={newestPoint ? formatTime(newestPoint.checkedInAt) : "No GPS check-in"} />
        </div>
      ) : null}
    </section>
  );
}

function MissionDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border pb-2 last:border-0">
      <p className="font-mono text-[9px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 break-words text-sm text-text-primary">{value}</p>
    </div>
  );
}

function MissionStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-3">
      <div className="flex items-center gap-2 text-text-secondary">
        <Icon className="h-4 w-4 shrink-0 text-teal" aria-hidden />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 break-words font-mono text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}