import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MediaManager from "../../components/MediaManager";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";
import MapPicker from "../../components/maps/MapPicker";
import {
  createAdminProject,
  getAdminProject,
  signPutMedia,
  updateAdminProject,
  publishAdminProject,
  unpublishAdminProject
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import { isPlatformAdminRole, isTenantAdminRole } from "../../utils/roles";

type MediaItem = { objectPath: string; contentType?: string; fileName?: string; kind?: "image" | "video" };

const STEPS = ["Basics", "Location", "Pricing", "Amenities", "Media", "Review"];
const CHANDRAPUR_CENTER = { lat: 19.9615, lng: 79.2961 };
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

function parseCoordinate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180;
}

function getDefaultCenter(city: string, lat?: number, lng?: number) {
  if (lat != null && lng != null) return { lat, lng };
  if (city.trim().toLowerCase() === "chandrapur") return CHANDRAPUR_CENTER;
  return INDIA_CENTER;
}

export default function ProjectUpsertPage() {
  const { tenantId, role } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<"draft" | "published">("draft");
  const [counts, setCounts] = useState<{ totalUnits: number; availableUnits: number } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const creatingRef = useRef<Promise<string | null> | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "apartment",
    status: "planning",
    possessionDate: "",
    location: {
      city: "",
      area: "",
      addressLine: "",
      lat: "",
      lng: ""
    },
    priceRange: { min: "", max: "" },
    amenities: [] as string[],
    highlights: [] as string[],
    media: {
      cover: null as MediaItem | null,
      gallery: [] as MediaItem[],
      brochure: null as MediaItem | null
    }
  });
  const [amenityInput, setAmenityInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");

  const canAdmin = role === "client_admin" || isTenantAdminRole(role) || isPlatformAdminRole(role);
  const isNew = !projectId && !createdId;
  const effectiveProjectId = projectId || createdId || undefined;
  const isReadOnly = projectStatus === "published" && !canAdmin;
  const latValue = form.location.lat.trim();
  const lngValue = form.location.lng.trim();
  const latNumber = parseCoordinate(form.location.lat);
  const lngNumber = parseCoordinate(form.location.lng);
  const latValid = !latValue || (latNumber != null && isValidLatitude(latNumber));
  const lngValid = !lngValue || (lngNumber != null && isValidLongitude(lngNumber));
  const latError = latValid ? null : "Latitude must be between -90 and 90.";
  const lngError = lngValid ? null : "Longitude must be between -180 and 180.";
  const hasLatLngError = Boolean(latError || lngError);
  const mapValue =
    latNumber != null && lngNumber != null && latValid && lngValid ? { lat: latNumber, lng: lngNumber } : undefined;
  const [mapCenter, setMapCenter] = useState(() => getDefaultCenter(form.location.city, latNumber, lngNumber));

  useEffect(() => {
    setMapCenter((prev) => {
      const next = getDefaultCenter(form.location.city, mapValue?.lat, mapValue?.lng);
      if (prev.lat === next.lat && prev.lng === next.lng) return prev;
      return next;
    });
  }, [form.location.city, mapValue?.lat, mapValue?.lng]);

  useEffect(() => {
    if (!tenantId || !projectId) return;
    let active = true;
    setLoading(true);
    getAdminProject(tenantId, projectId)
      .then((res) => {
        const data = res.data;
        if (!active || !data) return;
        setProjectStatus(data.visibility?.state || "draft");
        setCounts(
          data.counts
            ? {
                totalUnits: data.counts.totalUnits ?? 0,
                availableUnits: data.counts.availableUnits ?? 0
              }
            : null
        );
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          type: data.type || "apartment",
          status: data.status || "planning",
          possessionDate: data.possessionDate || "",
          location: {
            city: data.location?.city || "",
            area: data.location?.area || "",
            addressLine: data.location?.addressLine || "",
            lat: data.location?.lat != null ? String(data.location.lat) : "",
            lng: data.location?.lng != null ? String(data.location.lng) : ""
          },
          priceRange: {
            min: data.priceRange?.min != null ? String(data.priceRange.min) : "",
            max: data.priceRange?.max != null ? String(data.priceRange.max) : ""
          },
          amenities: data.amenities || [],
          highlights: data.highlights || [],
          media: {
            cover: (data.media?.cover as MediaItem) || null,
            gallery: (data.media?.gallery as MediaItem[]) || [],
            brochure: (data.media?.brochure as MediaItem) || null
          }
        });
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load project");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, projectId]);

  const buildPayload = () => {
    const min = form.priceRange.min ? Number(form.priceRange.min) : undefined;
    const max = form.priceRange.max ? Number(form.priceRange.max) : undefined;
    const lat = latValid ? latNumber : undefined;
    const lng = lngValid ? lngNumber : undefined;
    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      type: form.type,
      status: form.status,
      possessionDate: form.possessionDate || undefined,
      location: {
        city: form.location.city.trim(),
        area: form.location.area.trim() || undefined,
        addressLine: form.location.addressLine.trim() || undefined,
        lat,
        lng
      },
      priceRange: {
        min,
        max,
        currency: min || max ? "INR" : undefined
      },
      amenities: form.amenities.length ? form.amenities : undefined,
      highlights: form.highlights.length ? form.highlights : undefined,
      media: {
        cover: form.media.cover || undefined,
        gallery: form.media.gallery.length ? form.media.gallery : undefined,
        brochure: form.media.brochure || undefined
      }
    };
  };

  const saveProject = async () => {
    if (!tenantId) return;
    if (!form.name.trim() || !form.type || !form.status || !form.location.city.trim()) {
      setError("Name, type, status, and city are required.");
      return;
    }
    if (hasLatLngError) {
      setError(latError || lngError || "Invalid coordinates.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (isNew) {
        const res = await createAdminProject(tenantId, payload);
        const id = res.data.id;
        if (id) {
          setCreatedId(id);
          setMessage("Draft created.");
          navigate(`/projects/${id}/edit`, { replace: true });
        }
      } else if (projectId) {
        await updateAdminProject(tenantId, projectId, payload);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!tenantId || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      if (projectStatus === "published") {
        await unpublishAdminProject(tenantId, projectId);
        setProjectStatus("draft");
      } else {
        await publishAdminProject(tenantId, projectId);
        setProjectStatus("published");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update visibility");
    } finally {
      setSaving(false);
    }
  };

  const ensureDraft = async () => {
    if (!tenantId) return null;
    if (effectiveProjectId) return effectiveProjectId;
    if (creatingRef.current) return creatingRef.current;
    if (!form.name.trim() || !form.type || !form.status || !form.location.city.trim()) {
      setError("Fill Basics and Location before uploading media.");
      return null;
    }
    if (hasLatLngError) {
      setError(latError || lngError || "Invalid coordinates.");
      return null;
    }
    setMessage(null);
    const payload = buildPayload();
    creatingRef.current = createAdminProject(tenantId, payload)
      .then((res) => {
        const id = res.data.id;
        if (id) {
          setCreatedId(id);
          setMessage("Draft created. Uploading media...");
          navigate(`/projects/${id}/edit`, { replace: true });
        }
        return id || null;
      })
      .catch((err: any) => {
        setError(err.message || "Failed to create draft");
        return null;
      })
      .finally(() => {
        creatingRef.current = null;
      });
    return creatingRef.current;
  };

  const uploadBrochure = async (file: File) => {
    if (!tenantId) return;
    const id = await ensureDraft();
    if (!id) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const objectPath = `tenants/${tenantId}/projects/${id}/media/brochure-${Date.now()}-${file.name}`;
      const sign = await signPutMedia(objectPath, file.type);
      const putRes = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Upload failed");
      const brochure = { objectPath, contentType: file.type, fileName: file.name };
      setForm((prev) => ({ ...prev, media: { ...prev.media, brochure } }));
      await updateAdminProject(tenantId, id, { media: { brochure } });
    } catch (err: any) {
      setError(err.message || "Failed to upload brochure");
    } finally {
      setSaving(false);
    }
  };

  const addChip = (value: string, field: "amenities" | "highlights") => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      [field]: Array.from(new Set([...(prev[field] || []), trimmed]))
    }));
  };

  const removeChip = (value: string, field: "amenities" | "highlights") => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value)
    }));
  };

  const handleMapChange = (next: { lat?: number; lng?: number }) => {
    setMapError(null);
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        lat: next.lat != null ? String(next.lat) : "",
        lng: next.lng != null ? String(next.lng) : ""
      }
    }));
  };

  const handleClearPin = () => {
    setMapError(null);
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, lat: "", lng: "" }
    }));
  };

  const handleUseMyLocation = () => {
    if (isReadOnly) return;
    setMapError(null);
    if (!navigator.geolocation) {
      setMapError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setMapError(err.message || "Unable to fetch current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchOnMap = () => {
    setMapError(null);
    setMapCenter(getDefaultCenter(form.location.city, mapValue?.lat, mapValue?.lng));
  };

  const stepContent = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-secondary">Project name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Chandrapur Heights"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Slug (optional)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="chandrapur-heights"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                >
                  <option value="apartment">Apartment</option>
                  <option value="plot">Plot</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                >
                  <option value="planning">Planning</option>
                  <option value="under_construction">Under construction</option>
                  <option value="ready">Ready</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Possession date</label>
                <input
                  type="date"
                  value={form.possessionDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, possessionDate: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-secondary">City *</label>
                <input
                  value={form.location.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, city: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Chandrapur"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Area</label>
                <input
                  value={form.location.area}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, area: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Ramnagar"
                  disabled={isReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-secondary">Address line</label>
                <input
                  value={form.location.addressLine}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, addressLine: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Near City Center, Chandrapur"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Latitude</label>
                <input
                  value={form.location.lat}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, lat: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="19.95"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Longitude</label>
                <input
                  value={form.location.lng}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, lng: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="79.30"
                  disabled={isReadOnly}
                />
              </div>
              {(latError || lngError) && (
                <div className="md:col-span-2 text-xs text-rose-300">
                  {latError || lngError}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-theme bg-surface/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">Map pin (optional)</div>
                  <div className="text-xs text-secondary">Pinpoint the project for accurate search & map view.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={handleSearchOnMap}
                    disabled={isReadOnly}
                  >
                    Search on map
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={handleUseMyLocation}
                    disabled={isReadOnly}
                  >
                    Use my location
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={handleClearPin}
                    disabled={isReadOnly}
                  >
                    Clear pin
                  </button>
                </div>
              </div>
              {mapError && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {mapError}
                </div>
              )}
              <MapPicker
                value={mapValue}
                onChange={handleMapChange}
                center={mapCenter}
                height={320}
                disabled={isReadOnly}
              />
              <div className="text-xs font-mono text-secondary">
                {mapValue ? `lat ${mapValue.lat.toFixed(6)}, lng ${mapValue.lng.toFixed(6)}` : "No pin set"}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-secondary">Min price (INR)</label>
              <input
                value={form.priceRange.min}
                onChange={(e) => setForm((prev) => ({ ...prev, priceRange: { ...prev.priceRange, min: e.target.value } }))}
                className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                placeholder="3500000"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Max price (INR)</label>
              <input
                value={form.priceRange.max}
                onChange={(e) => setForm((prev) => ({ ...prev, priceRange: { ...prev.priceRange, max: e.target.value } }))}
                className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                placeholder="8500000"
                disabled={isReadOnly}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-secondary">Amenities</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.amenities.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-secondary">
                    {item}
                    <button type="button" onClick={() => removeChip(item, "amenities")} className="text-muted" disabled={isReadOnly}>
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Gym, Garden, Clubhouse"
                  disabled={isReadOnly}
                />
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    addChip(amenityInput, "amenities");
                    setAmenityInput("");
                  }}
                  disabled={isReadOnly}
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Highlights</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.highlights.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-secondary">
                    {item}
                    <button type="button" onClick={() => removeChip(item, "highlights")} className="text-muted" disabled={isReadOnly}>
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Near highway, Premium amenities"
                  disabled={isReadOnly}
                />
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    addChip(highlightInput, "highlights");
                    setHighlightInput("");
                  }}
                  disabled={isReadOnly}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            {!tenantId ? (
              <EmptyState title="Loading tenant..." />
            ) : (
              <div className={isReadOnly ? "pointer-events-none opacity-60" : ""}>
                <MediaManager
                  projectId={effectiveProjectId}
                  tenantId={tenantId}
                  media={{ hero: form.media.cover, gallery: form.media.gallery }}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      media: { ...prev.media, cover: next.hero || null, gallery: next.gallery || [] }
                    }))
                  }
                  allowVideo={true}
                  requireHeroImage={true}
                  onEnsureId={ensureDraft}
                />
              </div>
            )}
            <div className="card-glass border border-theme p-4 text-sm text-secondary">
              <div className="font-semibold text-primary">Brochure (optional)</div>
              <p className="text-xs text-muted">Upload a PDF brochure for buyers and sales teams.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadBrochure(file);
                  }}
                  className="text-xs text-secondary"
                />
                {form.media.brochure && (
                  <span className="text-xs text-secondary">{form.media.brochure.fileName || "Brochure uploaded"}</span>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-3 text-sm text-secondary">
            <div className="text-base font-semibold text-primary">Review</div>
            <div>Name: {form.name || "Untitled"}</div>
            <div>Type: {form.type}</div>
            <div>Status: {form.status}</div>
            <div>City: {form.location.city || "Not set"}</div>
            <div>Cover: {form.media.cover ? "Uploaded" : "Missing"}</div>
          </div>
        );
    }
  }, [form, stepIndex, tenantId, projectId, amenityInput, highlightInput, isReadOnly, effectiveProjectId]);

  const publishChecklist = [
    { label: "Project name", ok: Boolean(form.name.trim()), step: 0 },
    { label: "Type", ok: Boolean(form.type), step: 0 },
    { label: "Status", ok: Boolean(form.status), step: 0 },
    { label: "City", ok: Boolean(form.location.city.trim()), step: 1 },
    { label: "Cover image", ok: Boolean(form.media.cover?.objectPath), step: 4 }
  ];
  const recommendedUnits = counts?.totalUnits ? counts.totalUnits > 0 : false;
  const canPublish = publishChecklist.every((item) => item.ok);

  if (!tenantId) return <div className="text-sm text-secondary">Loading tenant...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{isNew ? "New Project" : "Edit Project"}</h1>
          <p className="text-sm text-secondary">Create and manage project details for public visibility.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60"
            onClick={saveProject}
            disabled={saving || isReadOnly}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {!isNew && (
            <button
              className="btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handlePublish}
              disabled={saving || !canAdmin || (projectStatus !== "published" && !canPublish)}
              title={
                !canAdmin
                  ? "Admin only"
                  : projectStatus !== "published" && !canPublish
                    ? "Complete required fields"
                    : undefined
              }
            >
              {projectStatus === "published" ? "Unpublish" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-theme bg-surface px-4 py-2 text-sm text-secondary">{message}</div>
      )}
      {error && <ErrorBanner message={error} />}
      {isReadOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          This project is published. Admin access is required to make changes.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            onClick={() => setStepIndex(idx)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              idx === stepIndex ? "bg-surface text-primary" : "text-secondary hover:bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card-glass border border-theme p-6 shadow-sm">
        {loading ? <div className="text-sm text-secondary">Loading...</div> : stepContent}
      </div>

      {stepIndex === 5 && (
        <div className="card-glass border border-theme p-4 shadow-sm space-y-2">
          <div className="text-sm font-semibold text-primary">Publish readiness</div>
          <div className="space-y-2 text-sm text-secondary">
            {publishChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStepIndex(item.step)}
                className="flex items-center gap-2 text-left hover:text-primary"
              >
                <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="flex items-center gap-2 text-muted">
              <span className={`h-2 w-2 rounded-full ${recommendedUnits ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span>{recommendedUnits ? "Units added" : "Units recommended before publish"}</span>
            </div>
          </div>
          <div className="pt-2">
            <button
              className="btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handlePublish}
              disabled={!canAdmin || (projectStatus !== "published" && !canPublish) || projectStatus === "published"}
              title={
                !canAdmin
                  ? "Admin only"
                  : projectStatus !== "published" && !canPublish
                    ? "Complete required fields"
                    : undefined
              }
            >
              {projectStatus === "published" ? "Published" : "Publish project"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          className="rounded-md border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          disabled={stepIndex === 0}
        >
          Back
        </button>
        <button
          className="rounded-md border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
          disabled={stepIndex === STEPS.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
