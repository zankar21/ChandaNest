import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import MapPickerModal from "../components/MapPickerModal";
import MediaManager from "../components/MediaManager";
import { CHANDRAPUR_TALUKAS, DEFAULT_DISTRICT } from "../constants/maharashtra";
import {
  CATEGORY_OPTIONS,
  COMMERCIAL_PROPERTY_TYPES,
  INTENT_OPTIONS,
  LAND_PROPERTY_TYPES,
  LAND_USE_OPTIONS,
  RESIDENTIAL_PROPERTY_TYPES,
  SALE_TYPE_OPTIONS
} from "../constants/listingOptions";
import { useAuth } from "../hooks/useAuth";
import {
  createListing,
  generateListingAIDescription,
  getBillingSubscription,
  getListing,
  publishListing,
  signPutMedia,
  submitListing,
  updateListing,
  validateListing
} from "../services/apiClient";
import { fieldSection, friendlyFieldLabel } from "../utils/fieldLabels";
import { isClientAdmin } from "../utils/roles";

type FormState = {
  intent: string;
  category: string;
  propertyChoice: string;
  title: string;
  description: string;
  propertyType: string;
  subType: string;
  saleType: string;
  landUse: string;
  citySlug: string;
  locality: string;
  addressLine: string;
  landmark: string;
  pincode: string;
  geoLat: string;
  geoLng: string;
  totalPrice?: number;
  pricePerSqFt?: number;
  rentPerMonth?: number;
  deposit?: number;
  areaValue?: number;
  areaUnit?: string;
  landMouza?: string;
  landSurvey?: string;
  landWard?: string;
  landTaluka?: string;
  landDistrict?: string;
  plotLayoutApproved?: boolean;
  plotCornerPlot?: boolean;
  plotFacing?: string;
  contactName?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  flatBhk?: number;
  flatBathrooms?: number;
  flatCarpetAreaSqFt?: number;
  flatBuiltUpAreaSqFt?: number;
  media: any;
};

type LandDocument = { objectPath: string; fileName?: string; contentType?: string };
type LandDocuments = {
  extract712?: LandDocument | null;
  naOrder?: LandDocument | null;
  other?: LandDocument | null;
};

function extractDescription(input: any) {
  if (!input) return { user: "", ai: "", active: "user" as "user" | "ai", meta: null };
  if (typeof input === "string") return { user: input, ai: "", active: "user" as const, meta: null };
  const hasAi = typeof input.ai === "string" && input.ai.trim().length > 0;
  const active = input.active === "ai" || (!input.active && hasAi) ? "ai" : "user";
  return {
    user: typeof input.user === "string" ? input.user : "",
    ai: typeof input.ai === "string" ? input.ai : "",
    active,
    meta: input.aiMeta || null
  };
}

const BROKER_PARTNER = "Chandrapur Real Estate Solutions Pvt Ltd";
const AREA_UNITS = ["sqft", "sqm", "acre", "hectare"];
const LAND_DOC_SLOTS: { key: keyof LandDocuments; label: string }[] = [
  { key: "extract712", label: "7/12 Extract (PDF/Image)" },
  { key: "naOrder", label: "NA Order (PDF/Image)" },
  { key: "other", label: "Other Document (PDF/Image)" }
];

const MAX_GALLERY_ITEMS = 25;
const MAX_VIDEO_ITEMS = 3;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

function normalizePropertyType(selection: string) {
  switch (selection) {
    case "flat":
      return { propertyType: "flat", subType: "" };
    case "house":
      return { propertyType: "house", subType: "" };
    case "villa":
      return { propertyType: "villa", subType: "" };
    case "row_house":
      return { propertyType: "house", subType: "row_house" };
    case "studio":
      return { propertyType: "flat", subType: "studio" };
    case "shop":
      return { propertyType: "shop", subType: "" };
    case "office":
      return { propertyType: "office", subType: "" };
    case "warehouse":
      return { propertyType: "warehouse", subType: "" };
    case "industrial_shed":
      return { propertyType: "warehouse", subType: "industrial_shed" };
    case "plot":
      return { propertyType: "plot", subType: "" };
    case "land":
      return { propertyType: "land", subType: "" };
    default:
      return { propertyType: "flat", subType: "" };
  }
}

function inferCategory(propertyType?: string) {
  if (!propertyType) return "residential";
  if (propertyType === "plot" || propertyType === "land") return "land";
  if (["shop", "office", "warehouse"].includes(propertyType)) return "commercial";
  return "residential";
}

function selectionFromListing(propertyType?: string, subType?: string) {
  if (propertyType === "flat" && subType === "studio") return "studio";
  if (propertyType === "house" && subType === "row_house") return "row_house";
  if (propertyType === "warehouse" && subType === "industrial_shed") return "industrial_shed";
  return propertyType || "flat";
}

function formatIntentLabel(intent: string) {
  return intent === "rent" ? "Rent / Lease" : "Sale";
}

function formatCategoryLabel(category: string) {
  if (category === "commercial") return "Commercial";
  if (category === "land") return "Land / Plot";
  return "Residential";
}

