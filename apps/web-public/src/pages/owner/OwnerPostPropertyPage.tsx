import { useEffect, useMemo, useState } from "react";
import { createOwnerListing, fetchListingConfig, patchOwnerListing, signPutMedia, submitOwnerListing } from "../../services/apiClient";
import { useOwnerAuth } from "../../hooks/useOwnerAuth";
import { OWNER_TENANT_ID } from "../../constants/marketplace";
import { CHANDRAPUR_TALUKAS, DEFAULT_DISTRICT } from "../../constants/maharashtra";
import {
  CATEGORY_OPTIONS,
  COMMERCIAL_PROPERTY_TYPES,
  INTENT_OPTIONS,
  LAND_PROPERTY_TYPES,
  LAND_USE_OPTIONS,
  RESIDENTIAL_PROPERTY_TYPES,
  SALE_TYPE_OPTIONS
} from "../../constants/listingOptions";
import { useNavigate } from "react-router-dom";
import MapPickerModal from "../../components/MapPickerModal";
import { hydrateOwnerSignedUrls } from "../../services/signedMedia";

type FormState = {
  type: string;
  category: string;
  propertyType: string;
  subType: string;
  saleType: string;
  title: string;
  description: string;
  citySlug: string;
  locality: string;
  addressLine: string;
  pincode: string;
  landType: string;
  areaValue: string;
  areaUnit: string;
  facing: string;
  landMouza: string;
  landSurvey: string;
  landWard: string;
  landTaluka: string;
  landDistrict: string;
  landUse: string;
  landNaStatus: string;
  land712Available: boolean;
  landRoadAccess: boolean;
  landWaterSource: string;
  landElectricity: boolean;
  plotLayoutApproved: boolean;
  plotCorner: boolean;
  plotFacing: string;
  geoLat: string;
  geoLng: string;
  bhk: string;
  bathrooms: string;
  carpetAreaSqFt: string;
  builtUpAreaSqFt: string;
  rate: string;
  totalPrice: string;
  rentPerMonth: string;
  deposit: string;
  flatFloor: string;
  flatTotalFloors: string;
  flatFacing: string;
  flatParking: string;
  flatFurnishing: string;
  flatBalconyCount: string;
  flatBuildingAgeYears: string;
  flatLift: boolean;
  flatPowerBackup: boolean;
  flatPossessionStatus: string;
  rentalLeaseTermMonths: string;
  rentalAvailableFrom: string;
  rentalMaintenance: string;
  rentalMaintenanceIncluded: boolean;
  rentalPreferredTenants: string;
  rentalPetsAllowed: boolean;
  landBoundaryWall: boolean;
  landPlotShape: string;
  landFrontageFeet: string;
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactPreferred: string;
};

type ValidationIssue = { path: (string | number)[]; message: string };

type MediaItem = { objectPath: string; signedUrl?: string };

const MAX_GALLERY_ITEMS = 25;
const MAX_VIDEO_ITEMS = 3;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

function isVideoPath(path: string) {
  return path.toLowerCase().endsWith(".mp4");
}

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

