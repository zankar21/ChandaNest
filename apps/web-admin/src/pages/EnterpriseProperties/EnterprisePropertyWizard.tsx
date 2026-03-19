import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import AdminSectionCard from "../../components/admin/AdminSectionCard";
import AdminStepTabs from "../../components/admin/AdminStepTabs";
import AdminWorkspaceHero from "../../components/admin/AdminWorkspaceHero";
import MapPickerModal from "../../components/MapPickerModal";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { createListing, listTeamUsers, publishListing, signGetMedia, signPutMedia, updateListing } from "../../services/apiClient";
import type { TeamUser } from "../../services/apiTypes";
import {
  ACCOMMODATION_TYPE_OPTIONS,
  assessDraft,
  buildMediaId,
  CATEGORY_OPTIONS,
  DEAL_INTENT_OPTIONS,
  defaultEnterpriseListingDraft,
  FURNISHING_OPTIONS,
  GEO_ACCURACY_OPTIONS,
  getCategoryFromPropertyType,
  getPropertyCapability,
  getPropertyTypeOptions,
  LAND_AREA_UNIT_OPTIONS,
  LAND_TYPE_OPTIONS,
  mapListingToDraft,
  maybeAutoComputePricePerSqFt,
  POSSESSION_STATUS_OPTIONS,
  RECORD_STATUS_OPTIONS,
  RENTAL_MODEL_OPTIONS,
  RENTAL_TYPE_OPTIONS,
  RENT_FACILITIES_OPTIONS,
  RENT_TENANT_PREFERENCE_OPTIONS,
  SALE_PRICE_UNIT_OPTIONS,
  serializeListingDraft,
  SHARING_TYPE_OPTIONS,
  toDisplayLabel,
  type Category,
  type DealIntent,
  type EnterpriseListingDraft,
  type MediaItem,
  type PropertyType,
  type RecordStatusUi
} from "./enterpriseListingWizardConfig";

const STEPS = ["Basics", "Location", "Specifications", "Pricing", "Amenities & Highlights", "Media", "Review & Publish"] as const;
const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-primary outline-none transition focus:border-amber-300/50 focus:bg-white/10";
const textAreaClass = `${inputClass} min-h-[112px] resize-y`;
const checkboxClass = "h-4 w-4 rounded border-white/20 bg-white/10 text-amber-400 focus:ring-amber-300/40";
const chipBase = "rounded-full border px-3 py-1.5 text-xs font-semibold transition";
const chipActive = "border-amber-300/50 bg-amber-300/20 text-amber-50";
const chipInactive = "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10";
const WATER_SUPPLY_OPTIONS = ["municipal", "borewell", "both", "tanker", "other"] as const;
const CONTACT_PREFERRED_OPTIONS = ["call", "whatsapp", "both"] as const;
const CONTACT_TIME_OPTIONS = ["morning", "afternoon", "evening", "any"] as const;
const FITOUT_OPTIONS = ["shell", "semi_furnished", "furnished"] as const;
const COMMERCIAL_POSSESSION_OPTIONS = ["ready", "under_construction"] as const;
const CONFIGURATION_OPTIONS = ["1rk", "1bhk", "2bhk", "3bhk", "4bhk_plus"] as const;
const WATER_SOURCE_OPTIONS = ["borewell", "well", "municipal", "canal", "other"] as const;
const SALE_TYPE_OPTIONS = ["new_booking", "resale"] as const;
const PLOT_SHAPE_OPTIONS = ["rectangular", "square", "irregular", "corner"] as const;

type TeamUserOption = Pick<TeamUser, "id" | "uid" | "displayName" | "email">;

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-slate-200">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Card({ title, children, subtitle }: { title: string; children: ReactNode; subtitle?: string }) {
  return <AdminSectionCard title={title} subtitle={subtitle}>{children}</AdminSectionCard>;
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
      <input className={checkboxClass} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="space-y-1">
        <span className="block font-medium text-slate-100">{label}</span>
        {hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}
      </span>
    </label>
  );
}

