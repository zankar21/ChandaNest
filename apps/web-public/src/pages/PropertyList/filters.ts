export type Filters = {
  q: string;
  city: string;
  type: string;
  status: string;
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  sort: "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc";
};

export const defaultFilters: Filters = {
  q: "",
  city: "",
  type: "",
  status: "",
  minPrice: null,
  maxPrice: null,
  minArea: null,
  maxArea: null,
  sort: "newest"
};

export function normalizeText(s?: string) {
  return (s || "").toString().toLowerCase().trim();
}

export function getPrice(p: any): number | null {
  const price =
    p?.pricing?.amount ??
    p?.pricing?.price ??
    p?.pricing?.totalPrice ??
    p?.price ??
    null;
  return typeof price === "number" ? price : null;
}

export function getArea(p: any): number | null {
  const area = p?.area?.value ?? null;
  return typeof area === "number" ? area : null;
}

export function matches(p: any, filters: Filters) {
  const q = normalizeText(filters.q);
  const price = getPrice(p);
  const area = getArea(p);
  const title = normalizeText(p?.listing?.title || p?.title);
  const city = normalizeText(p?.location?.city);
  const locality = normalizeText(p?.location?.locality);
  const combined = `${title} ${city} ${locality}`;

  if (q && !combined.includes(q)) return false;
  if (filters.city && city !== normalizeText(filters.city)) return false;
  if (filters.type && normalizeText(p?.listing?.type) !== normalizeText(filters.type)) return false;
  if (filters.status && normalizeText(p?.listing?.status) !== normalizeText(filters.status)) return false;
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
      // keep original order (assumed newest first from API)
      break;
  }
  return sorted;
}
