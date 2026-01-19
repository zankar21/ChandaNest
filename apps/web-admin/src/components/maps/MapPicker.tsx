import { useEffect, useRef, useState } from "react";

type MapValue = { lat?: number; lng?: number };

type Props = {
  value?: MapValue;
  onChange: (next: MapValue) => void;
  center?: { lat: number; lng: number };
  height?: number;
  disabled?: boolean;
};

declare global {
  interface Window {
    google?: any;
  }
}

let mapsLoader: Promise<void> | null = null;

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1c1f24" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c1f24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8f96a3" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3b414a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#7a828f" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2420" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2f36" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3b414a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a2b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#11161c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#7a828f" }] }
];

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

export default function MapPicker({ value, onChange, center, height = 320, disabled = false }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
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
    const initialCenter = center || { lat: 20.5937, lng: 78.9629 };
    const map = new window.google.maps.Map(mapRef.current, {
      center: initialCenter,
      zoom: value?.lat != null && value?.lng != null ? 14 : 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: DARK_MAP_STYLE
    });
    map.addListener("click", (event: any) => {
      if (disabled) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      onChange({ lat, lng });
    });
    mapInstanceRef.current = map;
  }, [ready, center, value?.lat, value?.lng, disabled, onChange]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    mapInstanceRef.current.setOptions({
      draggable: !disabled,
      scrollwheel: !disabled,
      disableDoubleClickZoom: disabled
    });
    if (markerRef.current) {
      markerRef.current.setDraggable(!disabled);
    }
  }, [disabled]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || !center) return;
    mapInstanceRef.current.setCenter(center);
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    const map = mapInstanceRef.current;
    if (value?.lat != null && value?.lng != null) {
      const position = { lat: value.lat, lng: value.lng };
      if (!markerRef.current) {
        const marker = new window.google.maps.Marker({
          position,
          map,
          draggable: !disabled
        });
        marker.addListener("dragend", () => {
          if (disabled) return;
          const pos = marker.getPosition();
          if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setPosition(position);
      }
      map.panTo(position);
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [value?.lat, value?.lng, disabled, onChange]);

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error} Enter lat/lng manually.
        </div>
      )}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full rounded-xl border border-theme"
          style={{ height }}
        />
        {disabled && <div className="absolute inset-0 rounded-xl bg-black/20" />}
      </div>
    </div>
  );
}