function toNumber(value: string) {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function buildGeo(latValue: string, lngValue: string) {
  const lat = toNumber(latValue);
  const lng = toNumber(lngValue);
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  return { lat, lng };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-");
}

export default function OwnerPostPropertyPage() {
  const [listingConfig, setListingConfig] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [hero, setHero] = useState<MediaItem | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [autoTotalPrice, setAutoTotalPrice] = useState(true);
  const isDev = import.meta.env?.DEV;
  const [showAdvancedFlat, setShowAdvancedFlat] = useState(false);
  const [showAdvancedRental, setShowAdvancedRental] = useState(false);
  const [showAdvancedLand, setShowAdvancedLand] = useState(false);
  const [stepErrors, setStepErrors] = useState<{
    type?: string;
    category?: string;
    propertyType?: string;
    saleType?: string;
    title?: string;
    description?: string;
    citySlug?: string;
    locality?: string;
    areaValue?: string;
    areaUnit?: string;
    landUse?: string;
    landMouza?: string;
    landSurvey?: string;
    landTaluka?: string;
    landDistrict?: string;
    bhk?: string;
    bathrooms?: string;
    carpetAreaSqFt?: string;
    rate?: string;
    totalPrice?: string;
    rentPerMonth?: string;
  }>({});
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { me, logout } = useOwnerAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    type: "sale",
    category: "land",
    propertyType: "land",
    subType: "",
    saleType: "new",
    title: "",
    description: "",
    citySlug: "chandrapur",
    locality: "",
    addressLine: "",
    pincode: "",
    landType: "",
    areaValue: "",
    areaUnit: "",
    facing: "",
    landMouza: "",
    landSurvey: "",
    landWard: "",
    landTaluka: "",
    landDistrict: DEFAULT_DISTRICT,
    landUse: "residential",
    landNaStatus: "",
    land712Available: false,
    landRoadAccess: false,
    landWaterSource: "",
    landElectricity: false,
    plotLayoutApproved: false,
    plotCorner: false,
    plotFacing: "",
    geoLat: "",
    geoLng: "",
    bhk: "",
    bathrooms: "",
    carpetAreaSqFt: "",
    builtUpAreaSqFt: "",
    rate: "",
    totalPrice: "",
    rentPerMonth: "",
    deposit: "",
    flatFloor: "",
    flatTotalFloors: "",
    flatFacing: "",
    flatParking: "",
    flatFurnishing: "",
    flatBalconyCount: "",
    flatBuildingAgeYears: "",
    flatLift: false,
    flatPowerBackup: false,
    flatPossessionStatus: "",
    rentalLeaseTermMonths: "",
    rentalAvailableFrom: "",
    rentalMaintenance: "",
    rentalMaintenanceIncluded: false,
    rentalPreferredTenants: "",
    rentalPetsAllowed: false,
    landBoundaryWall: false,
    landPlotShape: "",
    landFrontageFeet: "",
    contactName: "",
    contactPhone: "",
    contactWhatsapp: "",
    contactEmail: "",
    contactPreferred: "call"
  });

  useEffect(() => {
    if (!me) return;
    setForm((prev) => ({
      ...prev,
      contactName: prev.contactName || me.fullName || "",
      contactPhone: prev.contactPhone || me.phoneNumber || "",
      contactEmail: prev.contactEmail || me.email || "",
      contactPreferred:
        prev.contactPreferred || (me.contactPreference === "whatsapp" ? "whatsapp" : "call")
    }));
  }, [me]);

  useEffect(() => {
    async function loadMeta() {
      try {
        const config = await fetchListingConfig(OWNER_TENANT_ID);
        setListingConfig(config);
      } catch {
        setListingConfig(null);
      }
    }
    loadMeta();
  }, []);

  const propertyTypeOptions = useMemo(() => {
    if (form.category === "commercial") return COMMERCIAL_PROPERTY_TYPES;
    if (form.category === "land") return LAND_PROPERTY_TYPES;
    return RESIDENTIAL_PROPERTY_TYPES;
  }, [form.category]);

  const selectedPropertyType = form.subType || form.propertyType;

  useEffect(() => {
    const allowedValues = propertyTypeOptions.map((option) => option.value as string);
    if (!allowedValues.includes(selectedPropertyType)) {
      const next = propertyTypeOptions[0]?.value || "flat";
      const mapped = normalizePropertyType(next);
      setForm((prev) => ({ ...prev, propertyType: mapped.propertyType, subType: mapped.subType }));
    }
  }, [propertyTypeOptions, selectedPropertyType]);

  const isLand = form.propertyType === "land";
  const isPlot = form.propertyType === "plot";
  const isLandCategory = form.category === "land";
  const isResidential = form.category === "residential";
  const isCommercial = form.category === "commercial";
  const landTypes = listingConfig?.landTypes || ["agricultural", "na", "farm", "industrial", "open"];
  const areaUnits = listingConfig?.areaUnits?.[form.propertyType] || ["sqft", "sqm", "acre", "hectare"];

  useEffect(() => {
    if (!form.areaUnit) {
      const fallbackUnit = isLandCategory ? "acre" : "sqft";
      setForm((prev) => ({ ...prev, areaUnit: fallbackUnit }));
    }
  }, [form.areaUnit, isLandCategory]);

  useEffect(() => {
    if (isLand && !form.landDistrict.trim()) {
      setForm((prev) => ({ ...prev, landDistrict: DEFAULT_DISTRICT }));
    }
  }, [isLand, form.landDistrict]);

  useEffect(() => {
    if (isLandCategory && !form.landUse.trim()) {
      setForm((prev) => ({ ...prev, landUse: "residential" }));
    }
  }, [isLandCategory, form.landUse]);

  useEffect(() => {
    if (!autoTotalPrice) return;
    const areaValue = toNumber(form.areaValue);
    const rateValue = toNumber(form.rate);
    if (!areaValue || !rateValue) return;
    const total = Math.round(areaValue * rateValue);
    setForm((prev) => ({ ...prev, totalPrice: String(total) }));
  }, [autoTotalPrice, form.areaValue, form.rate]);

  const calculatedTotal = useMemo(() => {
    const areaValue = toNumber(form.areaValue);
    const rateValue = toNumber(form.rate);
    if (!areaValue || !rateValue) return null;
    return Math.round(areaValue * rateValue);
  }, [form.areaValue, form.rate]);

  const payload = useMemo(() => {
    const saleRate = toNumber(form.rate);
    const pricing =
      form.type === "sale"
        ? {
            totalPrice: toNumber(form.totalPrice),
            rate: saleRate,
            rateUnit: form.areaUnit || undefined,
            pricePerSqFt: form.areaUnit === "sqft" && saleRate ? saleRate : undefined
          }
        : {
            rentPerMonth: toNumber(form.rentPerMonth),
            deposit: toNumber(form.deposit)
          };

    const specs = isResidential
      ? {
          flat: {
            bhk: toNumber(form.bhk),
            bathrooms: toNumber(form.bathrooms),
            carpetAreaSqFt: toNumber(form.carpetAreaSqFt),
            builtUpAreaSqFt: toNumber(form.builtUpAreaSqFt),
            floor: toNumber(form.flatFloor) ?? (form.flatFloor || undefined),
            totalFloors: toNumber(form.flatTotalFloors),
            facing: form.flatFacing || undefined,
            parking: form.flatParking || undefined,
            furnishing: form.flatFurnishing || undefined,
            balconyCount: toNumber(form.flatBalconyCount),
            buildingAgeYears: toNumber(form.flatBuildingAgeYears),
            lift: form.flatLift || undefined,
            powerBackup: form.flatPowerBackup || undefined,
            possessionStatus: form.flatPossessionStatus || undefined
          }
        }
      : isLandCategory
      ? {
          land: {
            landType: form.landUse || undefined,
            facing: form.facing || undefined
          }
        }
      : undefined;

    return {
      mode: "independent",
      type: form.type,
      propertyType: form.propertyType,
      category: form.category || undefined,
      subType: form.subType || undefined,
      saleType: form.type === "sale" ? form.saleType || undefined : undefined,
      landUse: isLandCategory ? form.landUse || undefined : undefined,
      title: form.title,
      description: form.description || undefined,
      brokeragePartnerId: "Chandrapur Real Estate Solutions Pvt Ltd",
      location: {
        citySlug: form.citySlug,
        locality: form.locality,
        addressLine: form.addressLine || undefined,
        pincode: form.pincode || undefined,
        geo: buildGeo(form.geoLat, form.geoLng)
      },
      specs,
      plotInfo:
        isPlot
          ? {
              layoutApproved: form.plotLayoutApproved || undefined,
              cornerPlot: form.plotCorner || undefined,
              facing: form.plotFacing || undefined
            }
          : undefined,
      landRecord:
        isLand
          ? {
              mouza: form.landMouza || undefined,
              surveyOrGatNo: form.landSurvey || undefined,
              wardOrWarg: form.landWard || undefined,
              taluka: form.landTaluka || undefined,
              district: form.landDistrict || undefined,
              landType: form.landType || undefined,
              boundaryWall: form.landBoundaryWall || undefined,
              plotShape: form.landPlotShape || undefined,
              frontageFeet: toNumber(form.landFrontageFeet),
              is712Available: form.land712Available || undefined,
              naStatus: form.landNaStatus || undefined,
              roadAccess: form.landRoadAccess || undefined,
              waterSource: form.landWaterSource || undefined,
              electricity: form.landElectricity || undefined
            }
          : undefined,
      area: {
        value: toNumber(form.areaValue),
        unit: form.areaUnit || undefined
      },
      pricing,
      rental:
        form.type === "rent"
          ? {
              leaseTermMonths: toNumber(form.rentalLeaseTermMonths),
              availableFrom: form.rentalAvailableFrom || undefined,
              maintenance: toNumber(form.rentalMaintenance),
              maintenanceIncluded: form.rentalMaintenanceIncluded || undefined,
              preferredTenants: form.rentalPreferredTenants || undefined,
              petsAllowed: form.rentalPetsAllowed || undefined
            }
          : undefined,
      contact: {
        name: form.contactName || undefined,
        phone: form.contactPhone || undefined,
        whatsapp: form.contactWhatsapp || undefined,
        email: form.contactEmail || undefined,
        preferred: form.contactPreferred || undefined
      }
    };
  }, [form, isCommercial, isLand, isLandCategory, isPlot, isResidential]);

  const descriptionMin = listingConfig?.required?.publish?.descriptionMin || 30;
  const descriptionCount = form.description.trim().length;
  const mediaMin = Math.max(1, listingConfig?.required?.publish?.mediaGalleryMin || 1);
  const heroOk = Boolean(hero?.objectPath);
  const galleryOk = media.length >= mediaMin;
  const photoOk = heroOk && galleryOk;
  const videoCount = media.filter((item) => isVideoPath(item.objectPath)).length;
  const submitChecklist = useMemo(() => {
    const items = [
      { label: "Title added", done: Boolean(form.title.trim()) },
      { label: "Intent selected", done: Boolean(form.type) },
      { label: "Category selected", done: Boolean(form.category) },
      { label: "Location set", done: Boolean(form.citySlug.trim()) && Boolean(form.locality.trim()) },
      {
        label: "Description added",
        done: Boolean(form.description.trim()) && form.description.trim().length >= descriptionMin
      },
      { label: "Contact phone", done: Boolean(form.contactPhone.trim()) },
      { label: "Hero image uploaded", done: heroOk },
      { label: `At least ${mediaMin} gallery item(s)`, done: galleryOk }
    ];

    if (form.type === "sale") {
      items.push({ label: "Pricing set", done: Boolean(form.totalPrice || form.rate) });
      items.push({ label: "Sale type selected", done: Boolean(form.saleType) });
    }
    if (form.type === "rent") {
      items.push({ label: "Monthly rent", done: Boolean(form.rentPerMonth) });
    }
    if (isLandCategory) {
      items.push({ label: "Land use selected", done: Boolean(form.landUse.trim()) });
    }
    if (isLand) {
      items.push({
        label: "Land records (Maharashtra)",
        done:
          Boolean(form.landMouza.trim()) &&
          Boolean(form.landSurvey.trim()) &&
          Boolean(form.landTaluka.trim()) &&
          Boolean(form.landDistrict.trim())
      });
    }
    if (isLandCategory || isCommercial) {
      items.push({ label: "Area details", done: Boolean(form.areaValue) && Boolean(form.areaUnit) });
    }
    if (isResidential) {
      items.push({
        label: "Residential specs",
        done: Boolean(form.bhk) && Boolean(form.bathrooms) && Boolean(form.carpetAreaSqFt)
      });
    }

    const doneCount = items.filter((item) => item.done).length;
    const percent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
    return { items, doneCount, total: items.length, percent };
  }, [
    descriptionMin,
    form,
    isCommercial,
    isLand,
    isLandCategory,
    isResidential,
    hero?.objectPath,
    media.length,
    mediaMin
  ]);

  useEffect(() => {
    if (!isDev) return;
    const photoItem = submitChecklist.items.find((item) => item.label.includes("photo"));
    if (hero?.objectPath && photoItem && !photoItem.done) {
      console.warn("Checklist pending while hero exists", {
        hero: hero?.objectPath || null,
        galleryCount: media.length
      });
    }
  }, [hero?.objectPath, isDev, media.length, submitChecklist.items]);

  useEffect(() => {
    if (!isDev) return;
    if ((error?.includes("hero image") || error?.includes("gallery item")) && photoOk) {
      console.warn("Banner says missing media but photoOk is true", {
        hero: hero?.objectPath || null,
        galleryCount: media.length,
        mediaMin,
        photoOk
      });
    }
  }, [error, hero?.objectPath, isDev, media.length, mediaMin, photoOk]);

  useEffect(() => {
    if ((error?.includes("hero image") || error?.includes("gallery item")) && photoOk) {
      setError(null);
    }
  }, [error, photoOk]);

  const validateStep = (nextStep: number) => {
    const nextErrors: {
      type?: string;
      category?: string;
      propertyType?: string;
      saleType?: string;
      title?: string;
      description?: string;
      citySlug?: string;
      locality?: string;
      areaValue?: string;
      areaUnit?: string;
      landUse?: string;
      landMouza?: string;
      landSurvey?: string;
      landTaluka?: string;
      landDistrict?: string;
      bhk?: string;
      bathrooms?: string;
      carpetAreaSqFt?: string;
      rate?: string;
      totalPrice?: string;
      rentPerMonth?: string;
    } = {};
    if (nextStep === 2) {
      if (!form.type) nextErrors.type = "Required";
      if (!form.category) nextErrors.category = "Required";
      if (!form.propertyType) nextErrors.propertyType = "Required";
      if (form.type === "sale" && !form.saleType) nextErrors.saleType = "Required";
      if (!form.title.trim()) nextErrors.title = "Required";
      if (!form.description.trim() || form.description.trim().length < descriptionMin) nextErrors.description = "Required";
    }
    if (nextStep === 3) {
      if (!form.citySlug.trim()) nextErrors.citySlug = "Required";
      if (!form.locality.trim()) nextErrors.locality = "Required";
    }
    if (nextStep === 4) {
      if ((isLandCategory || isCommercial) && !form.areaValue) nextErrors.areaValue = "Required";
      if ((isLandCategory || isCommercial) && !form.areaUnit) nextErrors.areaUnit = "Required";
      if (isLandCategory && !form.landUse.trim()) nextErrors.landUse = "Required";
      if (isLand && !form.landMouza.trim()) nextErrors.landMouza = "Required";
      if (isLand && !form.landSurvey.trim()) nextErrors.landSurvey = "Required";
      if (isLand && !form.landTaluka.trim()) nextErrors.landTaluka = "Required";
      if (isLand && !form.landDistrict.trim()) nextErrors.landDistrict = "Required";
      if (isResidential && !form.bhk) nextErrors.bhk = "Required";
      if (isResidential && !form.bathrooms) nextErrors.bathrooms = "Required";
      if (isResidential && !form.carpetAreaSqFt) nextErrors.carpetAreaSqFt = "Required";
    }
    if (nextStep === 5) {
      if (form.type === "sale" && !form.totalPrice && !form.rate) {
        nextErrors.rate = "Required";
        nextErrors.totalPrice = "Required";
      }
      if (form.type === "rent" && !form.rentPerMonth) {
        nextErrors.rentPerMonth = "Required";
      }
    }
    setStepErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return "Please fill the required fields to continue.";
    }
    return null;
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const el = document.querySelector('[data-error="true"]') as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  const goNext = () => {
    const nextStep = Math.min(5, step + 1);
    const message = validateStep(nextStep);
    if (message) {
      setError(message);
      scrollToFirstError();
      return;
    }
    setError(null);
    setStepErrors({});
    setStep(nextStep);
  };

  const goBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const ensureDraft = async () => {
    if (draftId) return draftId;
    try {
      const created = await createOwnerListing(OWNER_TENANT_ID, payload);
      setDraftId(created.listingId);
      return created.listingId;
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError("Session expired or access denied. Please login again.");
      } else {
        setError(err.message || "Failed to create draft");
        setIssues(err.issues || []);
      }
      return null;
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError(null);
    setIssues([]);
    try {
      const listingId = draftId || (await createOwnerListing(OWNER_TENANT_ID, payload)).listingId;
      if (!draftId) {
        setDraftId(listingId);
      } else {
        await patchOwnerListing(OWNER_TENANT_ID, listingId, payload);
      }
      navigate(`/owner/my-listings/${listingId}/edit`);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError("Session expired or access denied. Please login again.");
      } else {
        setError(err.message || "Failed to save");
        setIssues(err.issues || []);
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadMedia = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const listingId = await ensureDraft();
    if (!listingId) return;
    setMediaUploading(true);
    setError(null);
    setIssues([]);
    try {
      const existingPaths = media.map((item) => item.objectPath);
      const existingVideoCount = existingPaths.filter(isVideoPath).length;
      const existingTotal = existingPaths.length;
      const selectedFiles = Array.from(files);
      let nextVideoCount = existingVideoCount;
      let nextTotal = existingTotal;
      for (const file of selectedFiles) {
        const isVideo = file.type.startsWith("video/");
        if (isVideo && file.type !== "video/mp4") {
          throw new Error("Only MP4 videos are allowed.");
        }
        if (isVideo && file.size > MAX_VIDEO_BYTES) {
          throw new Error("Each video must be 60MB or less.");
        }
        if (!isVideo && !file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed in the gallery.");
        }
        if (nextTotal + 1 > MAX_GALLERY_ITEMS) {
          throw new Error(`You can upload up to ${MAX_GALLERY_ITEMS} gallery items.`);
        }
        if (isVideo && nextVideoCount + 1 > MAX_VIDEO_ITEMS) {
          throw new Error(`You can upload up to ${MAX_VIDEO_ITEMS} videos.`);
        }
        nextTotal += 1;
        if (isVideo) nextVideoCount += 1;
      }
      const uploads: { objectPath: string; contentType?: string; fileName?: string; kind?: "image" | "video" }[] = [];
      for (const file of selectedFiles) {
        const safeName = sanitizeFilename(file.name || "photo.jpg");
        const objectPath = `tenants/${OWNER_TENANT_ID}/listings/${listingId}/media/gallery-${Date.now()}-${safeName}`;
        const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
        await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        uploads.push({
          objectPath,
          contentType: file.type || undefined,
          fileName: file.name || undefined,
          kind: file.type.startsWith("video/") ? "video" : "image"
        });
      }
      const nextGallery = [...media.map((m) => ({ objectPath: m.objectPath })), ...uploads];
      const payloadMedia: any = { gallery: nextGallery };
      if (hero?.objectPath) {
        payloadMedia.hero = { objectPath: hero.objectPath };
      }
      await patchOwnerListing(OWNER_TENANT_ID, listingId, { media: payloadMedia });
      const signPaths = Array.from(new Set([hero?.objectPath, ...nextGallery.map((item) => item.objectPath)].filter(Boolean))).filter(
        (path): path is string => Boolean(path)
      );
      const hydrated = await hydrateOwnerSignedUrls(signPaths.map((objectPath) => ({ objectPath })));
      const urlMap = new Map(
        hydrated.map((item: { objectPath: string; signedUrl: string }) => [item.objectPath, item.signedUrl])
      );
      const nextMedia = nextGallery.flatMap((item) => {
        const signedUrl = urlMap.get(item.objectPath);
        return signedUrl ? [{ objectPath: item.objectPath, signedUrl }] : [];
      });
      setMedia(nextMedia);
      if (hero?.objectPath) {
        const heroUrl = urlMap.get(hero.objectPath);
        setHero(heroUrl ? { objectPath: hero.objectPath, signedUrl: heroUrl } : hero);
      }
    } catch (err: any) {
      setError(err.message || "Media upload failed");
    } finally {
      setMediaUploading(false);
    }
  };

  const uploadHero = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const listingId = await ensureDraft();
    if (!listingId) return;
    setMediaUploading(true);
    setError(null);
    setIssues([]);
    try {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        throw new Error("Hero must be an image file.");
      }
      const safeName = sanitizeFilename(file.name || "hero.jpg");
      const objectPath = `tenants/${OWNER_TENANT_ID}/listings/${listingId}/media/hero-${Date.now()}-${safeName}`;
      const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
      await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      const nextGallery = [...media.map((m) => ({ objectPath: m.objectPath }))];
      await patchOwnerListing(OWNER_TENANT_ID, listingId, {
        media: { hero: { objectPath }, gallery: nextGallery }
      });
      const signPaths = Array.from(new Set([objectPath, ...nextGallery.map((item) => item.objectPath)])).filter(
        (path): path is string => Boolean(path)
      );
      const hydrated = await hydrateOwnerSignedUrls(signPaths.map((path) => ({ objectPath: path })));
      const urlMap = new Map(
        hydrated.map((item: { objectPath: string; signedUrl: string }) => [item.objectPath, item.signedUrl])
      );
      setHero({ objectPath, signedUrl: urlMap.get(objectPath) });
      const nextMedia = nextGallery.flatMap((item) => {
        const signedUrl = urlMap.get(item.objectPath);
        return signedUrl ? [{ objectPath: item.objectPath, signedUrl }] : [];
      });
      setMedia(nextMedia);
    } catch (err: any) {
      setError(err.message || "Hero upload failed");
    } finally {
      setMediaUploading(false);
    }
  };

  const setHeroFromGallery = async (item: MediaItem) => {
    if (!draftId) return;
    if (isVideoPath(item.objectPath)) {
      setError("Hero must be an image. Pick an image from the gallery.");
      return;
    }
    try {
      await patchOwnerListing(OWNER_TENANT_ID, draftId, { media: { hero: { objectPath: item.objectPath } } });
      setHero(item);
    } catch (err: any) {
      setError(err.message || "Failed to set hero");
    }
  };

  const removeMedia = async (item: MediaItem) => {
    if (!draftId) return;
    try {
      const nextGallery = media.filter((m) => m.objectPath !== item.objectPath);
      const heroNeedsUpdate = hero?.objectPath === item.objectPath;
      const nextHeroPath = heroNeedsUpdate
        ? nextGallery.find((m) => !isVideoPath(m.objectPath))?.objectPath || null
        : hero?.objectPath || null;
      const payloadMedia: any = { gallery: nextGallery.map((m) => ({ objectPath: m.objectPath })) };
      if (heroNeedsUpdate) {
        payloadMedia.hero = nextHeroPath ? { objectPath: nextHeroPath } : null;
      }
      await patchOwnerListing(OWNER_TENANT_ID, draftId, { media: payloadMedia });
      const signPaths = Array.from(new Set([nextHeroPath, ...nextGallery.map((m) => m.objectPath)].filter(Boolean))).filter(
        (path): path is string => Boolean(path)
      );
      const hydrated = await hydrateOwnerSignedUrls(signPaths.map((objectPath) => ({ objectPath })));
      const urlMap = new Map(
        hydrated.map((item: { objectPath: string; signedUrl: string }) => [item.objectPath, item.signedUrl])
      );
      const nextMedia = nextGallery.flatMap((m) => {
        const signedUrl = urlMap.get(m.objectPath);
        return signedUrl ? [{ objectPath: m.objectPath, signedUrl }] : [];
      });
      setMedia(nextMedia);
      if (nextHeroPath) {
        const heroUrl = urlMap.get(nextHeroPath);
        setHero(heroUrl ? { objectPath: nextHeroPath, signedUrl: heroUrl } : { objectPath: nextHeroPath });
      } else {
        setHero(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update media");
    }
  };

  const submitListing = async () => {
    setError(null);
    setIssues([]);
    const listingId = await ensureDraft();
    if (!listingId) return;
    const mediaMin = Math.max(1, listingConfig?.required?.publish?.mediaGalleryMin || 1);
    if (!photoOk) {
      setError(`Add a hero image and at least ${mediaMin} gallery item(s) before submitting.`);
      return;
    }
    setPublishing(true);
    try {
      await patchOwnerListing(OWNER_TENANT_ID, listingId, payload);
      await submitOwnerListing(OWNER_TENANT_ID, listingId);
      navigate(`/owner/my-listings/${listingId}/preview`);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError("Session expired or access denied. Please login again.");
      } else {
        setError(err.message || "Submit failed");
        setIssues(err.issues || []);
      }
    } finally {
      setPublishing(false);
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Post Property</h1>
        <p className="text-sm text-secondary">Create an independent listing in a few steps.</p>
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="font-semibold">Please fix the highlighted fields</div>
          <ul className="mt-2 space-y-1">
            {issues.map((issue, index) => (
              <li key={`${issue.message}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 space-y-2">
          <div>{error}</div>
          {(error.includes("login") || error.includes("access")) && (
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="rounded-md btn-primary px-3 py-1 text-xs font-semibold text-primary"
              >
                Logout
              </button>
              <button
                onClick={() => navigate("/owner/login")}
                className="text-xs font-semibold text-indigo-600"
              >
                Go to login
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => {
              if (n === step) return;
              const message = validateStep(n);
              if (message) {
                setError(message);
                scrollToFirstError();
                return;
              }
              setError(null);
              setStepErrors({});
              setStep(n);
            }}
            className={`rounded-full px-3 py-1 ${step === n ? "bg-indigo-600 text-primary" : "bg-surface border border-theme"}`}
          >
            Step {n}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-primary">Basic</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Intent *">
              <div
                data-error={stepErrors.type ? "true" : undefined}
                className={`flex flex-wrap gap-2 rounded-md ${
                  stepErrors.type ? "border border-rose-500/40 bg-rose-500/10 p-2" : ""
                }`}
              >
                {INTENT_OPTIONS.map((intent) => (
                  <button
                    key={intent.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        type: intent.value === "buy" ? "sale" : "rent"
                      }))
                    }
                    className={`rounded-md border px-3 py-2 text-sm ${
                      (form.type === "sale" ? "buy" : "rent") === intent.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-theme"
                    }`}
                  >
                    {intent.label}
                  </button>
                ))}
              </div>
              {stepErrors.type && <div className="text-xs text-rose-200">Intent is required.</div>}
            </Field>
            <Field label="Category *">
              <div
                data-error={stepErrors.category ? "true" : undefined}
                className={`flex flex-wrap gap-2 rounded-md ${
                  stepErrors.category ? "border border-rose-500/40 bg-rose-500/10 p-2" : ""
                }`}
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: category.value }))}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      form.category === category.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-theme"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              {stepErrors.category && <div className="text-xs text-rose-200">Category is required.</div>}
            </Field>
            <Field label="Property type *">
              <div
                data-error={stepErrors.propertyType ? "true" : undefined}
                className={`flex flex-wrap gap-2 rounded-md ${
                  stepErrors.propertyType ? "border border-rose-500/40 bg-rose-500/10 p-2" : ""
                }`}
              >
                {propertyTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const mapped = normalizePropertyType(option.value);
                      setForm((prev) => ({ ...prev, propertyType: mapped.propertyType, subType: mapped.subType }));
                    }}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      selectedPropertyType === option.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-theme"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {stepErrors.propertyType && <div className="text-xs text-rose-200">Property type is required.</div>}
            </Field>
            {form.type === "sale" && (
              <Field label="Sale type *">
                <div
                  data-error={stepErrors.saleType ? "true" : undefined}
                  className={`flex flex-wrap gap-2 rounded-md ${
                    stepErrors.saleType ? "border border-rose-500/40 bg-rose-500/10 p-2" : ""
                  }`}
                >
                  {SALE_TYPE_OPTIONS.map((saleType) => (
                    <button
                      key={saleType.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, saleType: saleType.value }))}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        form.saleType === saleType.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-theme"
                      }`}
                    >
                      {saleType.label}
                    </button>
                  ))}
                </div>
                {stepErrors.saleType && <div className="text-xs text-rose-200">Sale type is required.</div>}
              </Field>
            )}
            <Field label="Title *">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                data-error={stepErrors.title ? "true" : undefined}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  stepErrors.title ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                }`}
              />
              {stepErrors.title && <div className="text-xs text-rose-200">Title is required.</div>}
            </Field>
            <Field label={`Description * (min ${descriptionMin} chars)`}>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                data-error={stepErrors.description ? "true" : undefined}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  stepErrors.description ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                }`}
                rows={3}
              />
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{descriptionCount} / {descriptionMin}</span>
                {stepErrors.description && <span className="text-rose-200">Description is required.</span>}
              </div>
            </Field>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-primary">Location</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City *">
              <input
                value={form.citySlug}
                onChange={(e) => setForm((prev) => ({ ...prev, citySlug: e.target.value }))}
                data-error={stepErrors.citySlug ? "true" : undefined}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  stepErrors.citySlug ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                }`}
              />
              {stepErrors.citySlug && <div className="text-xs text-rose-200">City is required.</div>}
            </Field>
            <Field label="Locality *">
              <input
                value={form.locality}
                onChange={(e) => setForm((prev) => ({ ...prev, locality: e.target.value }))}
                data-error={stepErrors.locality ? "true" : undefined}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  stepErrors.locality ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                }`}
              />
              {stepErrors.locality && <div className="text-xs text-rose-200">Locality is required.</div>}
            </Field>
            <Field label="Address (optional)">
              <input
                value={form.addressLine}
                onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                className="w-full rounded-md input-glass px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Pincode (optional)">
              <input
                value={form.pincode}
                onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))}
                className="w-full rounded-md input-glass px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Latitude">
              <input
                value={form.geoLat}
                readOnly
                className="w-full rounded-md input-glass bg-surface px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Longitude">
              <input
                value={form.geoLng}
                readOnly
                className="w-full rounded-md input-glass bg-surface px-3 py-2 text-sm"
              />
            </Field>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                className="rounded-md input-glass px-4 py-2 text-sm font-semibold text-secondary"
              >
                Pick on map
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    geoLat: "",
                    geoLng: ""
                  }))
                }
                className="rounded-md input-glass px-4 py-2 text-sm font-semibold text-secondary"
              >
                Clear location
              </button>
              {(form.geoLat || form.geoLng) && (
                <div className="text-xs text-secondary">
                  Pinned: {form.geoLat || "?"}, {form.geoLng || "?"}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-primary">Details</div>
          {isLandCategory && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Land use *">
                <select
                  value={form.landUse}
                  onChange={(e) => setForm((prev) => ({ ...prev, landUse: e.target.value }))}
                  data-error={stepErrors.landUse ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.landUse ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                >
                  <option value="">Select</option>
                  {LAND_USE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {stepErrors.landUse && <div className="text-xs text-rose-200">Land use is required.</div>}
              </Field>
              <Field label="Area *">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.areaValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaValue: e.target.value }))}
                    data-error={stepErrors.areaValue ? "true" : undefined}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      stepErrors.areaValue ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                    }`}
                    placeholder="Value"
                  />
                  <select
                    value={form.areaUnit}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaUnit: e.target.value }))}
                    data-error={stepErrors.areaUnit ? "true" : undefined}
                    className={`w-36 rounded-md border px-3 py-2 text-sm ${
                      stepErrors.areaUnit ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                    }`}
                  >
                    {areaUnits.map((unit: string) => (
                      <option key={unit} value={unit}>
                        {unit === "sqft"
                          ? "Sq. Ft"
                          : unit === "sqm"
                          ? "Sq. Meter"
                          : unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {stepErrors.areaValue && <div className="text-xs text-rose-200">Area value is required.</div>}
                {stepErrors.areaUnit && <div className="text-xs text-rose-200">Area unit is required.</div>}
              </Field>
              <Field label="Facing (optional)">
                <input
                  value={form.facing}
                  onChange={(e) => setForm((prev) => ({ ...prev, facing: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Land type (optional)">
                <select
                  value={form.landType}
                  onChange={(e) => setForm((prev) => ({ ...prev, landType: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="">Select</option>
                  {landTypes.map((type: string) => (
                    <option key={type} value={type}>
                      {type === "na"
                        ? "NA land"
                        : type === "farm"
                        ? "Farm land"
                        : type === "open"
                        ? "Open land"
                        : type.charAt(0).toUpperCase() + type.slice(1) + " land"}
                    </option>
                  ))}
                </select>
              </Field>
              {isLand && (
                <>
                  <div className="sm:col-span-2 rounded-lg input-glass bg-surface px-3 py-2 text-xs text-secondary">
                    Land Records (Maharashtra) - Required to publish land listings.
                  </div>
                  <Field label="Mouza *">
                    <input
                      value={form.landMouza}
                      onChange={(e) => setForm((prev) => ({ ...prev, landMouza: e.target.value }))}
                      data-error={stepErrors.landMouza ? "true" : undefined}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        stepErrors.landMouza ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                      }`}
                    />
                    {stepErrors.landMouza && <div className="text-xs text-rose-200">Mouza is required.</div>}
                  </Field>
                  <Field label="Survey / Gat No *">
                    <input
                      value={form.landSurvey}
                      onChange={(e) => setForm((prev) => ({ ...prev, landSurvey: e.target.value }))}
                      data-error={stepErrors.landSurvey ? "true" : undefined}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        stepErrors.landSurvey ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                      }`}
                    />
                    {stepErrors.landSurvey && <div className="text-xs text-rose-200">Survey / Gat No is required.</div>}
                  </Field>
                  <Field label="Warg / Ward (optional)">
                    <input
                      value={form.landWard}
                      onChange={(e) => setForm((prev) => ({ ...prev, landWard: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Tehsil (Taluka) *">
                    <input
                      list="chandrapur-taluka-list"
                      value={form.landTaluka}
                      onChange={(e) => setForm((prev) => ({ ...prev, landTaluka: e.target.value }))}
                      data-error={stepErrors.landTaluka ? "true" : undefined}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        stepErrors.landTaluka ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                      }`}
                      placeholder="Select or type"
                    />
                    {stepErrors.landTaluka && <div className="text-xs text-rose-200">Tehsil (Taluka) is required.</div>}
                  </Field>
                  <Field label="District *">
                    <input
                      value={form.landDistrict}
                      onChange={(e) => setForm((prev) => ({ ...prev, landDistrict: e.target.value }))}
                      data-error={stepErrors.landDistrict ? "true" : undefined}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        stepErrors.landDistrict ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                      }`}
                    />
                    {stepErrors.landDistrict && <div className="text-xs text-rose-200">District is required.</div>}
                  </Field>
                  <datalist id="chandrapur-taluka-list">
                    {CHANDRAPUR_TALUKAS.map((taluka) => (
                      <option key={taluka} value={taluka} />
                    ))}
                  </datalist>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedLand((prev) => !prev)}
                      className="text-xs font-semibold text-indigo-600"
                    >
                      {showAdvancedLand ? "Hide advanced details" : "Advanced details (optional)"}
                    </button>
                  </div>
                  {showAdvancedLand && (
                    <>
                      <Field label="NA status (optional)">
                        <select
                          value={form.landNaStatus}
                          onChange={(e) => setForm((prev) => ({ ...prev, landNaStatus: e.target.value }))}
                          className="w-full rounded-md input-glass px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="agricultural">Agricultural</option>
                          <option value="applied">Applied</option>
                          <option value="approved">Approved</option>
                        </select>
                      </Field>
                      <label className="flex items-center gap-2 text-sm text-secondary">
                        <input
                          type="checkbox"
                          checked={form.land712Available}
                          onChange={(e) => setForm((prev) => ({ ...prev, land712Available: e.target.checked }))}
                        />
                        7/12 available
                      </label>
                      <label className="flex items-center gap-2 text-sm text-secondary">
                        <input
                          type="checkbox"
                          checked={form.landRoadAccess}
                          onChange={(e) => setForm((prev) => ({ ...prev, landRoadAccess: e.target.checked }))}
                        />
                        Road access
                      </label>
                      <Field label="Water source (optional)">
                        <select
                          value={form.landWaterSource}
                          onChange={(e) => setForm((prev) => ({ ...prev, landWaterSource: e.target.value }))}
                          className="w-full rounded-md input-glass px-3 py-2 text-sm"
                        >
                          <option value="">Select</option>
                          <option value="none">None</option>
                          <option value="well">Well</option>
                          <option value="borewell">Borewell</option>
                          <option value="canal">Canal</option>
                        </select>
                      </Field>
                      <label className="flex items-center gap-2 text-sm text-secondary">
                        <input
                          type="checkbox"
                          checked={form.landElectricity}
                          onChange={(e) => setForm((prev) => ({ ...prev, landElectricity: e.target.checked }))}
                        />
                        Electricity available
                      </label>
                      <label className="flex items-center gap-2 text-sm text-secondary">
                        <input
                          type="checkbox"
                          checked={form.landBoundaryWall}
                          onChange={(e) => setForm((prev) => ({ ...prev, landBoundaryWall: e.target.checked }))}
                        />
                        Boundary wall
                      </label>
                      <Field label="Plot shape (optional)">
                        <input
                          value={form.landPlotShape}
                          onChange={(e) => setForm((prev) => ({ ...prev, landPlotShape: e.target.value }))}
                          className="w-full rounded-md input-glass px-3 py-2 text-sm"
                          placeholder="Regular / Irregular"
                        />
                      </Field>
                      <Field label="Frontage (feet)">
                        <input
                          type="number"
                          value={form.landFrontageFeet}
                          onChange={(e) => setForm((prev) => ({ ...prev, landFrontageFeet: e.target.value }))}
                          className="w-full rounded-md input-glass px-3 py-2 text-sm"
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              {isPlot && (
                <>
                  <Field label="Layout approved (optional)">
                    <select
                      value={form.plotLayoutApproved ? "yes" : ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, plotLayoutApproved: e.target.value === "yes" }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                  <Field label="Corner plot (optional)">
                    <select
                      value={form.plotCorner ? "yes" : ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, plotCorner: e.target.value === "yes" }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                  <Field label="Facing (optional)">
                    <input
                      value={form.plotFacing}
                      onChange={(e) => setForm((prev) => ({ ...prev, plotFacing: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                </>
              )}
            </div>
          )}
          {isCommercial && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Area *">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={form.areaValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaValue: e.target.value }))}
                    data-error={stepErrors.areaValue ? "true" : undefined}
                    className={`w-full rounded-md border px-3 py-2 text-sm ${
                      stepErrors.areaValue ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                    }`}
                    placeholder="Value"
                  />
                  <select
                    value={form.areaUnit}
                    onChange={(e) => setForm((prev) => ({ ...prev, areaUnit: e.target.value }))}
                    data-error={stepErrors.areaUnit ? "true" : undefined}
                    className={`w-36 rounded-md border px-3 py-2 text-sm ${
                      stepErrors.areaUnit ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                    }`}
                  >
                    {areaUnits.map((unit: string) => (
                      <option key={unit} value={unit}>
                        {unit === "sqft"
                          ? "Sq. Ft"
                          : unit === "sqm"
                          ? "Sq. Meter"
                          : unit.charAt(0).toUpperCase() + unit.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {stepErrors.areaValue && <div className="text-xs text-rose-200">Area value is required.</div>}
                {stepErrors.areaUnit && <div className="text-xs text-rose-200">Area unit is required.</div>}
              </Field>
            </div>
          )}
          {isResidential && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="BHK *">
                <input
                  type="number"
                  value={form.bhk}
                  onChange={(e) => setForm((prev) => ({ ...prev, bhk: e.target.value }))}
                  data-error={stepErrors.bhk ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.bhk ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.bhk && <div className="text-xs text-rose-200">BHK is required.</div>}
              </Field>
              <Field label="Bathrooms *">
                <input
                  type="number"
                  value={form.bathrooms}
                  onChange={(e) => setForm((prev) => ({ ...prev, bathrooms: e.target.value }))}
                  data-error={stepErrors.bathrooms ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.bathrooms ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.bathrooms && <div className="text-xs text-rose-200">Bathrooms are required.</div>}
              </Field>
              <Field label="Carpet area (sq.ft) *">
                <input
                  type="number"
                  value={form.carpetAreaSqFt}
                  onChange={(e) => setForm((prev) => ({ ...prev, carpetAreaSqFt: e.target.value }))}
                  data-error={stepErrors.carpetAreaSqFt ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.carpetAreaSqFt ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.carpetAreaSqFt && <div className="text-xs text-rose-200">Carpet area is required.</div>}
              </Field>
              <Field label="Built-up area (sq.ft) (optional)">
                <input
                  type="number"
                  value={form.builtUpAreaSqFt}
                  onChange={(e) => setForm((prev) => ({ ...prev, builtUpAreaSqFt: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              {form.propertyType === "flat" && (
                <>
                  <Field label="Floor (optional)">
                    <input
                      type="number"
                      value={form.flatFloor}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatFloor: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Total floors (optional)">
                    <input
                      type="number"
                      value={form.flatTotalFloors}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatTotalFloors: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                </>
              )}
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFlat((prev) => !prev)}
                  className="text-xs font-semibold text-indigo-600"
                >
                  {showAdvancedFlat ? "Hide advanced details" : "Advanced details (optional)"}
                </button>
              </div>
              {showAdvancedFlat && (
                <>
                  <Field label="Facing (optional)">
                    <input
                      value={form.flatFacing}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatFacing: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Parking (optional)">
                    <input
                      value={form.flatParking}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatParking: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Furnishing (optional)">
                    <input
                      value={form.flatFurnishing}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatFurnishing: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Balcony count (optional)">
                    <input
                      type="number"
                      value={form.flatBalconyCount}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatBalconyCount: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Building age (years)">
                    <input
                      type="number"
                      value={form.flatBuildingAgeYears}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatBuildingAgeYears: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Possession status (optional)">
                    <select
                      value={form.flatPossessionStatus}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatPossessionStatus: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="ready">Ready</option>
                      <option value="under_construction">Under construction</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={form.flatLift}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatLift: e.target.checked }))}
                    />
                    Lift available
                  </label>
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={form.flatPowerBackup}
                      onChange={(e) => setForm((prev) => ({ ...prev, flatPowerBackup: e.target.checked }))}
                    />
                    Power backup
                  </label>
                </>
              )}
            </div>
          )}
        </section>
      )}
      {step === 4 && (
        <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold text-primary">Pricing</div>
          {form.type === "sale" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={`Rate * (${
                  form.areaUnit === "sqft"
                    ? "per Sq. Ft"
                    : form.areaUnit === "sqm"
                    ? "per Sq. Meter"
                    : `per ${form.areaUnit}`
                })`}
              >
                <input
                  type="number"
                  value={form.rate}
                  onChange={(e) => setForm((prev) => ({ ...prev, rate: e.target.value }))}
                  data-error={stepErrors.rate ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.rate ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.rate && <div className="text-xs text-rose-200">Rate is required.</div>}
              </Field>
              <Field label="Total price *">
                <input
                  type="number"
                  value={form.totalPrice}
                  onChange={(e) => {
                    setAutoTotalPrice(false);
                    setForm((prev) => ({ ...prev, totalPrice: e.target.value }));
                  }}
                  data-error={stepErrors.totalPrice ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.totalPrice ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.totalPrice && <div className="text-xs text-rose-200">Total price is required.</div>}
              </Field>
              <div className="text-xs text-muted sm:col-span-2">
                Total price auto-calculates from Area x Rate. Edit total to override.
              </div>
              {calculatedTotal !== null && (
                <div className="text-xs text-muted sm:col-span-2">
                  Calculated: Area ({form.areaValue} {form.areaUnit}) x Rate (INR {formatNumber(Number(form.rate))}/{form.areaUnit}) = INR{" "}
                  {formatNumber(calculatedTotal)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rent per month *">
                <input
                  type="number"
                  value={form.rentPerMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, rentPerMonth: e.target.value }))}
                  data-error={stepErrors.rentPerMonth ? "true" : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    stepErrors.rentPerMonth ? "border-rose-500/40 bg-rose-500/10" : "border-theme"
                  }`}
                />
                {stepErrors.rentPerMonth && <div className="text-xs text-rose-200">Monthly rent is required.</div>}
              </Field>
              <Field label="Deposit (optional)">
                <input
                  type="number"
                  value={form.deposit}
                  onChange={(e) => setForm((prev) => ({ ...prev, deposit: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedRental((prev) => !prev)}
                  className="text-xs font-semibold text-indigo-600"
                >
                  {showAdvancedRental ? "Hide advanced details" : "Advanced details (optional)"}
                </button>
              </div>
              {showAdvancedRental && (
                <>
                  <Field label="Lease term months (optional)">
                    <input
                      type="number"
                      value={form.rentalLeaseTermMonths}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalLeaseTermMonths: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="11"
                    />
                  </Field>
                  <Field label="Available from (optional)">
                    <input
                      type="date"
                      value={form.rentalAvailableFrom}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalAvailableFrom: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Maintenance (optional)">
                    <input
                      type="number"
                      value={form.rentalMaintenance}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalMaintenance: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={form.rentalMaintenanceIncluded}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalMaintenanceIncluded: e.target.checked }))}
                    />
                    Maintenance included
                  </label>
                  <Field label="Preferred tenants (optional)">
                    <select
                      value={form.rentalPreferredTenants}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalPreferredTenants: e.target.value }))}
                      className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="family">Family</option>
                      <option value="bachelor">Bachelor</option>
                      <option value="any">Any</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={form.rentalPetsAllowed}
                      onChange={(e) => setForm((prev) => ({ ...prev, rentalPetsAllowed: e.target.checked }))}
                    />
                    Pets allowed
                  </label>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-primary">Submission readiness</div>
              <div className="text-xs font-semibold text-secondary">{submitChecklist.percent}%</div>
            </div>
            <div className="h-2 w-full rounded-full bg-surface">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${submitChecklist.percent}%` }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {submitChecklist.items.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                    item.done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-theme text-secondary"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.done ? "Done" : "Pending"}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Contact</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact name">
                <input
                  value={form.contactName}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Phone *">
                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="WhatsApp (optional)">
                <input
                  value={form.contactWhatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactWhatsapp: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Email (optional)">
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Preferred contact">
                <select
                  value={form.contactPreferred}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactPreferred: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Both</option>
                </select>
              </Field>
            </div>
          </section>
          <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Hero Image</div>
            {hero?.signedUrl ? (
              <div className="overflow-hidden rounded-lg input-glass">
                <img src={hero.signedUrl} alt="Hero" className="h-48 w-full object-cover" />
              </div>
            ) : (
              <div className="text-sm text-muted">No hero selected yet.</div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
              <label className="inline-flex items-center gap-2">
                <span className="text-xs font-semibold text-secondary">Upload hero</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadHero(e.target.files)}
                  disabled={mediaUploading}
                />
              </label>
              {hero?.objectPath && (
                <div className="text-xs text-muted truncate">Current: {hero.objectPath.split("/").pop()}</div>
              )}
            </div>
            <div className="text-xs text-muted">Hero image is required to submit.</div>
          </section>
          <section className="rounded-xl border bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Media</div>
            {!draftId && (
              <div className="text-xs text-muted">Uploading media will create a draft listing.</div>
            )}
            <div className="text-xs text-muted">
              Gallery supports photos and MP4 videos. Max {MAX_GALLERY_ITEMS} items and {MAX_VIDEO_ITEMS} videos.
            </div>
            <div className="text-xs text-muted">Current: {media.length} items, {videoCount} videos.</div>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4"
              onChange={(e) => uploadMedia(e.target.files)}
              disabled={mediaUploading}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {media.map((item) => (
                <div key={item.objectPath} className="rounded-lg input-glass overflow-hidden">
                  {item.signedUrl ? (
                    isVideoPath(item.objectPath) ? (
                      <video
                        className="h-32 w-full object-cover"
                        src={item.signedUrl}
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img src={item.signedUrl} alt={item.objectPath} className="h-32 w-full object-cover" />
                    )
                  ) : (
                    <div className="h-32 bg-surface" />
                  )}
                  <div className="p-2 space-y-2">
                    <div className="text-[11px] text-muted truncate">{item.objectPath.split("/").pop()}</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHeroFromGallery(item)}
                        disabled={isVideoPath(item.objectPath)}
                        className="rounded-md input-glass px-2 py-1 text-[11px] font-semibold text-secondary disabled:opacity-50"
                      >
                        Set as Hero
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMedia(item)}
                        className="rounded-md border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {media.length === 0 && <div className="text-sm text-muted">No media uploaded yet.</div>}
            </div>
          </section>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {step > 1 && (
          <button
            onClick={goBack}
            disabled={saving}
            className="rounded-md input-glass px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-70"
          >
            Back
          </button>
        )}
        {step < 5 && (
          <button
            onClick={goNext}
            disabled={saving}
            className="rounded-md input-glass px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-70"
          >
            Next
          </button>
        )}
        <button
          onClick={saveDraft}
          disabled={saving}
          className="rounded-md btn-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-70"
        >
          Save Draft
        </button>
        {step === 5 && (
          <>
            <button
              onClick={submitListing}
              disabled={saving || publishing}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-70"
            >
              {publishing ? "Submitting..." : "Submit Listing"}
            </button>
          </>
        )}
      </div>
      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        initialLat={toNumber(form.geoLat)}
        initialLng={toNumber(form.geoLng)}
        onConfirm={(result) => {
          setForm((prev) => ({
            ...prev,
            geoLat: String(result.lat),
            geoLng: String(result.lng),
            addressLine: prev.addressLine || result.formattedAddress || "",
            locality: prev.locality || result.locality || prev.locality,
            pincode: prev.pincode || result.postalCode || ""
          }));
          setIsMapOpen(false);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-secondary">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}






