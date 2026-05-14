"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: (number | null)[];
  lon: (number | null)[];
}

const startIcon = L.divIcon({
  className: "betri-marker betri-marker-start",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const endIcon = L.divIcon({
  className: "betri-marker betri-marker-end",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function RouteMap({ lat, lon }: Props) {
  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < lat.length; i++) {
      const la = lat[i];
      const lo = lon[i];
      if (la != null && lo != null && Number.isFinite(la) && Number.isFinite(lo)) {
        out.push([la, lo]);
      }
    }
    return out;
  }, [lat, lon]);

  if (points.length === 0) return null;

  const bounds = L.latLngBounds(points.map(([la, lo]) => L.latLng(la, lo)));

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        style={{ height: 400, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={points} color="#ea580c" weight={3} opacity={0.85} />
        <Marker position={points[0]!} icon={startIcon} />
        <Marker position={points[points.length - 1]!} icon={endIcon} />
      </MapContainer>
    </div>
  );
}
