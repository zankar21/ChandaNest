import { getDisplayPriceValue, getPrimaryAreaLabel } from "../../modules/listings/truth";

export type Filters = {
  q: string;
  city: string;
  dealIntent: string;
  status: string;
  featured: boolean;
  bhk: number | null;
  availability: "" | "available" | "blocked" | "sold";
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  sort: "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc";
  resultType: "all" | "property" | "project_unit";
};

export const defaultFilters: Filters = {
  q: "",
  city: "",
  dealIntent: "",
  status: "",
  featured: false,
  bhk: null,
  availability: "",
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  sort: "newest",
  resultType: "all"
};

export function normalizeText(s?: string) {
  return (s || "").toString().toLowerCase().trim();
}

export function getPrice(p: any): number | null {
  const price = p?.priceValue ?? getDisplayPriceValue(p) ?? p?.price ?? null;
  return typeof price === "number" ? price : null;
}

export function getArea(p: any): number | null {
  const area =
    p?.areaValue ??
    p?.area?.value ??
    p?.specs?.residential?.carpetAreaSqFt ??
    p?.specs?.residential?.builtUpAreaSqFt ??
    p?.specs?.residential?.superBuiltUpAreaSqFt ??
    p?.specs?.residential?.plotAreaSqFt ??
    p?.specs?.commercial?.carpetSqFt ??
    p?.specs?.commercial?.builtUpSqFt ??
    p?.specs?.commercial?.saleableSqFt ??
    p?.specs?.flat?.carpetAreaSqFt ??
    p?.specs?.flat?.builtUpAreaSqFt ??
    p?.specs?.house?.carpetAreaSqFt ??
    p?.specs?.house?.builtUpAreaSqFt ??
    null;
  return typeof area === "number" ? area : null;
}

export function matches(p: any, filters: Filters) {
  const q = normalizeText(filters.q);
  const price = getPrice(p);
  const area = getArea(p);
  const title = normalizeText(p?.title || p?.listing?.title);
  const city = normalizeText(p?.citySlug || p?.location?.citySlug || p?.location?.city);
  const locality = normalizeText(p?.locality || p?.location?.locality);
  const areaLabel = normalizeText(getPrimaryAreaLabel(p) || "");
  const propertyType = normalizeText(p?.propertyType || p?.listing?.propertyType);
  const dealIntent = normalizeText(p?.dealIntent || p?.listing?.dealIntent);
  const publishState = normalizeText(p?.publishState || p?.listing?.publishState);
  const combined = `${title} ${city} ${locality} ${areaLabel}`;
  const bhkValue =
    p?.bhk ??
    p?.specs?.flat?.bhk ??
    p?.specs?.house?.bhk ??
    null;
  const availability = (p?.availability || "").toString().toLowerCase();

  if (q && !combined.includes(q)) return false;
  if (filters.city && city !== normalizeText(filters.city)) return false;
  if (filters.dealIntent) {
    const filterType = normalizeText(filters.dealIntent);
    if (filterType === "sale" || filterType === "rent" || filterType === "lease" || filterType === "joint_venture") {
      if (dealIntent !== filterType) return false;
    } else if (propertyType !== filterType) {
      return false;
    }
  }
  if (filters.status && publishState !== normalizeText(filters.status)) return false;
  if (filters.featured && !p?.featured) return false;
  if (filters.bhk !== null && bhkValue !== filters.bhk) return false;
  if (filters.availability && availability !== filters.availability) return false;
  if (filters.minPrice !== null && (price === null || price < filters.minPrice)) return false;
  if (filters.maxPrice !== null && (price === null || price > filters.maxPrice)) return false;
  if (filters.minArea !== null && (area === null || area < filters.minArea)) return false;
  if (filters.maxArea !== null && (area === null || area > filters.maxArea)) return false;
  return true;
}

export function sortList(list: any[], filters: Filters) {
  const sorted = [...list];
  switch (filters.sort) {
    case "price_asc":
      sorted.sort((a, b) => (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity));
      break;
    case "price_desc":
      sorted.sort((a, b) => (getPrice(b) ?? -Infinity) - (getPrice(a) ?? -Infinity));
      break;
    case "area_asc":
      sorted.sort((a, b) => (getArea(a) ?? Infinity) - (getArea(b) ?? Infinity));
      break;
    case "area_desc":
      sorted.sort((a, b) => (getArea(b) ?? -Infinity) - (getArea(a) ?? -Infinity));
      break;
    case "newest":
    default:
      // prefer available units first, then newest
      sorted.sort((a, b) => {
        const av = (a?.availability || "").toString().toLowerCase();
        const bv = (b?.availability || "").toString().toLowerCase();
        if (av === "available" && bv !== "available") return -1;
        if (bv === "available" && av !== "available") return 1;
        return 0;
      });
      break;
  }
  return sorted;
}