function ChipMultiSelect({ options, values, onChange }: { options: readonly string[]; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = values.includes(option);
        return (
          <button key={option} type="button" className={`${chipBase} ${active ? chipActive : chipInactive}`} onClick={() => onChange(active ? values.filter((entry) => entry !== option) : [...values, option])}>
            {toDisplayLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function TagEditor({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draftValue, setDraftValue] = useState("");
  const addTag = () => {
    const next = draftValue.trim();
    if (!next) return;
    if (!values.includes(next)) onChange([...values, next]);
    setDraftValue("");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-slate-100">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.length ? values.map((value) => (
          <span key={value} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100">
            {value}
            <button type="button" className="text-slate-400 hover:text-white" onClick={() => onChange(values.filter((item) => item !== value))}>x</button>
          </span>
        )) : <div className="text-xs text-slate-500">Nothing added yet.</div>}
      </div>
      <div className="flex gap-2">
        <input className={inputClass} value={draftValue} placeholder={placeholder} onChange={(e) => setDraftValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
        <button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={addTag}>Add</button>
      </div>
    </div>
  );
}

function teamLabel(user: TeamUserOption) {
  return user.displayName || user.email || user.uid || user.id || "Unknown";
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function priceBasisLabel(unit: (typeof SALE_PRICE_UNIT_OPTIONS)[number]) {
  return unit === "total" ? "Total listing price" : `Per ${unit}`;
}

export default function EnterprisePropertyWizard({ initialListingId, initialData }: { initialListingId?: string | null; initialData?: any }) {
  const { tenantId, refreshToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [draft, setDraft] = useState<EnterpriseListingDraft>(initialData ? mapListingToDraft(initialData) : defaultEnterpriseListingDraft);
  const [listingId, setListingId] = useState<string | null>(initialListingId || null);
  const [teamUsers, setTeamUsers] = useState<TeamUserOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mediaPreviewMap, setMediaPreviewMap] = useState<Record<string, string>>({});
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setDraft(mapListingToDraft(initialData));
      setListingId(initialListingId || null);
    }
  }, [initialData, initialListingId]);

  useEffect(() => {
    setDraft((current) => current.pricing.sale.manualPricePerSqFt ? current : { ...current, pricing: { ...current.pricing, sale: { ...current.pricing.sale, pricePerSqFt: maybeAutoComputePricePerSqFt(current) } } });
  }, [draft.pricing.sale.expectedPrice, draft.pricing.sale.expectedPriceUnit, draft.pricing.sale.manualPricePerSqFt, draft.specs.area.carpetSqFt, draft.specs.area.builtUpSqFt, draft.specs.area.superBuiltUpSqFt, draft.specs.area.plotAreaSqFt, draft.specs.area.saleableSqFt, draft.specs.area.landAreaValue, draft.specs.area.landAreaUnit]);

  useEffect(() => {
    async function run() {
      if (!tenantId) return;
      try {
        await refreshToken();
        const data = await listTeamUsers(tenantId);
        setTeamUsers((data.users || []).map((user) => ({ uid: user.uid || user.id, id: user.id, displayName: user.displayName, email: user.email })));
      } catch {
        setTeamUsers([]);
      }
    }
    void run();
  }, [tenantId, refreshToken]);

  useEffect(() => {
    async function hydratePreviews() {
      const paths = Array.from(new Set(draft.mediaItems.map((item) => item.url).filter(Boolean)));
      if (!paths.length) {
        setMediaPreviewMap({});
        return;
      }
      try {
        setMediaPreviewMap(await signGetMedia(paths));
      } catch {
        setMediaPreviewMap({});
      }
    }
    void hydratePreviews();
  }, [draft.mediaItems]);

  const capability = useMemo(() => getPropertyCapability(draft.propertyType), [draft.propertyType]);
  const typeOptions = useMemo(() => getPropertyTypeOptions(draft.category, draft.dealIntent), [draft.category, draft.dealIntent]);
  const readiness = useMemo(() => assessDraft(draft), [draft]);
  const salePerSqFt = useMemo(() => maybeAutoComputePricePerSqFt(draft), [draft]);
  const mediaPhotos = useMemo(() => draft.mediaItems.filter((item) => item.type === "photo"), [draft.mediaItems]);
  const mediaDocs = useMemo(() => draft.mediaItems.filter((item) => item.type === "doc"), [draft.mediaItems]);
  const pricingModel = draft.pricing.rent.pricingModel || draft.specs.accommodation.rentalModel;

  const sectionDetail = (index: number) => {
    if (index < readiness.sections.length) {
      const section = readiness.sections[index];
      if (section.blockers.length) return `${section.blockers.length} blocker(s)`;
      if (section.warnings.length) return `${section.warnings.length} warning(s)`;
      return section.complete ? "Ready" : "Incomplete";
    }
    return readiness.blockers.length ? `${readiness.blockers.length} blockers` : "Ready to publish";
  };

  const patch = (updater: (current: EnterpriseListingDraft) => EnterpriseListingDraft) => {
    setDraft((current) => updater(current));
    setError(null);
  };

  const persistDraft = async ({ exitAfter = false, silent = false, targetRecordStatus }: { exitAfter?: boolean; silent?: boolean; targetRecordStatus?: RecordStatusUi } = {}) => {
    if (!tenantId) return null;
    setBusy(true);
    setError(null);
    try {
      await refreshToken();
      const payload = serializeListingDraft(targetRecordStatus ? { ...draft, recordStatus: targetRecordStatus } : draft);
      let id = listingId;
      if (id) await updateListing(tenantId, id, payload); else { const created = await createListing(tenantId, payload); id = created?.listingId || null; if (id) setListingId(id); }
      if (!silent) toast.push({ tone: "success", title: "Draft saved", message: "Listing draft updated." });
      if (exitAfter) navigate("/enterprise-properties");
      return id;
    } catch (err: any) {
      setError(err?.message || "Failed to save listing");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!tenantId) return;
    if (readiness.blockers.length) { setError(readiness.blockers[0]); return; }
    setBusy(true);
    setError(null);
    try {
      await refreshToken();
      let id = listingId;
      const payload = serializeListingDraft({ ...draft, recordStatus: "published" });
      if (id) await updateListing(tenantId, id, payload); else { const created = await createListing(tenantId, payload); id = created?.listingId || null; if (id) setListingId(id); }
      if (id) await publishListing(tenantId, id);
      toast.push({ tone: "success", title: "Published", message: "Listing is now live." });
      navigate("/enterprise-properties");
    } catch (err: any) {
      setError(err?.message || "Failed to publish listing");
    } finally {
      setBusy(false);
    }
  };

  const ensureListingId = async () => listingId || persistDraft({ silent: true });

  const handleMediaUpload = async (files: FileList | null, mediaType: "photo" | "doc") => {
    if (!files?.length || !tenantId) return;
    const id = await ensureListingId();
    if (!id) { setError("Save the draft first so media can be attached to a stable listing id."); return; }
    setMediaBusy(true);
    setMediaMessage(null);
    setError(null);
    try {
      await refreshToken();
      const uploads: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const safeName = safeFileName(file.name);
        const folder = mediaType === "photo" ? "gallery" : "documents";
        const objectPath = `tenants/${tenantId}/properties/${id}/media/${folder}/${Date.now()}-${safeName}`;
        const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
        const putRes = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!putRes.ok) throw new Error(`Failed to upload ${file.name}.`);
        uploads.push({ id: buildMediaId(), type: mediaType, url: objectPath, caption: "", sortOrder: draft.mediaItems.length + uploads.length });
      }
      patch((current) => {
        const nextItems = [...current.mediaItems, ...uploads].map((item, index) => ({ ...item, sortOrder: index }));
        const nextCover = current.coverMediaId || nextItems.find((item) => item.type === "photo")?.id || "";
        return { ...current, mediaItems: nextItems, coverMediaId: nextCover };
      });
      setMediaMessage(`${uploads.length} ${mediaType === "photo" ? "photo" : "document"}${uploads.length > 1 ? "s" : ""} uploaded.`);
    } catch (err: any) {
      setError(err?.message || "Failed to upload media.");
    } finally {
      setMediaBusy(false);
    }
  };

  const updateMediaItem = (id: string, updater: (item: MediaItem) => MediaItem) => patch((current) => ({ ...current, mediaItems: current.mediaItems.map((item) => item.id === id ? updater(item) : item) }));
  const removeMediaItem = (id: string) => patch((current) => {
    const nextItems = current.mediaItems.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index }));
    const nextCover = current.coverMediaId === id ? nextItems.find((item) => item.type === "photo")?.id || "" : current.coverMediaId;
    return { ...current, mediaItems: nextItems, coverMediaId: nextCover };
  });
  const moveMediaItem = (id: string, direction: "up" | "down") => patch((current) => {
    const nextItems = [...current.mediaItems];
    const index = nextItems.findIndex((item) => item.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= nextItems.length) return current;
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(target, 0, item);
    return { ...current, mediaItems: nextItems.map((entry, sortOrder) => ({ ...entry, sortOrder })) };
  });

  const goToNextStep = () => {
    if (tab >= STEPS.length - 1) return;
    const currentSection = readiness.sections[tab];
    if (currentSection?.blockers.length) { setError(currentSection.blockers[0]); return; }
    setError(null);
    setTab((value) => Math.min(value + 1, STEPS.length - 1));
  };
  const renderBasics = () => (
    <div className="space-y-4">
      <Card title="Listing identity" subtitle="Define the canonical listing truth and internal enterprise metadata.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Title"><input className={inputClass} value={draft.title} onChange={(e) => patch((c) => ({ ...c, title: e.target.value }))} /></Field>
          <Field label="Deal intent"><select className={inputClass} value={draft.dealIntent} onChange={(e) => { const deal = e.target.value as DealIntent; const nextTypes = getPropertyTypeOptions(draft.category, deal); patch((c) => ({ ...c, dealIntent: deal, propertyType: nextTypes.includes(c.propertyType) ? c.propertyType : nextTypes[0] })); }}>{DEAL_INTENT_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
          <Field label="Category" hint={draft.category === "land" ? "UI uses land internally; serializer maps it to land_plot truth." : undefined}><select className={inputClass} value={draft.category} onChange={(e) => { const category = e.target.value as Category; patch((c) => ({ ...c, category, propertyType: getPropertyTypeOptions(category, c.dealIntent)[0] })); }}>{CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
          <Field label="Property type"><select className={inputClass} value={draft.propertyType} onChange={(e) => { const propertyType = e.target.value as PropertyType; patch((c) => ({ ...c, propertyType, category: getCategoryFromPropertyType(propertyType) })); }}>{typeOptions.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
          <Field label="Record status"><select className={inputClass} value={draft.recordStatus} onChange={(e) => patch((c) => ({ ...c, recordStatus: e.target.value as RecordStatusUi }))}>{RECORD_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
          <Field label="Listing source"><input className={inputClass} value={draft.source.listingSource} onChange={(e) => patch((c) => ({ ...c, source: { ...c.source, listingSource: e.target.value } }))} /></Field>
          <Field label="Internal reference ID"><input className={inputClass} value={draft.source.internalReferenceId} onChange={(e) => patch((c) => ({ ...c, source: { ...c.source, internalReferenceId: e.target.value } }))} /></Field>
          <Field label="Assigned manager"><select className={inputClass} value={draft.source.assignedManagerId} onChange={(e) => patch((c) => ({ ...c, source: { ...c.source, assignedManagerId: e.target.value } }))}><option value="">Unassigned</option>{teamUsers.map((user) => <option key={user.uid || user.id} value={user.uid || user.id}>{teamLabel(user)}</option>)}</select></Field>
          <Field label="Owner / Builder name"><input className={inputClass} value={draft.source.ownerOrBuilderName} onChange={(e) => patch((c) => ({ ...c, source: { ...c.source, ownerOrBuilderName: e.target.value } }))} /></Field>
        </div>
        <div className="mt-4"><Field label="Description"><textarea className={textAreaClass} value={draft.description} onChange={(e) => patch((c) => ({ ...c, description: e.target.value }))} /></Field></div>
      </Card>
      <Card title="Public contact" subtitle="Capture the public-facing contact and preferred communication pattern.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Contact name"><input className={inputClass} value={draft.contact.name} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, name: e.target.value } }))} /></Field>
          <Field label="Contact phone"><input className={inputClass} value={draft.contact.phone} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))} /></Field>
          <Field label="WhatsApp"><input className={inputClass} value={draft.contact.whatsapp} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, whatsapp: e.target.value } }))} /></Field>
          <Field label="Email"><input className={inputClass} value={draft.contact.email} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, email: e.target.value } }))} /></Field>
          <Field label="Contact role"><input className={inputClass} value={draft.contact.role} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, role: e.target.value } }))} /></Field>
          <Field label="Preferred contact method"><select className={inputClass} value={draft.contact.preferred} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, preferred: e.target.value as EnterpriseListingDraft["contact"]["preferred"] } }))}><option value="">Not specified</option>{CONTACT_PREFERRED_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
          <Field label="Preferred contact time"><select className={inputClass} value={draft.contact.preferredContactTime} onChange={(e) => patch((c) => ({ ...c, contact: { ...c.contact, preferredContactTime: e.target.value as EnterpriseListingDraft["contact"]["preferredContactTime"] } }))}><option value="">Not specified</option>{CONTACT_TIME_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
        </div>
      </Card>
    </div>
  );

  const renderLocation = () => (
    <Card title="Location & geo accuracy" subtitle="Keep locality truth clean and decide whether the exact address can be published.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="City slug"><input className={inputClass} value={draft.location.citySlug} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, citySlug: e.target.value } }))} /></Field>
        <Field label="Locality"><input className={inputClass} value={draft.location.locality} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, locality: e.target.value } }))} /></Field>
        <Field label="Sub locality"><input className={inputClass} value={draft.location.subLocality} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, subLocality: e.target.value } }))} /></Field>
        <Field label="Address line 1"><input className={inputClass} value={draft.location.addressLine1} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, addressLine1: e.target.value } }))} /></Field>
        <Field label="Address line 2"><input className={inputClass} value={draft.location.addressLine2} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, addressLine2: e.target.value } }))} /></Field>
        <Field label="Landmark"><input className={inputClass} value={draft.location.landmark} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, landmark: e.target.value } }))} /></Field>
        <Field label="Pin code"><input className={inputClass} value={draft.location.pinCode} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, pinCode: e.target.value } }))} /></Field>
        <Field label="Geo accuracy"><select className={inputClass} value={draft.location.geoAccuracy} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, geoAccuracy: e.target.value as EnterpriseListingDraft["location"]["geoAccuracy"] } }))}>{GEO_ACCURACY_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field>
        <Field label="Latitude"><input className={inputClass} value={draft.location.latitude} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, latitude: e.target.value } }))} /></Field>
        <Field label="Longitude"><input className={inputClass} value={draft.location.longitude} onChange={(e) => patch((c) => ({ ...c, location: { ...c.location, longitude: e.target.value } }))} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => setShowMapPicker(true)}>Pick coordinates on map</button><div className="text-xs text-slate-400">{draft.location.latitude && draft.location.longitude ? `Lat ${draft.location.latitude}, Lng ${draft.location.longitude}` : "Coordinates not set yet."}</div></div>
    </Card>
  );

  const renderSpecifications = () => (
    <div className="space-y-4">
      <Card title="Area & structural truth" subtitle="Capture the primary size and structural details used by publish readiness and pricing.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!capability.land ? <><Field label="Carpet area (sq ft)"><input className={inputClass} value={draft.specs.area.carpetSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, carpetSqFt: e.target.value } } }))} /></Field><Field label="Built-up area (sq ft)"><input className={inputClass} value={draft.specs.area.builtUpSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, builtUpSqFt: e.target.value } } }))} /></Field><Field label="Super built-up area (sq ft)"><input className={inputClass} value={draft.specs.area.superBuiltUpSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, superBuiltUpSqFt: e.target.value } } }))} /></Field></> : null}
          <Field label={capability.land ? "Land area value" : "Plot area (sq ft)"}><input className={inputClass} value={capability.land ? draft.specs.area.landAreaValue : draft.specs.area.plotAreaSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, [capability.land ? "landAreaValue" : "plotAreaSqFt"]: e.target.value } } }))} /></Field>
          {capability.land ? <Field label="Land area unit"><select className={inputClass} value={draft.specs.area.landAreaUnit} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, landAreaUnit: e.target.value as EnterpriseListingDraft["specs"]["area"]["landAreaUnit"] } } }))}><option value="">Select</option>{LAND_AREA_UNIT_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field> : null}
          {capability.commercial ? <Field label="Saleable area (sq ft)"><input className={inputClass} value={draft.specs.area.saleableSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, area: { ...c.specs.area, saleableSqFt: e.target.value } } }))} /></Field> : null}
          {capability.residentialUnit || capability.sharedAccommodation ? <><Field label="BHK"><input className={inputClass} value={draft.specs.structure.bhk} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, bhk: e.target.value } } }))} /></Field><Field label="Bedrooms"><input className={inputClass} value={draft.specs.structure.bedrooms} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, bedrooms: e.target.value } } }))} /></Field><Field label="Bathrooms"><input className={inputClass} value={draft.specs.structure.bathrooms} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, bathrooms: e.target.value } } }))} /></Field><Field label="Balcony count"><input className={inputClass} value={draft.specs.structure.balconyCount} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, balconyCount: e.target.value } } }))} /></Field><Field label="Floor"><input className={inputClass} value={draft.specs.structure.floor} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, floor: e.target.value } } }))} /></Field><Field label="Total floors"><input className={inputClass} value={draft.specs.structure.totalFloors} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, totalFloors: e.target.value } } }))} /></Field><Field label="Facing"><input className={inputClass} value={draft.specs.structure.facing} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, facing: e.target.value } } }))} /></Field><Field label="Furnishing"><select className={inputClass} value={draft.specs.structure.furnishing} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, furnishing: e.target.value } } }))}><option value="">Select</option>{FURNISHING_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Parking"><input className={inputClass} value={draft.specs.structure.parking} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, parking: e.target.value } } }))} /></Field><Field label="Society name"><input className={inputClass} value={draft.specs.structure.societyName} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, societyName: e.target.value } } }))} /></Field><Field label="Building age (years)"><input className={inputClass} value={draft.specs.structure.buildingAgeYears} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, buildingAgeYears: e.target.value } } }))} /></Field><Field label="Water supply"><select className={inputClass} value={draft.specs.structure.waterSupply} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, waterSupply: e.target.value } } }))}><option value="">Select</option>{WATER_SUPPLY_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Possession status"><select className={inputClass} value={draft.specs.structure.possessionStatus} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, possessionStatus: e.target.value } } }))}><option value="">Select</option>{POSSESSION_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field></> : null}
          {capability.commercial ? <><Field label="Commercial floor"><input className={inputClass} value={draft.specs.structure.floor} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, floor: e.target.value } } }))} /></Field><Field label="Block / wing"><input className={inputClass} value={draft.specs.commercial.blockWing} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, blockWing: e.target.value } } }))} /></Field><Field label="Commercial total floors"><input className={inputClass} value={draft.specs.structure.totalFloors} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, totalFloors: e.target.value } } }))} /></Field><Field label="Fitout status"><select className={inputClass} value={draft.specs.commercial.fitOutStatus} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, fitOutStatus: e.target.value } } }))}><option value="">Select</option>{FITOUT_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Possession status"><select className={inputClass} value={draft.specs.commercial.possessionStatus} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, possessionStatus: e.target.value } } }))}><option value="">Select</option>{COMMERCIAL_POSSESSION_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Dedicated parking"><input className={inputClass} value={draft.specs.commercial.dedicatedParking} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, dedicatedParking: e.target.value } } }))} /></Field><Field label="Frontage (ft)"><input className={inputClass} value={draft.specs.commercial.frontageFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, frontageFt: e.target.value } } }))} /></Field><Field label="Depth (ft)"><input className={inputClass} value={draft.specs.commercial.depthFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, depthFt: e.target.value } } }))} /></Field><Field label="Ceiling height (ft)"><input className={inputClass} value={draft.specs.commercial.ceilingHeightFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, ceilingHeightFt: e.target.value } } }))} /></Field><Field label="Shutter type"><input className={inputClass} value={draft.specs.commercial.shutterType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, shutterType: e.target.value } } }))} /></Field><Field label="Washrooms"><input className={inputClass} value={draft.specs.commercial.washrooms} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, washrooms: e.target.value } } }))} /></Field><Field label="Power load (kW)"><input className={inputClass} value={draft.specs.commercial.powerLoadKw} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, powerLoadKw: e.target.value } } }))} /></Field></> : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{capability.residentialUnit || capability.sharedAccommodation ? <><Toggle checked={draft.specs.structure.lift} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, lift: value } } }))} label="Lift available" /><Toggle checked={draft.specs.structure.powerBackup} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, structure: { ...c.specs.structure, powerBackup: value } } }))} label="Power backup" /></> : null}{capability.commercial ? <><Toggle checked={draft.specs.commercial.cornerUnit} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, cornerUnit: value } } }))} label="Corner unit" /><Toggle checked={draft.specs.commercial.signageSpace} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, signageSpace: value } } }))} label="Signage allowed" /><Toggle checked={draft.specs.commercial.waterConnection} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, waterConnection: value } } }))} label="Water connection" /><Toggle checked={draft.specs.commercial.fireSafetyReady} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, fireSafetyReady: value } } }))} label="Fire safety ready" /><Toggle checked={draft.specs.commercial.nearEntrance} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, nearEntrance: value } } }))} label="Near entrance" /><Toggle checked={draft.specs.commercial.nearEscalator} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, nearEscalator: value } } }))} label="Near escalator" /><Toggle checked={draft.specs.commercial.nearAnchor} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, nearAnchor: value } } }))} label="Near anchor" /></> : null}</div>
      </Card>
      {capability.commercial ? <Card title="Commercial subtype details" subtitle="Show the fields that matter for office, warehouse, industrial shed, and showroom inventory."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{capability.commercialOffice ? <><Field label="Seating capacity"><input className={inputClass} value={draft.specs.commercial.seatingCapacity} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, seatingCapacity: e.target.value } } }))} /></Field><Field label="Cabins"><input className={inputClass} value={draft.specs.commercial.cabins} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, cabins: e.target.value } } }))} /></Field><Field label="Meeting rooms"><input className={inputClass} value={draft.specs.commercial.meetingRooms} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, meetingRooms: e.target.value } } }))} /></Field><Field label="HVAC type"><input className={inputClass} value={draft.specs.commercial.hvacType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, hvacType: e.target.value } } }))} /></Field><Field label="Office furnishing"><input className={inputClass} value={draft.specs.commercial.furnishing} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, furnishing: e.target.value } } }))} /></Field><Field label="Business park grade"><input className={inputClass} value={draft.specs.commercial.businessParkGrade} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, businessParkGrade: e.target.value } } }))} /></Field><Toggle checked={draft.specs.commercial.pantry} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, pantry: value } } }))} label="Pantry" /><Toggle checked={draft.specs.commercial.reception} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, reception: value } } }))} label="Reception" /></> : null}{capability.commercialWarehouse ? <><Field label="Clear height (ft)"><input className={inputClass} value={draft.specs.commercial.clearHeightFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, clearHeightFt: e.target.value } } }))} /></Field><Field label="Dock doors / docking bays"><input className={inputClass} value={draft.specs.commercial.dockDoors} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, dockDoors: e.target.value } } }))} /></Field><Field label="Gate width (ft)"><input className={inputClass} value={draft.specs.commercial.gateWidthFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, gateWidthFt: e.target.value } } }))} /></Field><Field label="Flooring type"><input className={inputClass} value={draft.specs.commercial.flooringType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, flooringType: e.target.value } } }))} /></Field><Toggle checked={draft.specs.commercial.loadingBay} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, loadingBay: value } } }))} label="Loading bay / truck turning" /></> : null}{capability.commercialShowroom ? <><Field label="Display area (sq ft)"><input className={inputClass} value={draft.specs.commercial.displayAreaSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, displayAreaSqFt: e.target.value } } }))} /></Field><Field label="Storage area (sq ft)"><input className={inputClass} value={draft.specs.commercial.storageAreaSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, storageAreaSqFt: e.target.value } } }))} /></Field><Field label="Signage type"><input className={inputClass} value={draft.specs.commercial.signageType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, signageType: e.target.value } } }))} /></Field><Field label="Road exposure"><input className={inputClass} value={draft.specs.commercial.roadExposure} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, roadExposure: e.target.value } } }))} /></Field><Toggle checked={draft.specs.commercial.glassFacade} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, commercial: { ...c.specs.commercial, glassFacade: value } } }))} label="Glass facade" /></> : null}</div></Card> : null}
      {capability.sharedAccommodation || draft.dealIntent !== "sale" ? <Card title="Rental & shared accommodation" subtitle="Drive PG, room, and rent/lease truth from one structured accommodation section."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Rental type"><select className={inputClass} value={draft.specs.accommodation.rentalType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, rentalType: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["rentalType"] } } }))}><option value="">Select</option>{RENTAL_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Rental model"><select className={inputClass} value={pricingModel} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, pricingModel: e.target.value as EnterpriseListingDraft["pricing"]["rent"]["pricingModel"] } }, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, rentalModel: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["rentalModel"] } } }))}><option value="">Select</option>{RENTAL_MODEL_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Accommodation type"><select className={inputClass} value={draft.specs.accommodation.accommodationType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, accommodationType: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["accommodationType"] } } }))}><option value="">Select</option>{ACCOMMODATION_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Configuration"><select className={inputClass} value={draft.specs.accommodation.configuration} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, configuration: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["configuration"] } } }))}><option value="">Select</option>{CONFIGURATION_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Notice period (days)"><input className={inputClass} value={draft.specs.accommodation.noticePeriodDays} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, noticePeriodDays: e.target.value } } }))} /></Field><Field label="Security deposit (months)"><input className={inputClass} value={draft.specs.accommodation.securityDepositMonths} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, securityDepositMonths: e.target.value } } }))} /></Field><Field label="Available from"><input type="date" className={inputClass} value={draft.specs.accommodation.availableFrom} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, availableFrom: e.target.value } } }))} /></Field><Field label="Occupancy count"><input className={inputClass} value={draft.specs.accommodation.occupancyCount} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, occupancyCount: e.target.value } } }))} /></Field><Field label="Sharing type"><select className={inputClass} value={draft.specs.accommodation.sharingType} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, sharingType: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["sharingType"] } } }))}><option value="">Select</option>{SHARING_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Curfew time"><input className={inputClass} value={draft.specs.accommodation.curfewTime} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, curfewTime: e.target.value } } }))} /></Field><Field label="Meals note"><input className={inputClass} value={draft.specs.accommodation.mealsNote} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, mealsNote: e.target.value } } }))} /></Field><Field label="Rules note"><textarea className={textAreaClass} value={draft.specs.accommodation.rulesNote} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, rulesNote: e.target.value } } }))} /></Field>{draft.propertyType === "room" ? <><Field label="Room size (sq ft)"><input className={inputClass} value={draft.specs.accommodation.roomSizeSqFt} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, roomSizeSqFt: e.target.value } } }))} /></Field><Field label="Room furnishing"><select className={inputClass} value={draft.specs.accommodation.roomFurnishing} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, roomFurnishing: e.target.value } } }))}><option value="">Select</option>{FURNISHING_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field></> : null}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={draft.specs.accommodation.attachedBathroom} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, attachedBathroom: value } } }))} label="Attached bathroom" /><Toggle checked={draft.specs.accommodation.foodIncluded} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, foodIncluded: value } } }))} label="Food included" /><Toggle checked={draft.specs.accommodation.visitorsAllowed} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, visitorsAllowed: value } } }))} label="Visitors allowed" /><Toggle checked={draft.specs.accommodation.laundryIncluded} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, laundryIncluded: value } } }))} label="Laundry included" /><Toggle checked={draft.specs.accommodation.electricityIncluded} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, electricityIncluded: value } } }))} label="Electricity included" /><Toggle checked={draft.specs.accommodation.waterIncluded} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, waterIncluded: value } } }))} label="Water included" />{draft.propertyType === "room" ? <><Toggle checked={draft.specs.accommodation.roomBalcony} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, roomBalcony: value } } }))} label="Room balcony" /><Toggle checked={draft.specs.accommodation.roomAc} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, roomAc: value } } }))} label="AC in room" /><Toggle checked={draft.specs.accommodation.roomWifi} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, roomWifi: value } } }))} label="WiFi in room" /></> : null}<Toggle checked={draft.specs.accommodation.buildingCctv} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, buildingCctv: value } } }))} label="Building CCTV" /><Toggle checked={draft.specs.accommodation.buildingSecurity} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, buildingSecurity: value } } }))} label="Building security" /></div><div className="mt-4 space-y-4"><div><div className="mb-2 text-sm font-semibold text-slate-100">Tenant preference</div><ChipMultiSelect options={RENT_TENANT_PREFERENCE_OPTIONS} values={draft.specs.accommodation.tenantPreference} onChange={(values) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, tenantPreference: values } } }))} /></div><div><div className="mb-2 text-sm font-semibold text-slate-100">Facilities</div><ChipMultiSelect options={RENT_FACILITIES_OPTIONS} values={draft.specs.accommodation.facilities} onChange={(values) => patch((c) => ({ ...c, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, facilities: values } } }))} /></div></div></Card> : null}
      {capability.land ? <><Card title="Land physical traits" subtitle="Keep physical characteristics separate from legal record truth."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Land type"><select className={inputClass} value={draft.landRecord.landType} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, landType: e.target.value } }))}><option value="">Select</option>{LAND_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Zoning"><input className={inputClass} value={draft.specs.land.zoning} onChange={(e) => patch((c) => ({ ...c, specs: { ...c.specs, land: { ...c.specs.land, zoning: e.target.value } } }))} /></Field><Field label="Frontage (ft)"><input className={inputClass} value={draft.landRecord.frontageFeet || draft.specs.land.frontageFt} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, frontageFeet: e.target.value }, specs: { ...c.specs, land: { ...c.specs.land, frontageFt: e.target.value } } }))} /></Field><Field label="Plot shape"><select className={inputClass} value={draft.landRecord.plotShape} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, plotShape: e.target.value } }))}><option value="">Select</option>{PLOT_SHAPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Water source"><select className={inputClass} value={draft.landRecord.waterSource} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, waterSource: e.target.value }, specs: { ...c.specs, land: { ...c.specs.land, waterSource: e.target.value } } }))}><option value="">Select</option>{WATER_SOURCE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={draft.landRecord.roadAccess} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, roadAccess: value }, specs: { ...c.specs, land: { ...c.specs.land, roadAccess: value } } }))} label="Road access" /><Toggle checked={draft.specs.land.cornerPlot} onChange={(value) => patch((c) => ({ ...c, specs: { ...c.specs, land: { ...c.specs.land, cornerPlot: value } } }))} label="Corner plot" /><Toggle checked={draft.landRecord.boundaryWall} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, boundaryWall: value }, specs: { ...c.specs, land: { ...c.specs.land, boundaryWall: value } } }))} label="Boundary wall" /><Toggle checked={draft.landRecord.electricity} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, electricity: value }, specs: { ...c.specs, land: { ...c.specs.land, electricityAvailable: value } } }))} label="Electricity available" /></div></Card><Card title="Land legal record" subtitle="Prominently surface India-specific land record truth for legal readiness."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Mouza"><input className={inputClass} value={draft.landRecord.mouza} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, mouza: e.target.value } }))} /></Field><Field label="Survey / Gat No"><input className={inputClass} value={draft.landRecord.surveyOrGatNo} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, surveyOrGatNo: e.target.value } }))} /></Field><Field label="Hissa No"><input className={inputClass} value={draft.landRecord.hissaNo} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, hissaNo: e.target.value } }))} /></Field><Field label="Ward / Warg"><input className={inputClass} value={draft.landRecord.wargOrWard} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, wargOrWard: e.target.value } }))} /></Field><Field label="Taluka"><input className={inputClass} value={draft.landRecord.taluka} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, taluka: e.target.value } }))} /></Field><Field label="District"><input className={inputClass} value={draft.landRecord.district} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, district: e.target.value } }))} /></Field><Field label="State"><input className={inputClass} value={draft.landRecord.state} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, state: e.target.value } }))} /></Field><Field label="NA status"><input className={inputClass} value={draft.landRecord.naStatus} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, naStatus: e.target.value } }))} /></Field><Field label="Litigation notes"><textarea className={textAreaClass} value={draft.landRecord.litigationNotes} onChange={(e) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, litigationNotes: e.target.value } }))} /></Field></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={draft.landRecord.is712Available} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, is712Available: value } }))} label="7/12 available" /><Toggle checked={draft.landRecord.is8AAvailable} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, is8AAvailable: value } }))} label="8A available" /><Toggle checked={draft.landRecord.layoutApproved} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, layoutApproved: value } }))} label="Layout approved" /><Toggle checked={draft.landRecord.titleClear} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, titleClear: value } }))} label="Title clear" /><Toggle checked={draft.landRecord.litigation} onChange={(value) => patch((c) => ({ ...c, landRecord: { ...c.landRecord, litigation: value } }))} label="Litigation present" /></div></Card></> : null}
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-4">{draft.dealIntent === "sale" ? <Card title="Sale pricing" subtitle="Pricing comes after specifications so per-unit math can use known area truth."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Toggle checked={draft.pricing.sale.priceOnRequest} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, priceOnRequest: value } } }))} label="Display price on request" hint="Use this when the client does not want to show direct pricing." /><Field label="Expected total price / expected rate"><input className={inputClass} disabled={draft.pricing.sale.priceOnRequest} value={draft.pricing.sale.expectedPrice} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, expectedPrice: e.target.value } } }))} /></Field><Field label="Expected price basis"><select className={inputClass} disabled={draft.pricing.sale.priceOnRequest} value={draft.pricing.sale.expectedPriceUnit} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, expectedPriceUnit: e.target.value as EnterpriseListingDraft["pricing"]["sale"]["expectedPriceUnit"] } } }))}>{SALE_PRICE_UNIT_OPTIONS.map((option) => <option key={option} value={option}>{priceBasisLabel(option)}</option>)}</select></Field><Field label="Sale type"><select className={inputClass} value={draft.pricing.sale.saleType} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, saleType: e.target.value as EnterpriseListingDraft["pricing"]["sale"]["saleType"] } } }))}><option value="">Select</option>{SALE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Sale maintenance monthly"><input className={inputClass} value={draft.pricing.sale.maintenanceMonthly} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, maintenanceMonthly: e.target.value } } }))} /></Field><Field label="Price per sq ft" hint={draft.pricing.sale.manualPricePerSqFt ? "Manual override enabled." : "Auto-derived from area and pricing basis."}><input className={inputClass} disabled={!draft.pricing.sale.manualPricePerSqFt || draft.pricing.sale.priceOnRequest} value={draft.pricing.sale.manualPricePerSqFt ? draft.pricing.sale.pricePerSqFt : salePerSqFt} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, pricePerSqFt: e.target.value } } }))} /></Field></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={draft.pricing.sale.manualPricePerSqFt} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, manualPricePerSqFt: value, pricePerSqFt: value ? c.pricing.sale.pricePerSqFt || salePerSqFt : salePerSqFt } } }))} label="Manual price per sq ft" /><Toggle checked={draft.pricing.sale.allInclusive} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, allInclusive: value } } }))} label="All inclusive" /><Toggle checked={draft.pricing.sale.negotiable} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, negotiable: value } } }))} label="Negotiable" /><Toggle checked={draft.pricing.sale.taxIncluded} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, taxIncluded: value } } }))} label="Tax included" /><Toggle checked={draft.pricing.sale.possessionChargesIncluded} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, sale: { ...c.pricing.sale, possessionChargesIncluded: value } } }))} label="Possession charges included" /></div></Card> : <Card title={draft.dealIntent === "lease" ? "Lease pricing" : "Rental pricing"} subtitle="Validate the amount field according to the chosen pricing model."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Pricing model"><select className={inputClass} value={pricingModel} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, pricingModel: e.target.value as EnterpriseListingDraft["pricing"]["rent"]["pricingModel"] } }, specs: { ...c.specs, accommodation: { ...c.specs.accommodation, rentalModel: e.target.value as EnterpriseListingDraft["specs"]["accommodation"]["rentalModel"] } } }))}><option value="">Select</option>{RENTAL_MODEL_OPTIONS.map((option) => <option key={option} value={option}>{toDisplayLabel(option)}</option>)}</select></Field><Field label="Monthly rent" hint="Used for full property rentals."><input className={inputClass} value={draft.pricing.rent.monthlyRent} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, monthlyRent: e.target.value } } }))} /></Field><Field label="Per room amount"><input className={inputClass} value={draft.pricing.rent.perRoomAmount} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, perRoomAmount: e.target.value } } }))} /></Field><Field label="Per bed amount"><input className={inputClass} value={draft.pricing.rent.perBedAmount} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, perBedAmount: e.target.value } } }))} /></Field><Field label="Security deposit"><input className={inputClass} value={draft.pricing.rent.securityDeposit} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, securityDeposit: e.target.value } } }))} /></Field><Field label="Maintenance monthly"><input className={inputClass} value={draft.pricing.rent.maintenanceMonthly} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, maintenanceMonthly: e.target.value } } }))} /></Field><Field label="Booking amount"><input className={inputClass} value={draft.pricing.rent.bookingAmount} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, bookingAmount: e.target.value } } }))} /></Field><Field label="Lease duration (months)"><input className={inputClass} value={draft.pricing.rent.leaseDurationMonths} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, leaseDurationMonths: e.target.value } } }))} /></Field><Field label="Lock-in months"><input className={inputClass} value={draft.pricing.rent.lockInMonths} onChange={(e) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, lockInMonths: e.target.value } } }))} /></Field></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Toggle checked={draft.pricing.rent.rentNegotiable} onChange={(value) => patch((c) => ({ ...c, pricing: { ...c.pricing, rent: { ...c.pricing.rent, rentNegotiable: value } } }))} label="Negotiable" /></div></Card>}</div>
  );

  const renderAmenities = () => <div className="grid gap-4 lg:grid-cols-2"><TagEditor label="Amenities" values={draft.amenities} onChange={(values) => patch((c) => ({ ...c, amenities: values }))} placeholder="Add amenity" /><TagEditor label="Highlights" values={draft.highlights} onChange={(values) => patch((c) => ({ ...c, highlights: values }))} placeholder="Add highlight" /></div>;

  const renderMedia = () => (
    <div className="space-y-4"><Card title="Media gallery" subtitle="Upload signed-storage assets and select a cover photo for public cards and detail pages."><div className="flex flex-wrap items-center gap-3"><label className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold cursor-pointer">{mediaBusy ? "Uploading..." : "Upload photos"}<input type="file" accept="image/*" multiple className="hidden" disabled={mediaBusy || busy} onChange={(e) => void handleMediaUpload(e.target.files, "photo")} /></label><label className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold cursor-pointer">{mediaBusy ? "Uploading..." : "Upload documents"}<input type="file" accept=".pdf,image/*" multiple className="hidden" disabled={mediaBusy || busy} onChange={(e) => void handleMediaUpload(e.target.files, "doc")} /></label><div className="text-xs text-slate-400">{listingId ? `Listing id: ${listingId}` : "Uploading will save a draft first to create a listing id."}</div></div>{mediaMessage ? <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{mediaMessage}</div> : null}<div className="mt-5 space-y-5"><div><div className="mb-3 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-100">Photos</div><div className="text-xs text-slate-400">At least one photo and one cover selection are required for publish.</div></div><div className="text-xs text-slate-400">{mediaPhotos.length} photo(s)</div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mediaPhotos.length ? mediaPhotos.map((item, index) => <div key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"><div className="aspect-[4/3] bg-slate-900/60">{mediaPreviewMap[item.url] ? <img src={mediaPreviewMap[item.url]} alt={item.caption || `media-${index + 1}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Preview unavailable</div>}</div><div className="space-y-3 p-4"><Field label="Caption"><input className={inputClass} value={item.caption || ""} onChange={(e) => updateMediaItem(item.id, (current) => ({ ...current, caption: e.target.value }))} /></Field><div className="flex flex-wrap items-center gap-2"><button type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.coverMediaId === item.id ? "bg-emerald-400/20 text-emerald-100" : "bg-white/10 text-slate-300"}`} onClick={() => patch((c) => ({ ...c, coverMediaId: item.id }))}>{draft.coverMediaId === item.id ? "Cover photo" : "Set as cover"}</button><button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300" disabled={index === 0} onClick={() => moveMediaItem(item.id, "up")}>Move up</button><button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300" disabled={index === mediaPhotos.length - 1} onClick={() => moveMediaItem(item.id, "down")}>Move down</button><button type="button" className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200" onClick={() => removeMediaItem(item.id)}>Remove</button></div><div className="truncate text-[11px] text-slate-500">{item.url}</div></div></div>) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">No photos uploaded yet.</div>}</div></div><div><div className="mb-3 flex items-center justify-between"><div><div className="text-sm font-semibold text-slate-100">Documents</div><div className="text-xs text-slate-400">Optional supporting media. Stored as object paths and signed on demand.</div></div><div className="text-xs text-slate-400">{mediaDocs.length} document(s)</div></div><div className="space-y-3">{mediaDocs.length ? mediaDocs.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field label="Document label"><input className={inputClass} value={item.caption || ""} onChange={(e) => updateMediaItem(item.id, (current) => ({ ...current, caption: e.target.value }))} /></Field><div className="flex gap-2">{mediaPreviewMap[item.url] ? <button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => window.open(mediaPreviewMap[item.url], "_blank", "noopener,noreferrer")}>Open</button> : null}<button type="button" className="rounded-xl bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200" onClick={() => removeMediaItem(item.id)}>Remove</button></div></div><div className="mt-2 truncate text-[11px] text-slate-500">{item.url}</div></div>) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">No documents uploaded yet.</div>}</div></div></div></Card></div>
  );
  const renderReview = () => (
    <div className="space-y-4"><Card title="Publish readiness" subtitle="Blockers stop publish. Warnings stay visible so teams can improve listing quality before it goes live."><div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"><div className="space-y-4"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 text-sm font-semibold text-slate-100">Blockers</div>{readiness.blockers.length ? <ul className="space-y-2 text-sm text-rose-200">{readiness.blockers.map((item) => <li key={item}>- {item}</li>)}</ul> : <div className="text-sm text-emerald-300">No blockers. This listing is publish-ready.</div>}</div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-2 text-sm font-semibold text-slate-100">Warnings</div>{readiness.warnings.length ? <ul className="space-y-2 text-sm text-amber-100">{readiness.warnings.map((item) => <li key={item}>- {item}</li>)}</ul> : <div className="text-sm text-slate-400">No warnings.</div>}</div></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Readiness summary</div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{readiness.sections.map((section) => <div key={section.key} className="rounded-2xl border border-white/10 bg-slate-950/20 p-3"><div className="text-xs text-slate-400">{section.label}</div><div className="mt-1 text-sm font-semibold text-slate-100">{section.blockers.length ? `${section.blockers.length} blocker(s)` : section.warnings.length ? `${section.warnings.length} warning(s)` : "Ready"}</div></div>)}</div></div></div></Card><Card title="Public-facing preview summary" subtitle="Quickly review the story the listing tells before you publish it."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{readiness.publicSummary.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">{item.label}</div><div className="mt-1 text-sm font-semibold text-slate-100">{item.value}</div></div>)}</div></Card>{draft.dealIntent === "sale" ? <Card title="Price visibility" subtitle="Make it explicit whether the public listing will show a number or stay on request."><div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">Visibility</div><div className="mt-2 flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.pricing.sale.priceOnRequest ? "bg-amber-300/20 text-amber-100" : "bg-emerald-400/20 text-emerald-100"}`}>{draft.pricing.sale.priceOnRequest ? "On Request" : "Visible Price"}</span></div></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">Derived price per sq ft</div><div className="mt-2 text-sm font-semibold text-slate-100">{draft.pricing.sale.priceOnRequest ? "Hidden" : salePerSqFt || draft.pricing.sale.pricePerSqFt || "Not available"}</div></div></div></Card> : null}<Card title="Media readiness" subtitle="These checks follow the current publish rule: at least one photo and a cover selection."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{readiness.mediaReadiness.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">{item.label}</div><div className={`mt-1 text-sm font-semibold ${item.ready ? "text-emerald-300" : "text-amber-100"}`}>{item.ready ? "Ready" : "Needs attention"}</div><div className="mt-2 text-xs text-slate-400">{item.detail}</div></div>)}</div></Card>{capability.land ? <Card title="Land legal readiness" subtitle="Keep legal truth visible before publish for land listings."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{readiness.legalReadiness.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-slate-400">{item.label}</div><div className={`mt-1 text-sm font-semibold ${item.ready ? "text-emerald-300" : "text-amber-100"}`}>{item.detail}</div></div>)}</div></Card> : null}</div>
  );

  return (
    <div className="space-y-6">
      <AdminWorkspaceHero eyebrow="Enterprise Listing Workspace" title="Single Property Listing" description="Create, verify, and publish enterprise direct listings with a consistent premium workflow." stats={[{ label: "Deal Intent", value: toDisplayLabel(draft.dealIntent) }, { label: "Property Type", value: toDisplayLabel(draft.propertyType) }, { label: "Publish Blockers", value: readiness.blockers.length, tone: readiness.blockers.length ? "warning" : "success" }]} actions={<><button type="button" className="rounded-xl btn-secondary px-4 py-3 text-sm font-semibold" onClick={() => navigate("/enterprise-properties")}>Back to Listings</button><button type="button" className="rounded-xl btn-secondary px-4 py-3 text-sm font-semibold" onClick={() => void persistDraft()} disabled={busy}>{busy ? "Saving..." : "Save Draft"}</button><button type="button" className="rounded-xl btn-primary px-4 py-3 text-sm font-semibold" onClick={tab < STEPS.length - 1 ? goToNextStep : () => void publish()} disabled={busy}>{tab < STEPS.length - 1 ? "Continue" : busy ? "Publishing..." : "Publish"}</button></>} aside={<div className="space-y-3"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Workflow note</div><div className="text-sm leading-6 text-slate-200">Specifications come before pricing, media is handled with signed-storage uploads, and review shows blockers versus warnings clearly.</div><div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">{listingId ? `Editing listing ${listingId}` : "Draft has not been created yet. The first save will generate a stable listing id."}</div></div>} />
      <AdminStepTabs activeIndex={tab} onSelect={setTab} steps={STEPS.map((label, index) => ({ label, detail: sectionDetail(index) }))} />
      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
      {tab === 0 ? renderBasics() : null}
      {tab === 1 ? renderLocation() : null}
      {tab === 2 ? renderSpecifications() : null}
      {tab === 3 ? renderPricing() : null}
      {tab === 4 ? renderAmenities() : null}
      {tab === 5 ? renderMedia() : null}
      {tab === 6 ? renderReview() : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => void persistDraft()} disabled={busy}>Save draft</button><button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => void persistDraft({ exitAfter: true })} disabled={busy}>Save and exit</button></div><div className="flex flex-wrap gap-2"><button type="button" className="rounded-xl btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => setTab((value) => Math.max(value - 1, 0))} disabled={busy || tab === 0}>Back</button>{tab < STEPS.length - 1 ? <button type="button" className="rounded-xl btn-primary px-4 py-2 text-sm font-semibold" onClick={goToNextStep} disabled={busy}>Next</button> : <button type="button" className="rounded-xl btn-primary px-5 py-2 text-sm font-semibold" onClick={() => void publish()} disabled={busy}>{busy ? "Working..." : "Publish"}</button>}</div></div>
      <MapPickerModal isOpen={showMapPicker} onClose={() => setShowMapPicker(false)} initialLat={draft.location.latitude ? Number(draft.location.latitude) : null} initialLng={draft.location.longitude ? Number(draft.location.longitude) : null} onConfirm={(result) => { patch((c) => ({ ...c, location: { ...c.location, latitude: String(result.lat.toFixed(6)), longitude: String(result.lng.toFixed(6)), locality: result.locality || c.location.locality, addressLine1: result.formattedAddress || c.location.addressLine1 } })); setShowMapPicker(false); }} />
    </div>
  );
}








