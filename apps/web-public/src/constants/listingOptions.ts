export const INTENT_OPTIONS = [
  { value: "buy", label: "Sale" },
  { value: "rent", label: "Rent / Lease" }
] as const;

export const CATEGORY_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land / Plot" }
] as const;

export const RESIDENTIAL_PROPERTY_TYPES = [
  { value: "flat", label: "Flat" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "row_house", label: "Row House" },
  { value: "studio", label: "Studio" }
] as const;

export const COMMERCIAL_PROPERTY_TYPES = [
  { value: "shop", label: "Shop" },
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "industrial_shed", label: "Industrial Shed" }
] as const;

export const LAND_PROPERTY_TYPES = [
  { value: "plot", label: "Plot" },
  { value: "land", label: "Land" }
] as const;

export const SALE_TYPE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "resale", label: "Resale" }
] as const;

export const LAND_USE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "agricultural", label: "Agricultural" },
  { value: "industrial", label: "Industrial" }
] as const;
