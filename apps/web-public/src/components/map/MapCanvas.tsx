import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export type MapBounds = { north: number; south: number; east: number; west: number };

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "property" | "project";
  popup?: React.ReactNode;
};

type Props = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MapMarker[];
  selectedId?: string | null;
  height?: number;
  onBoundsChange?: (bounds: MapBounds) => void;
  onMarkerSelect?: (id: string) => void;
};

declare global {
  interface Window {
    google?: any;
  }
}

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (!mapsLoader) {
    mapsLoader = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#11161d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#11161d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8f96a3" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3b414a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#7a828f" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2420" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#20242c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3b414a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a2b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1117" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7a828f" }] }
];

function markerIcon(kind: MapMarker["kind"]) {
  const fillColor = kind === "property" ? "#6366f1" : "#22c55e";
  return {
    path: window.google?.maps?.SymbolPath?.CIRCLE,
    fillColor,
    fillOpacity: 1,
    strokeColor: "#0f172a",
    strokeWeight: 2,
    scale: 6
  };
}

export default function MapCanvas({
  center,
  zoom = 12,
  markers,
  selectedId,
  height = 520,
  onBoundsChange,
  onMarkerSelect
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Missing Google Maps API key.");
      return;
    }
    loadGoogleMaps(apiKey)
      .then(() => {
        setReady(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load Google Maps");
      });
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: DARK_MAP_STYLE
    });
    map.addListener("idle", () => {
      const bounds = map.getBounds();
      if (!bounds || !onBoundsChange) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      onBoundsChange({
        north: ne.lat(),
        east: ne.lng(),
        south: sw.lat(),
        west: sw.lng()
      });
    });
    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow({ maxWidth: 320 });
  }, [center, ready, onBoundsChange, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setCenter(center);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setZoom(zoom);
  }, [zoom]);

  const markerIds = useMemo(() => new Set(markers.map((m) => m.id)), [markers]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach((marker, id) => {
      if (!markerIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
    markers.forEach((marker) => {
      const existing = markersRef.current.get(marker.id);
      if (existing) {
        existing.setPosition({ lat: marker.lat, lng: marker.lng });
        existing.setIcon(markerIcon(marker.kind));
        return;
      }
      const next = new window.google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        icon: markerIcon(marker.kind),
        label: {
          text: marker.kind === "property" ? "P" : "J",
          color: "white",
          fontSize: "10px",
          fontWeight: "700"
        }
      });
      next.addListener("click", () => {
        onMarkerSelect?.(marker.id);
        if (marker.popup && infoWindowRef.current) {
          infoWindowRef.current.setContent(renderToStaticMarkup(marker.popup));
          infoWindowRef.current.open({ map, anchor: next });
        }
      });
      markersRef.current.set(marker.id, next);
    });
  }, [markers, markerIds, onMarkerSelect]);

  useEffect(() => {
    if (!selectedId || !infoWindowRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (!marker) return;
    const selected = markers.find((m) => m.id === selectedId);
    if (selected?.popup) {
      infoWindowRef.current.setContent(renderToStaticMarkup(selected.popup));
      infoWindowRef.current.open({ map: mapInstanceRef.current, anchor: marker });
    }
  }, [markers, selectedId]);

  return (
    <div className="relative w-full">
      {error && (
        <div className="absolute left-4 top-4 z-10 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full rounded-2xl border border-theme"
        style={{ height }}
      />
    </div>
  );
}
