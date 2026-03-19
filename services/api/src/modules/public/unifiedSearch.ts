import { firestore } from "../../config/firebase";
import { slugify } from "../../utils/slugify";
import { interpretPublicQuery, type QueryInterpretation } from "./query-interpreter.service";

type UnifiedSearchInput = {
  citySlug?: string;
  type?: "sale" | "rent" | "lease";
  propertyType?: string;
  bhk?: number;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
  resultType?: "all" | "property" | "project_unit";
  availability?: "available" | "blocked" | "sold";
  limit?: number;
};

export type UnifiedResultItem = {
  resultType: "property" | "project_unit";
  id: string;
  propertyId?: string;
  title: string;
  dealIntent: "sale" | "rent" | "lease";
  propertyType?: string;
  citySlug?: string;
  locality?: string;
  priceLabel?: string | null;
  priceValue?: number | null;
  priceOnRequest?: boolean;
  areaLabel?: string | null;
  areaValue?: number | null;
  areaUnit?: string | null;
  bhk?: number | null;
  facing?: string | null;
  heroObjectPath?: string | null;
  badges?: string[];
  updatedAt?: string | null;
  projectId?: string;
  projectSlug?: string;
  projectName?: string;
  unitId?: string;
  unitNumber?: string;
  availability?: "available" | "blocked" | "sold";
  tower?: string | null;
  floor?: number | null;
};

export type UnifiedSearchResult = {
  items: UnifiedResultItem[];
  interpretedQuery?: QueryInterpretation | null;
};

function normalizeText(value?: string | null) {
  return (value || "").toString().trim().toLowerCase();
}

function formatPriceLabel(value: number | null | undefined) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function resolvePublicPropertyCitySlug(item: any) {
  const raw = item?.citySlug || item?.location?.citySlug || item?.location?.city || null;
  return raw ? slugify(String(raw), 80) : null;
}

function resolvePublicPropertyDealIntent(item: any): "sale" | "rent" | "lease" {
  const raw = normalizeText(item?.dealIntent || item?.type || "");
  if (raw === "rent" || raw === "lease") return raw;
  return "sale";
}

function resolvePropertyPrice(item: any) {
  if (item?.saleDetails?.priceOnRequest || item?.priceOnRequest) return { value: null, onRequest: true };
  const value =
    typeof item?.saleDetails?.totalPrice === "number"
      ? item.saleDetails.totalPrice
      : typeof item?.saleDetails?.ratePerSqFt === "number"
        ? item.saleDetails.ratePerSqFt
        : typeof item?.rentalDetails?.pricing?.monthlyRent === "number"
          ? item.rentalDetails.pricing.monthlyRent
          : typeof item?.rentalDetails?.pricing?.rentPerBed === "number"
            ? item.rentalDetails.pricing.rentPerBed
            : typeof item?.price?.amount === "number"
              ? item.price.amount
              : typeof item?.pricing?.totalPrice === "number"
                ? item.pricing.totalPrice
                : typeof item?.pricing?.rentPerMonth === "number"
                  ? item.pricing.rentPerMonth
                  : null;
  return { value, onRequest: value == null };
}

function resolveUnitPrice(item: any) {
  const value =
    typeof item?.priceNumber === "number"
      ? item.priceNumber
      : typeof item?.pricing?.basePrice === "number"
        ? item.pricing.basePrice
        : typeof item?.pricing?.allInclusivePrice === "number"
          ? item.pricing.allInclusivePrice
          : typeof item?.price === "number"
            ? item.price
            : null;
  return { value, onRequest: value == null };
}

function resolvePropertyHero(item: any) {
  const explicitHero = item?.heroObjectPath;
  if (explicitHero) return explicitHero;
  if (item?.coverMediaId && Array.isArray(item?.mediaItems)) {
    const match = item.mediaItems.find((m: any) => m?.id === item.coverMediaId);
    if (match?.url) return match.url;
  }
  const hero = item?.media?.hero?.objectPath;
  if (hero) return hero;
  const gallery = item?.media?.gallery || [];
  const firstGallery = gallery.find((g: any) => g?.objectPath)?.objectPath;
  return firstGallery || null;
}

function resolveUnitHero(unit: any, project: any) {
  const projectCover = project?.coverObjectPath || project?.media?.cover?.objectPath;
  if (projectCover) return projectCover;
  const floorPlan = unit?.media?.floorPlan?.objectPath;
  return floorPlan || null;
}