function formatTypeLabel(propertyType: string, subType?: string) {
  const key = subType || propertyType;
  switch (key) {
    case "flat":
      return "Flat / Apartment";
    case "house":
      return "Independent House";
    case "villa":
      return "Villa / Bungalow";
    case "row_house":
      return "Row House";
    case "studio":
      return "Studio Apartment";
    case "plot":
      return "Plot (Approved)";
    case "land":
      return "Land (Raw Land)";
    case "shop":
      return "Shop / Showroom";
    case "office":
      return "Office Space";
    case "warehouse":
      return "Godown / Warehouse";
    case "industrial_shed":
      return "Industrial Shed";
    default:
      return "Listing";
  }
}

function formatSaleTypeLabel(value?: string) {
  if (!value) return "";
  return value === "resale" ? "Resale" : "New";
}

const formatINR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function ListingUpsertPage() {
  const { propertyId } = useParams();
  const isEdit = Boolean(propertyId);
  const { refreshToken, tenantId, user } = useAuth();
  const [form, setForm] = useState<FormState>({
    intent: "buy",
    category: "residential",
    propertyChoice: "flat",
    title: "",
    description: "",
    propertyType: "flat",
    subType: "",
    saleType: "new",
    landUse: "residential",
    citySlug: "",
    locality: "",
    addressLine: "",
    landmark: "",
    pincode: "",
    geoLat: "",
    geoLng: "",
    totalPrice: undefined,
    pricePerSqFt: undefined,
    rentPerMonth: undefined,
    deposit: undefined,
    areaValue: undefined,
    areaUnit: "sqft",
    landMouza: "",
    landSurvey: "",
    landWard: "",
    landTaluka: "",
    landDistrict: DEFAULT_DISTRICT,
    plotLayoutApproved: false,
    plotCornerPlot: false,
    plotFacing: "",
    contactName: "",
    contactPhone: "",
    contactWhatsapp: "",
    contactEmail: "",
    flatBhk: undefined,
    flatBathrooms: undefined,
    flatCarpetAreaSqFt: undefined,
    flatBuiltUpAreaSqFt: undefined,
    media: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [autoDraftNotice, setAutoDraftNotice] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [tenantType, setTenantType] = useState<string | null>(null);
  const [landDocs, setLandDocs] = useState<LandDocuments>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [descriptionTab, setDescriptionTab] = useState<"user" | "ai">("user");
  const [aiDescription, setAiDescription] = useState("");
  const [descriptionActive, setDescriptionActive] = useState<"user" | "ai">("user");
  const [aiMeta, setAiMeta] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [validation, setValidation] = useState<{ canSubmit: boolean; canPublish: boolean; missing: string[] } | null>(
    null
  );
  const [validationFields, setValidationFields] = useState<string[]>([]);
  const isLandCategory = form.category === "land";
  const isResidential = form.category === "residential";
  const isCommercial = form.category === "commercial";
  const isLand = form.propertyType === "land";
  const isPlot = form.propertyType === "plot";
  const isEnterprise = tenantType === "enterprise";
  const canUploadLandDocs = isLand && isEnterprise;
  const canModerate = isClientAdmin(user);
  const effectiveId = propertyId || listingId;

  const propertyOptions = useMemo(() => {
    if (form.category === "commercial") return COMMERCIAL_PROPERTY_TYPES;
    if (form.category === "land") return LAND_PROPERTY_TYPES;
    return RESIDENTIAL_PROPERTY_TYPES;
  }, [form.category]);

  useEffect(() => {
    if (propertyOptions.some((opt) => opt.value === form.propertyChoice)) return;
    const next = propertyOptions[0]?.value || "flat";
    const mapped = normalizePropertyType(next);
    setForm((prev) => ({
      ...prev,
      propertyChoice: next,
      propertyType: mapped.propertyType,
      subType: mapped.subType
    }));
  }, [propertyOptions, form.propertyChoice]);

  useEffect(() => {
    if (!isLand || form.landDistrict) return;
    setForm((prev) => (prev.landDistrict ? prev : { ...prev, landDistrict: DEFAULT_DISTRICT }));
  }, [form.landDistrict, isLand]);

  useEffect(() => {
    if (!isLandCategory || form.landUse) return;
    setForm((prev) => (prev.landUse ? prev : { ...prev, landUse: "residential" }));
  }, [form.landUse, isLandCategory]);

  useEffect(() => {
    if (form.intent === "rent" && form.saleType) {
      setForm((prev) => ({ ...prev, saleType: "" }));
    }
    if (form.intent === "buy" && !form.saleType) {
      setForm((prev) => ({ ...prev, saleType: "new" }));
    }
  }, [form.intent, form.saleType]);

  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      try {
        await refreshToken();
        const data = await getBillingSubscription(tenantId);
        setTenantType(data?.tenant?.type || null);
      } catch {
        setTenantType(null);
      }
    }
    loadTenant();
  }, [tenantId, refreshToken]);

  useEffect(() => {
    async function load() {
      if (!propertyId) return;
      setLoading(true);
      setError(null);
      try {
        await refreshToken();
        if (!tenantId) throw new Error("Missing tenant");
        const data = await getListing(tenantId, propertyId);
        setListingId(propertyId);
        const desc = extractDescription(data.description);
        const inferredCategory = data.category || inferCategory(data.propertyType);
        const inferredChoice = selectionFromListing(data.propertyType, data.subType || data.metadata?.subType);
        setForm({
          intent: data.type === "rent" ? "rent" : "buy",
          category: inferredCategory,
          propertyChoice: inferredChoice,
          title: data.title || "",
          description: desc.user || "",
          propertyType: data.propertyType || normalizePropertyType(inferredChoice).propertyType,
          subType: data.subType || data.metadata?.subType || "",
          saleType: data.saleType || "",
          landUse: data.landUse || data.landRecord?.landUse || "",
          citySlug: data.location?.citySlug || "",
          locality: data.location?.locality || "",
          addressLine: data.location?.addressLine || "",
          landmark: data.location?.landmark || "",
          pincode: data.location?.pincode || "",
          geoLat: data.location?.geo?.lat !== undefined ? String(data.location.geo.lat) : "",
          geoLng: data.location?.geo?.lng !== undefined ? String(data.location.geo.lng) : "",
          totalPrice: data.pricing?.totalPrice || data.pricing?.amount,
          pricePerSqFt: data.pricing?.pricePerSqFt,
          rentPerMonth: data.pricing?.rentPerMonth,
          deposit: data.pricing?.deposit,
          areaValue: data.area?.value,
          areaUnit: data.area?.unit || "sqft",
          landMouza: data.landRecord?.mouza || "",
          landSurvey: data.landRecord?.surveyOrGatNo || "",
          landWard: data.landRecord?.wardOrWarg || "",
          landTaluka: data.landRecord?.taluka || "",
          landDistrict: data.landRecord?.district || DEFAULT_DISTRICT,
          plotLayoutApproved: Boolean(data.plotInfo?.layoutApproved),
          plotCornerPlot: Boolean(data.plotInfo?.cornerPlot),
          plotFacing: data.plotInfo?.facing || "",
          contactName: data.contact?.name || "",
          contactPhone: data.contact?.phone || "",
          contactWhatsapp: data.contact?.whatsapp || "",
          contactEmail: data.contact?.email || "",
          flatBhk: data.specs?.flat?.bhk,
          flatBathrooms: data.specs?.flat?.bathrooms,
          flatCarpetAreaSqFt: data.specs?.flat?.carpetAreaSqFt,
          flatBuiltUpAreaSqFt: data.specs?.flat?.builtUpAreaSqFt,
          media: data.media || {}
        });
        setAiDescription(desc.ai || "");
        setDescriptionActive(desc.active === "ai" ? "ai" : "user");
        setAiMeta(desc.meta || null);
        setDescriptionTab(desc.ai ? "ai" : "user");
        setLandDocs((data?.documents?.land as LandDocuments) || {});
        const v = await validateListing(tenantId, propertyId);
        setValidation(v);
        setValidationFields(v.missing || []);
      } catch (err: any) {
        setError(err.message || "Failed to load listing");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId, refreshToken, tenantId]);

  const refreshValidation = async (id: string) => {
    if (!tenantId) return;
    try {
      const v = await validateListing(tenantId, id);
      setValidation(v);
      setValidationFields(v.missing || []);
    } catch {
      // ignore validation errors here
    }
  };

  const buildPayload = () => {
    const mapped = normalizePropertyType(form.propertyChoice);
    const dealType = form.intent === "rent" ? "rent" : "sale";
    const lat = form.geoLat ? Number(form.geoLat) : undefined;
    const lng = form.geoLng ? Number(form.geoLng) : undefined;
    const geo =
      typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)
        ? { lat, lng }
        : undefined;
    return {
      mode: "independent",
      type: dealType,
      category: form.category || undefined,
      propertyType: mapped.propertyType,
      subType: mapped.subType || undefined,
      saleType: dealType === "sale" ? form.saleType || undefined : undefined,
      landUse: isLandCategory ? form.landUse || undefined : undefined,
      title: form.title,
      description: {
        user: form.description || undefined,
        ai: aiDescription || undefined,
        active: descriptionActive,
        aiMeta: aiMeta || undefined
      },
      brokeragePartnerId: BROKER_PARTNER,
      location: {
        citySlug: form.citySlug,
        locality: form.locality,
        addressLine: form.addressLine || undefined,
        landmark: form.landmark || undefined,
        pincode: form.pincode || undefined,
        geo
      },
      area:
        form.areaValue && form.areaUnit
          ? { value: Number(form.areaValue), unit: form.areaUnit }
          : undefined,
      specs: isResidential
        ? {
            flat: {
              bhk: form.flatBhk ? Number(form.flatBhk) : undefined,
              bathrooms: form.flatBathrooms ? Number(form.flatBathrooms) : undefined,
              carpetAreaSqFt: form.flatCarpetAreaSqFt ? Number(form.flatCarpetAreaSqFt) : undefined,
              builtUpAreaSqFt: form.flatBuiltUpAreaSqFt ? Number(form.flatBuiltUpAreaSqFt) : undefined
            }
          }
        : undefined,
      landRecord:
        form.propertyType === "land"
          ? {
              mouza: form.landMouza || undefined,
              surveyOrGatNo: form.landSurvey || undefined,
              wardOrWarg: form.landWard || undefined,
              taluka: form.landTaluka || undefined,
              district: form.landDistrict || undefined,
              landUse: isLandCategory ? form.landUse || undefined : undefined
            }
          : undefined,
      plotInfo:
        form.propertyType === "plot"
          ? {
              layoutApproved: form.plotLayoutApproved || undefined,
              cornerPlot: form.plotCornerPlot || undefined,
              facing: form.plotFacing || undefined
            }
          : undefined,
      pricing: {
        totalPrice: form.totalPrice ? Number(form.totalPrice) : undefined,
        pricePerSqFt: form.pricePerSqFt ? Number(form.pricePerSqFt) : undefined,
        rentPerMonth: form.rentPerMonth ? Number(form.rentPerMonth) : undefined,
        deposit: form.deposit ? Number(form.deposit) : undefined
      },
      contact: {
        name: form.contactName || undefined,
        phone: form.contactPhone || undefined,
        whatsapp: form.contactWhatsapp || undefined,
        email: form.contactEmail || undefined
      },
      media: form.media
    };
  };

  const ensureDraft = async () => {
    if (!tenantId) throw new Error("Missing tenant");
    if (effectiveId) return effectiveId;
    const payload = buildPayload();
    const resp = await createListing(tenantId, payload);
    setListingId(resp.listingId);
    setAutoDraftNotice(true);
    setLastSavedAt(Date.now());
    await refreshValidation(resp.listingId);
    return resp.listingId;
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await refreshToken();
      if (!tenantId) throw new Error("Missing tenant");
      const payload = buildPayload();
      if (isEdit && propertyId) {
        await updateListing(tenantId, propertyId, payload);
        await refreshValidation(propertyId);
        setMessage("Saved.");
        setLastSavedAt(Date.now());
      } else {
        const resp = await createListing(tenantId, payload);
        setListingId(resp.listingId);
        setAutoDraftNotice(false);
        await refreshValidation(resp.listingId);
        setMessage("Draft created. Add media and submit when ready.");
        setLastSavedAt(Date.now());
        return;
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAi = async (force = false) => {
    if (!tenantId) return;
    setAiStatus("loading");
    setAiError(null);
    try {
      const id = await ensureDraft();
      const resp = await generateListingAIDescription(tenantId, id, { force, setActive: true });
      const desc = extractDescription(resp.data?.description);
      setAiDescription(desc.ai || "");
      setAiMeta(desc.meta || null);
      setDescriptionActive(desc.active === "ai" ? "ai" : "user");
      setDescriptionTab("ai");
      await refreshValidation(id);
      setAiStatus("success");
    } catch (err: any) {
      setAiStatus("error");
      setAiError(err.message || "Failed to generate AI description");
    }
  };

  const handleActiveToggle = async (nextActive: "user" | "ai") => {
    setDescriptionActive(nextActive);
    if (!tenantId || !listingId) return;
    try {
      await updateListing(tenantId, listingId, {
        description: {
          user: form.description || undefined,
          ai: aiDescription || undefined,
          active: nextActive,
          aiMeta: aiMeta || undefined
        }
      });
    } catch {
      // ignore errors here
    }
  };

  const act = async (action: "submit" | "publish") => {
    const id = effectiveId;
    if (!id || !tenantId) return;
    const localMissing = computeLocalMissing();
    if (localMissing.length) {
      setValidationFields(localMissing);
      setError("Complete required fields before submitting.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await refreshToken();
      if (action === "submit") await submitListing(tenantId, id);
      if (action === "publish") await publishListing(tenantId, id);
      await refreshValidation(id);
      setMessage(action === "submit" ? "Submitted for review." : "Published.");
    } catch (err: any) {
      setError(err.message || "Action failed");
      if (err.code === "VALIDATION_FAILED" && Array.isArray(err.fields)) {
        setValidationFields(err.fields);
      }
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof FormState, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const computeLocalMissing = () => {
    const missing: string[] = [];
    if (!form.category) missing.push("category");
    if (!form.title.trim()) missing.push("title");
    if (form.description.trim().length < 30) missing.push("description");
    if (form.intent === "buy" && !form.saleType) missing.push("saleType");
    if (isLandCategory && !form.landUse) missing.push("landUse");
    if (isResidential) {
      if (!form.flatBhk) missing.push("specs.flat.bhk");
      if (!form.flatBathrooms) missing.push("specs.flat.bathrooms");
      if (!form.flatCarpetAreaSqFt) missing.push("specs.flat.carpetAreaSqFt");
    }
    if (isCommercial || isLandCategory) {
      if (!form.areaValue) missing.push("area.value");
      if (!form.areaUnit) missing.push("area.unit");
    }
    if (isLand) {
      if (!form.landMouza?.trim()) missing.push("landRecord.mouza");
      if (!form.landSurvey?.trim()) missing.push("landRecord.surveyOrGatNo");
      if (!form.landTaluka?.trim()) missing.push("landRecord.taluka");
      if (!form.landDistrict?.trim()) missing.push("landRecord.district");
    }
    if (!form.contactPhone?.trim()) missing.push("contact.phone");
    if (form.intent === "rent" && !form.rentPerMonth) missing.push("pricing.rentPerMonth");
    if (form.intent === "buy" && !form.totalPrice && !form.pricePerSqFt) missing.push("pricing.totalPrice");
    if (!form.media?.hero?.objectPath) missing.push("media.hero");
    if (!form.media?.gallery || form.media.gallery.length === 0) missing.push("media.gallery");
    return missing;
  };

  const localMissing = computeLocalMissing();
  const backendMissing = validationFields.length > 0 ? validationFields : validation?.missing || [];
  const missingFields = Array.from(new Set([...backendMissing, ...localMissing]));
  const groupedMissing = missingFields.reduce<Record<string, string[]>>((acc, field) => {
    const section = fieldSection(field);
    if (!acc[section]) acc[section] = [];
    acc[section].push(friendlyFieldLabel(field));
    return acc;
  }, {});
  const missingBySection = Object.entries(groupedMissing).map(([section, fields]) => ({
    section,
    count: fields.length
  }));
  const canSubmit = (validation?.canSubmit ?? false) && localMissing.length === 0;
  const canPublish = (validation?.canPublish ?? false) && localMissing.length === 0;

  const sectionIcon = (section: string) => {
    switch (section) {
      case "Basics":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16M4 12h16M4 18h8" />
          </svg>
        );
      case "Location":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 21s6-6.2 6-10a6 6 0 1 0-12 0c0 3.8 6 10 6 10z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        );
      case "Specs":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16M4 17h16M7 7v10M17 7v10" />
          </svg>
        );
      case "Pricing":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v18M7 7h8a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
          </svg>
        );
      case "Contact":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h16v12H4z" />
            <path d="M4 8l8 5 8-5" />
          </svg>
        );
      case "Media":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <circle cx="9" cy="11" r="1.5" />
            <path d="M20 16l-4-4-4 4-2-2-4 4" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
          </svg>
        );
    }
  };

  const buildDocObjectPath = (slot: string, fileName: string) => {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    return `tenants/${tenantId}/listings/${propertyId}/docs/land/${slot}-${Date.now()}-${safeName}`;
  };

  const uploadLandDoc = async (slot: keyof LandDocuments, file: File) => {
    if (!tenantId || !propertyId) return;
    setUploadingSlot(slot);
    setError(null);
    try {
      const objectPath = buildDocObjectPath(slot, file.name);
      const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
      await fetch(sign.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      const nextDoc = { objectPath, fileName: file.name, contentType: file.type || undefined };
      const nextDocs = { ...landDocs, [slot]: nextDoc };
      await updateListing(tenantId, propertyId, { documents: { land: nextDocs } });
      setLandDocs(nextDocs);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeLandDoc = async (slot: keyof LandDocuments) => {
    if (!tenantId || !propertyId) return;
    setUploadingSlot(slot);
    setError(null);
    try {
      const nextDocs = { ...landDocs, [slot]: null };
      await updateListing(tenantId, propertyId, { documents: { land: nextDocs } });
      setLandDocs(nextDocs);
    } catch (err: any) {
      setError(err.message || "Failed to remove document");
    } finally {
      setUploadingSlot(null);
    }
  };

  const saveStatusLabel = saving
    ? "Saving..."
    : lastSavedAt
      ? `Saved ${Math.max(1, Math.round((Date.now() - lastSavedAt) / 60000))}m ago`
      : "Draft not saved";

  return (
    <div className="rounded-3xl bg-surface/70 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{isEdit ? "Edit Listing" : "New Listing"}</h1>
          <p className="text-sm text-secondary">Draft, validate, and publish with confidence.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 card-glass border border-theme px-4 py-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <button
          onClick={() => {
            if (effectiveId) {
              void refreshValidation(effectiveId);
            } else {
              setValidationFields(localMissing);
            }
          }}
          disabled={!effectiveId}
          className="rounded-lg input-glass px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
        >
          Validate
        </button>
        {effectiveId && (
          <button
            onClick={() => act("submit")}
            disabled={saving || !canSubmit}
            className="rounded-lg input-glass px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
          >
            Go to Submit
          </button>
        )}
        {effectiveId && canModerate && (
          <button
            onClick={() => act("publish")}
            disabled={saving || !canPublish}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Publish
          </button>
        )}
        <div className="ml-auto text-xs text-muted">{saveStatusLabel}</div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card id="section-basics" title="Basics" helper="Core details buyers see first.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Intent" required>
                  <select
                    value={form.intent}
                    onChange={(e) => setField("intent", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  >
                    {INTENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category" required>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Property Type" required>
                  <select
                    value={form.propertyChoice}
                    onChange={(e) => {
                      const next = e.target.value;
                      const mapped = normalizePropertyType(next);
                      setForm((prev) => ({
                        ...prev,
                        propertyChoice: next,
                        propertyType: mapped.propertyType,
                        subType: mapped.subType
                      }));
                    }}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  >
                    {propertyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {form.intent === "buy" && (
                  <Field label="Sale Type" required>
                    <select
                      value={form.saleType}
                      onChange={(e) => setField("saleType", e.target.value)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      {SALE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Title" required>
                  <input
                    value={form.title}
                    onChange={(e) => setField("title", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="e.g., Ram Nagar Heights - 2 BHK"
                  />
                </Field>
                <Field label="Description (min 30 chars)" required>
                  <div className="flex flex-wrap items-center gap-2 pb-2">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        descriptionTab === "user"
                          ? "bg-indigo-50 text-indigo-700"
                          : "border border-theme text-secondary"
                      }`}
                      onClick={() => setDescriptionTab("user")}
                    >
                      User description
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        descriptionTab === "ai"
                          ? "bg-indigo-50 text-indigo-700"
                          : "border border-theme text-secondary"
                      }`}
                      onClick={() => setDescriptionTab("ai")}
                    >
                      AI description
                    </button>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-secondary"
                        onClick={() => handleGenerateAi(Boolean(aiDescription))}
                        disabled={aiStatus === "loading"}
                      >
                        {aiDescription ? "Regenerate" : "Generate AI description"}
                      </button>
                    </div>
                  </div>
                  {descriptionTab === "user" ? (
                    <>
                      <textarea
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Write a concise, buyer-friendly description."
                      />
                      <div className="text-[11px] text-muted">{form.description.length} / 30</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          "Near highway",
                          "Ready to move",
                          "East facing",
                          "Good ventilation",
                          "Loan available",
                          "Close to market"
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const sentence = `${chip}.`;
                                if (prev.description.includes(sentence)) return prev;
                                const prefix = prev.description.trim().length ? `${prev.description.trim()} ` : "";
                                return { ...prev, description: `${prefix}${sentence}` };
                              })
                            }
                            className="rounded-full border border-theme px-3 py-1 text-[11px] font-semibold text-secondary hover:border-indigo-200 hover:text-indigo-700"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg input-glass bg-surface p-3 text-sm text-secondary">
                      {aiDescription ? (
                        <>
                          <div className="whitespace-pre-wrap">{aiDescription}</div>
                          {aiMeta?.model && aiMeta?.generatedAt && (
                            <div className="mt-2 text-[11px] text-muted">
                              Generated with {aiMeta.model} on {new Date(aiMeta.generatedAt).toLocaleString()}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-muted">No AI description yet.</div>
                      )}
                    </div>
                  )}
                  {aiStatus === "error" && aiError && (
                    <div className="mt-2 text-xs text-rose-600">{aiError}</div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-secondary">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={descriptionActive === "ai"}
                      disabled={!aiDescription}
                      onChange={(e) => handleActiveToggle(e.target.checked ? "ai" : "user")}
                    />
                    <span>Use AI on public page</span>
                  </div>
                </Field>
              </div>
            </Card>

            <Card id="section-location" title="Location" helper="Precise location helps map and nearby insights.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="City" required>
                  <input
                    value={form.citySlug}
                    onChange={(e) => setField("citySlug", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="Chandrapur"
                  />
                </Field>
                <Field label="Locality" required>
                  <input
                    value={form.locality}
                    onChange={(e) => setField("locality", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="Ramnagar"
                  />
                </Field>
                <Field label="Address" required>
                  <input
                    value={form.addressLine}
                    onChange={(e) => setField("addressLine", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="Plot 12, Ward 3"
                  />
                </Field>
                <Field label="Landmark (optional)">
                  <input
                    value={form.landmark}
                    onChange={(e) => setField("landmark", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="Near City Hospital"
                  />
                </Field>
                <Field label="Pincode (optional)">
                  <input
                    value={form.pincode}
                    onChange={(e) => setField("pincode", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="442401"
                  />
                </Field>
                <Field label="Latitude">
                  <input
                    value={form.geoLat}
                    onChange={(e) => setField("geoLat", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    value={form.geoLng}
                    onChange={(e) => setField("geoLng", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="rounded-lg input-glass px-3 py-2 text-sm font-semibold text-secondary hover:border-indigo-200 hover:text-indigo-700"
                  >
                    Pick on map
                  </button>
                </div>
              </div>
            </Card>

            {(isLandCategory || isCommercial) && (
              <Card
                id="section-specs"
                title={isLandCategory ? "Land / Plot Details" : "Commercial Details"}
                helper={isLand ? "Required to publish land listings." : "Fill in the most relevant specs."}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {isLandCategory && (
                    <Field label="Land Use" required>
                      <select
                        value={form.landUse}
                        onChange={(e) => setField("landUse", e.target.value)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        {LAND_USE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {isLand && (
                    <>
                      <Field label="Mouza" required>
                        <input
                          value={form.landMouza || ""}
                          onChange={(e) => setField("landMouza", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Survey / Gat No" required>
                        <input
                          value={form.landSurvey || ""}
                          onChange={(e) => setField("landSurvey", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Warg / Ward (optional)">
                        <input
                          value={form.landWard || ""}
                          onChange={(e) => setField("landWard", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Tehsil (Taluka)" required>
                        <input
                          list="chandrapur-taluka-list"
                          value={form.landTaluka || ""}
                          onChange={(e) => setField("landTaluka", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="District" required>
                        <input
                          value={form.landDistrict || ""}
                          onChange={(e) => setField("landDistrict", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                      <datalist id="chandrapur-taluka-list">
                        {CHANDRAPUR_TALUKAS.map((taluka) => (
                          <option key={taluka} value={taluka} />
                        ))}
                      </datalist>
                    </>
                  )}

                  <Field label="Area value" required={isLandCategory || isPlot || isCommercial}>
                    <input
                      type="number"
                      value={form.areaValue ?? ""}
                      onChange={(e) => setField("areaValue", e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Area unit" required={isLandCategory || isPlot || isCommercial}>
                    <select
                      value={form.areaUnit ?? ""}
                      onChange={(e) => setField("areaUnit", e.target.value)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    >
                      {AREA_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {isPlot && (
                    <>
                      <Field label="Layout approved (optional)">
                        <select
                          value={form.plotLayoutApproved ? "yes" : ""}
                          onChange={(e) => setField("plotLayoutApproved", e.target.value === "yes")}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </Field>
                      <Field label="Corner plot (optional)">
                        <select
                          value={form.plotCornerPlot ? "yes" : ""}
                          onChange={(e) => setField("plotCornerPlot", e.target.value === "yes")}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </Field>
                      <Field label="Facing (optional)">
                        <input
                          value={form.plotFacing || ""}
                          onChange={(e) => setField("plotFacing", e.target.value)}
                          className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                    </>
                  )}
                </div>
              </Card>
            )}

            <Card id="section-pricing" title="Pricing" helper="Set buyer-facing pricing in INR.">
              <div className="grid gap-4 md:grid-cols-2">
                {form.intent === "buy" && (
                  <>
                    <Field label="Total Price" required>
                      <input
                        type="number"
                        value={form.totalPrice ?? ""}
                        onChange={(e) => setField("totalPrice", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        placeholder="e.g., 4500000"
                      />
                      <div className="text-[11px] text-muted">INR preview shown on listing.</div>
                    </Field>
                    <Field label="Rate per sq.ft (optional)">
                      <input
                        type="number"
                        value={form.pricePerSqFt ?? ""}
                        onChange={(e) => setField("pricePerSqFt", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        placeholder="e.g., 3200"
                      />
                    </Field>
                  </>
                )}
                {form.intent === "rent" && (
                  <>
                    <Field label="Rent per month" required>
                      <input
                        type="number"
                        value={form.rentPerMonth ?? ""}
                        onChange={(e) => setField("rentPerMonth", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        placeholder="e.g., 18000"
                      />
                      <div className="text-[11px] text-muted">INR per month.</div>
                    </Field>
                    <Field label="Deposit (optional)">
                      <input
                        type="number"
                        value={form.deposit ?? ""}
                        onChange={(e) => setField("deposit", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                        placeholder="e.g., 50000"
                      />
                    </Field>
                  </>
                )}
              </div>
            </Card>

            {isResidential && (
              <Card id="section-specs" title="Residential Specs" helper="Required for residential listings.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="BHK" required>
                    <input
                      type="number"
                      value={form.flatBhk ?? ""}
                      onChange={(e) => setField("flatBhk", e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Bathrooms" required>
                    <input
                      type="number"
                      value={form.flatBathrooms ?? ""}
                      onChange={(e) => setField("flatBathrooms", e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Carpet area (sq.ft)" required>
                    <input
                      type="number"
                      value={form.flatCarpetAreaSqFt ?? ""}
                      onChange={(e) => setField("flatCarpetAreaSqFt", e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Built-up area (optional)">
                    <input
                      type="number"
                      value={form.flatBuiltUpAreaSqFt ?? ""}
                      onChange={(e) => setField("flatBuiltUpAreaSqFt", e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
              </Card>
            )}

            <Card id="section-contact" title="Contact" helper="Primary contact for enquiries.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Phone" required>
                  <input
                    value={form.contactPhone ?? ""}
                    onChange={(e) => setField("contactPhone", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                    placeholder="+91 90000 00000"
                  />
                </Field>
                <Field label="Name (optional)">
                  <input
                    value={form.contactName ?? ""}
                    onChange={(e) => setField("contactName", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="WhatsApp (optional)">
                  <input
                    value={form.contactWhatsapp ?? ""}
                    onChange={(e) => setField("contactWhatsapp", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Email (optional)">
                  <input
                    value={form.contactEmail ?? ""}
                    onChange={(e) => setField("contactEmail", e.target.value)}
                    className="w-full rounded-lg input-glass px-3 py-2 text-sm"
                  />
                </Field>
              </div>
            </Card>

            <Card id="section-media" title="Media">
              {autoDraftNotice && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Draft created to attach uploads. Do not forget to Save.
                </div>
              )}
              {tenantId && effectiveId ? (
                <MediaManager
                  propertyId={effectiveId}
                  tenantId={tenantId}
                  media={form.media}
                  onChange={(next) => {
                    setField("media", next);
                    void refreshValidation(effectiveId);
                  }}
                  allowVideo
                  maxItems={MAX_GALLERY_ITEMS}
                  maxVideos={MAX_VIDEO_ITEMS}
                  maxVideoBytes={MAX_VIDEO_BYTES}
                  requireHeroImage
                />
              ) : (
                <MediaManager
                  tenantId={tenantId || ""}
                  media={form.media}
                  onChange={(next) => setField("media", next)}
                  allowVideo
                  maxItems={MAX_GALLERY_ITEMS}
                  maxVideos={MAX_VIDEO_ITEMS}
                  maxVideoBytes={MAX_VIDEO_BYTES}
                  requireHeroImage
                  onEnsureId={async () => {
                    try {
                      await refreshToken();
                      const id = await ensureDraft();
                      return id;
                    } catch (err: any) {
                      setError(err.message || "Failed to create draft for uploads.");
                      return null;
                    }
                  }}
                />
              )}
            </Card>

            {canUploadLandDocs && (
              <section className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
                <div className="text-sm font-semibold text-primary">Land Documents</div>
                <div className="text-xs text-secondary">Enterprise-only. PDF or image files.</div>
                {!propertyId && (
                  <div className="rounded-lg input-glass bg-surface px-3 py-2 text-xs text-secondary">
                    Save the listing before uploading documents.
                  </div>
                )}
                <div className="grid gap-3">
                  {LAND_DOC_SLOTS.map((slot) => {
                    const doc = landDocs?.[slot.key];
                    const busy = uploadingSlot === slot.key;
                    return (
                      <div key={slot.key} className="rounded-lg input-glass px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium text-primary">{slot.label}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {doc?.objectPath && (
                              <button
                                type="button"
                                className="text-xs font-semibold text-indigo-600"
                                onClick={async () => {
                                  if (!tenantId) return;
                                  const { signGetMedia } = await import("../services/apiClient");
                                  const map = await signGetMedia([doc.objectPath]);
                                  const url = map[doc.objectPath];
                                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                                }}
                              >
                                View
                              </button>
                            )}
                            {doc?.objectPath && (
                              <button
                                type="button"
                                className="text-xs font-semibold text-rose-600"
                                disabled={busy}
                                onClick={() => removeLandDoc(slot.key)}
                              >
                                Remove
                              </button>
                            )}
                            <label className="inline-flex items-center text-xs font-semibold text-secondary">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                disabled={!propertyId || busy}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  void uploadLandDoc(slot.key, file);
                                  e.currentTarget.value = "";
                                }}
                              />
                              <span className="cursor-pointer rounded-md input-glass px-2 py-1">
                                {busy ? "Uploading..." : doc?.objectPath ? "Replace" : "Upload"}
                              </span>
                            </label>
                          </div>
                        </div>
                        {doc?.objectPath && (
                          <div className="mt-2 text-xs text-secondary">
                            {doc.fileName || doc.objectPath.split("/").pop()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 h-max">
            <div className="rounded-2xl card-glass border border-theme p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">Listing Health</div>
                  <div className="text-xs text-muted">{saveStatusLabel}</div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    canPublish
                      ? "bg-emerald-50 text-emerald-700"
                      : canSubmit
                        ? "bg-sky-50 text-sky-700"
                        : "bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {canPublish
                    ? "Ready to publish"
                    : canSubmit
                      ? "Ready to submit"
                      : `${missingFields.length} required fields missing`}
                </span>
              </div>

              <div className="space-y-2 text-xs text-secondary">
                <div>Intent: {formatIntentLabel(form.intent)}</div>
                <div>Category: {formatCategoryLabel(form.category)}</div>
                <div>Type: {formatTypeLabel(form.propertyType, form.subType)}</div>
                {form.intent === "buy" && form.saleType && (
                  <div>Sale Type: {formatSaleTypeLabel(form.saleType)}</div>
                )}
              </div>

              <div className="rounded-xl card-glass border border-theme bg-surface p-3 text-xs text-secondary space-y-1">
                <div className="font-semibold text-primary">{form.title || "Untitled listing"}</div>
                <div className="text-secondary font-normal">
                  {formatTypeLabel(form.propertyType, form.subType)} -{" "}
                  {form.intent === "buy" ? formatSaleTypeLabel(form.saleType || "new") : "Rent / Lease"}
                </div>
                <div className="text-secondary font-normal">
                  {[form.citySlug, form.locality].filter(Boolean).join(", ") || "Location pending"}
                </div>
                <div className="text-secondary font-normal">
                  {form.intent === "rent"
                    ? form.rentPerMonth
                      ? `${formatINR.format(form.rentPerMonth)} / mo`
                      : "Price on request"
                    : form.totalPrice
                      ? formatINR.format(form.totalPrice)
                      : "Price on request"}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                {effectiveId && (
                  <button
                    onClick={() => act("submit")}
                    disabled={saving || !canSubmit}
                    className="w-full rounded-lg input-glass px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                  >
                    Go to Submit
                  </button>
                )}
                {effectiveId && canModerate && (
                  <button
                    onClick={() => act("publish")}
                    disabled={saving || !canPublish}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Publish
                  </button>
                )}
              </div>

              {missingBySection.length > 0 && (
                <div className="border-t border-theme pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Jump to section
                  </div>
                  <div className="mt-2 space-y-2">
                    {(["Basics", "Location", "Specs", "Pricing", "Contact", "Media"] as const)
                      .map((section) => ({
                        section,
                        count: missingBySection.find((item) => item.section === section)?.count || 0
                      }))
                      .filter((item) => item.count > 0)
                      .map(({ section, count }) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => {
                          const id =
                            section === "Location"
                              ? "section-location"
                              : section === "Pricing"
                                ? "section-pricing"
                                : section === "Contact"
                                  ? "section-contact"
                                  : section === "Media"
                                    ? "section-media"
                                    : section === "Specs"
                                      ? "section-specs"
                                      : "section-basics";
                          const el = document.getElementById(id);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong hover:text-primary"
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="text-muted">{sectionIcon(section)}</span>
                          <span>{section}</span>
                        </span>
                        <span className="text-[11px] text-muted">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialLat={form.geoLat ? Number(form.geoLat) : null}
        initialLng={form.geoLng ? Number(form.geoLng) : null}
        onConfirm={(result) => {
          setField("geoLat", String(result.lat.toFixed(6)));
          setField("geoLng", String(result.lng.toFixed(6)));
          if (result.locality) setField("locality", result.locality);
          if (result.postalCode) setField("pincode", result.postalCode);
          if (result.formattedAddress) setField("addressLine", result.formattedAddress);
        }}
      />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-secondary">
      <span className="text-xs text-muted">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Card({
  id,
  title,
  helper,
  children
}: {
  id?: string;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl card-glass border border-theme p-6 space-y-4">
      <div>
        <div className="text-base font-semibold text-primary">{title}</div>
        {helper && <div className="text-xs text-muted">{helper}</div>}
      </div>
      {children}
    </section>
  );
}




