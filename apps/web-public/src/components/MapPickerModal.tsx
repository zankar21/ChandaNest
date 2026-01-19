import { useEffect, useRef, useState } from "react";

type GeoResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  locality?: string;
  postalCode?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: GeoResult) => void;
  initialLat?: number | null;
  initialLng?: number | null;
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

export default function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Missing Google Maps API key.");
      return;
    }
    loadGoogleMaps(apiKey)
      .then(() => {
        setReady(true);
      })
      .catch((err) => {
        setError(err.message || "Failed to load Google Maps");
      });
  }, [isOpen]);

  useEffect(() => {
    if (!ready || !isOpen || !mapRef.current || !window.google?.maps) return;
    const initial = {
      lat: initialLat ?? 19.9508,
      lng: initialLng ?? 79.2961
    };
    setPosition(initial);
    const map = new window.google.maps.Map(mapRef.current, {
      center: initial,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false
    });
    const marker = new window.google.maps.Marker({
      position: initial,
      map,
      draggable: true
    });
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) {
        setPosition({ lat: pos.lat(), lng: pos.lng() });
      }
    });
    map.addListener("click", (event: any) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      marker.setPosition({ lat, lng });
      setPosition({ lat, lng });
    });
    if (inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["geometry", "formatted_address", "address_components"]
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        map.setCenter({ lat, lng });
        marker.setPosition({ lat, lng });
        setPosition({ lat, lng });
      });
    }
    mapInstanceRef.current = map;
    markerRef.current = marker;
  }, [ready, isOpen, initialLat, initialLng]);

  const handleConfirm = () => {
    if (!position || !window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: position }, (results: any) => {
      const first = Array.isArray(results) ? results[0] : null;
      const components = first?.address_components || [];
      const localityComp = components.find((c: any) => c.types?.includes("locality"));
      const sublocalityComp = components.find((c: any) => c.types?.includes("sublocality"));
      const postalComp = components.find((c: any) => c.types?.includes("postal_code"));
      onConfirm({
        lat: position.lat,
        lng: position.lng,
        formattedAddress: first?.formatted_address,
        locality: localityComp?.long_name || sublocalityComp?.long_name,
        postalCode: postalComp?.long_name
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-primary">Pick location</div>
          <button onClick={onClose} className="text-sm text-secondary">
            Close
          </button>
        </div>
        <div className="p-4 space-y-3">
          {error && <div className="text-sm text-rose-200">{error}</div>}
          <input
            ref={inputRef}
            placeholder="Search place"
            className="w-full rounded-md input-glass px-3 py-2 text-sm"
          />
          <div ref={mapRef} className="h-[420px] w-full rounded-xl card-glass border border-theme" />
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button onClick={onClose} className="rounded-md input-glass px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!position}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>
  );
}