function resolveAreaLabel(area?: { value?: number; unit?: string }) {
  if (!area?.value) return null;
  return `${area.value} ${area.unit || ""}`.trim();
}

function resolvePropertyArea(item: any) {
  const areaValue =
    item?.area?.value ??
    item?.specs?.land?.plotAreaSqFt ??
    item?.specs?.commercial?.carpetSqFt ??
    item?.specs?.commercial?.builtUpSqFt ??
    item?.specs?.commercial?.saleableSqFt ??
    item?.specs?.flat?.carpetAreaSqFt ??
    item?.specs?.flat?.builtUpAreaSqFt ??
    item?.specs?.house?.carpetAreaSqFt ??
    item?.specs?.house?.builtUpAreaSqFt ??
    null;
  const areaUnit = item?.area?.unit ?? (typeof areaValue === "number" ? "sqft" : null);
  const areaLabel =
    item?.area?.value != null
      ? resolveAreaLabel(item.area)
      : typeof areaValue === "number"
        ? `${areaValue} ${areaUnit || ""}`.trim()
        : null;
  return { areaLabel, areaValue, areaUnit };
}

function resolveUnitAreaLabel(unit: any) {
  const areaSqFt = unit?.areaSqFtNumber ?? unit?.area?.areaSqFt ?? unit?.areaSqFt;
  if (typeof areaSqFt === "number") return `${areaSqFt} sqft`;
  return null;
}

function resolveUnitPropertyType(unit: any, project: any) {
  const text = normalizeText(unit?.type || "");
  if (text.includes("plot") || text.includes("land")) return "plot";
  if (project?.type === "plot") return "plot";
  if (project?.type === "commercial") return "shop";
  return "flat";
}

function resolveUpdatedAt(value?: any) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return null;
}

function matchesText(q: string, ...parts: Array<string | null | undefined>) {
  if (!q) return true;
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function matchesPrice(value: number | null, minPrice?: number, maxPrice?: number) {
  if (minPrice != null && (value == null || value < minPrice)) return false;
  if (maxPrice != null && (value == null || value > maxPrice)) return false;
  return true;
}

export async function unifiedPublicSearch(input: UnifiedSearchInput) {
  const limit = Math.min(input.limit ?? 20, 50);
  const resultType = input.resultType ?? "all";
  const interpretedQuery = input.q ? interpretPublicQuery(input.q) : null;
  const effectiveCitySlug = input.citySlug || interpretedQuery?.filters.citySlug || undefined;
  const effectiveType = input.type || interpretedQuery?.filters.type || undefined;
  const effectivePropertyType = input.propertyType || interpretedQuery?.filters.propertyType || undefined;
  const effectiveBhk = input.bhk ?? interpretedQuery?.filters.bhk ?? undefined;
  const effectiveMinPrice = input.minPrice ?? interpretedQuery?.filters.minPrice ?? undefined;
  const effectiveMaxPrice = input.maxPrice ?? interpretedQuery?.filters.maxPrice ?? undefined;
  const q = normalizeText(interpretedQuery?.residualText || input.q);

  const results: UnifiedResultItem[] = [];

  if (resultType === "all" || resultType === "property") {
    let ref: FirebaseFirestore.Query = firestore.collection("publicProperties");
    if (effectiveType) ref = ref.where("dealIntent", "==", effectiveType);
    if (effectivePropertyType) ref = ref.where("propertyType", "==", effectivePropertyType);
    const snap = await ref.limit(effectiveCitySlug ? limit * 6 : limit * 2).get();
    snap.docs.forEach((doc) => {
      const item = doc.data() as any;
      const title = item?.title || item?.name || item?.headline || "Property";
      const citySlug = resolvePublicPropertyCitySlug(item);
      const locality = item?.locality || item?.location?.locality || null;
      const bhk = item?.specs?.flat?.bhk ?? item?.specs?.house?.bhk ?? null;
      const facing = item?.specs?.land?.facing || item?.plotInfo?.facing || null;
      const { value, onRequest } = resolvePropertyPrice(item);
      const { areaLabel, areaValue, areaUnit } = resolvePropertyArea(item);

      if (effectiveCitySlug && citySlug !== effectiveCitySlug) return;
      if (effectiveBhk && bhk !== effectiveBhk) return;
      if (!matchesText(q, title, locality, citySlug)) return;
      if (!matchesPrice(value, effectiveMinPrice, effectiveMaxPrice)) return;

      results.push({
        resultType: "property",
        id: doc.id,
        propertyId: doc.id,
        title,
        dealIntent: resolvePublicPropertyDealIntent(item),
        propertyType: item?.propertyType,
        citySlug: citySlug || undefined,
        locality: locality || undefined,
        priceValue: value,
        priceLabel: formatPriceLabel(value),
        priceOnRequest: onRequest,
        areaLabel,
        areaValue,
        areaUnit,
        bhk,
        facing,
        heroObjectPath: resolvePropertyHero(item),
        badges: ["Independent"],
        updatedAt: resolveUpdatedAt(item?.updatedAt)
      });
    });
  }

  if (resultType === "all" || resultType === "project_unit") {
    if (!effectiveType || effectiveType === "sale") {
      let ref: FirebaseFirestore.Query = firestore.collection("publicProjectUnits");
      if (effectiveCitySlug) ref = ref.where("citySlug", "==", effectiveCitySlug);
      if (effectiveBhk) ref = ref.where("bhk", "==", effectiveBhk);
      if (input.availability) ref = ref.where("availability", "==", input.availability);
      const snap = await ref.limit(limit * 2).get();
      const units = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as any[];
      const projectIds = Array.from(new Set(units.map((u) => u.projectId).filter(Boolean)));
      const projectDocs = await Promise.all(
        projectIds.map((id) => firestore.collection("publicProjects").doc(id).get())
      );
      const projectMap = new Map<string, any>();
      projectDocs.forEach((doc) => {
        if (doc.exists) projectMap.set(doc.id, doc.data());
      });

      units.forEach((unit: any) => {
        const project = projectMap.get(unit.projectId) || {};
        const title = unit.configurationLabel || unit.type || "Unit";
        const projectName = project?.name || "Project";
        const citySlug = unit.citySlug || project?.citySlug || project?.location?.citySlug || null;
        const locality = project?.location?.area || project?.location?.city || null;
        const bhk = typeof unit.bhk === "number" ? unit.bhk : null;
        const { value, onRequest } = resolveUnitPrice(unit);

        if (effectivePropertyType) {
          const unitPropertyType = resolveUnitPropertyType(unit, project);
          if (normalizeText(unitPropertyType) !== normalizeText(effectivePropertyType)) return;
        }
        if (!matchesText(q, title, projectName, unit.unitNumber, locality, citySlug)) return;
        if (!matchesPrice(value, effectiveMinPrice, effectiveMaxPrice)) return;

        results.push({
          resultType: "project_unit",
          id: unit.id,
          title,
          dealIntent: "sale",
          propertyType: resolveUnitPropertyType(unit, project),
          citySlug: citySlug || undefined,
          locality: locality || undefined,
          priceValue: value,
          priceLabel: formatPriceLabel(value),
          priceOnRequest: onRequest,
          areaLabel: resolveUnitAreaLabel(unit),
          areaValue: unit?.areaSqFtNumber ?? unit?.area?.areaSqFt ?? unit?.areaSqFt ?? null,
          areaUnit: "sqft",
          bhk,
          facing: unit?.facing || null,
          heroObjectPath: resolveUnitHero(unit, project),
          badges: ["In Project", unit?.availability ? unit.availability : null].filter(Boolean) as string[],
          updatedAt: resolveUpdatedAt(unit?.updatedAtMs || unit?.updatedAt),
          projectId: unit.projectId,
          projectSlug: unit.projectSlug || project?.slug,
          projectName,
          unitId: unit.unitId || unit.id,
          unitNumber: unit.unitNumber || null,
          availability: unit.availability,
          tower: unit.tower ?? null,
          floor: unit.floorInfo?.number ?? unit.floor ?? null
        });
      });
    }
  }

  results.sort((a, b) => {
    const rank = (item: UnifiedResultItem) => {
      if (item.resultType !== "project_unit") return 1;
      if (item.availability === "available") return 0;
      if (item.availability === "blocked") return 2;
      return 3;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bTime - aTime;
  });

  return { items: results.slice(0, limit), interpretedQuery };
}
