// Listing modes determine whether an item is a standalone property or tied to a project.
export const LISTING_MODE = ["independent", "project_unit"] as const;
export type ListingMode = (typeof LISTING_MODE)[number];

// Legacy categories kept for backward compatibility where needed.
export const LISTING_CATEGORY = ["residential", "commercial", "land", "other"] as const;
export type ListingCategory = (typeof LISTING_CATEGORY)[number];

// Property and unit types exposed to clients.
export const PROPERTY_TYPE = [
  "land",
  "apartment",
  "flat",
  "villa",
  "plot",
  "house",
  "office",
  "shop",
  "warehouse",
  "other"
] as const;
export type PropertyType = (typeof PROPERTY_TYPE)[number];

// Legacy listing type (property type) retained for backward compatibility.
export const LISTING_TYPE = ["apartment", "villa", "plot", "office", "shop", "warehouse", "other"] as const;
export type ListingType = (typeof LISTING_TYPE)[number];

// Transaction type for listings (sale / rent / lease).
export const LISTING_DEAL_TYPE = ["sale", "rent", "lease"] as const;
export type ListingDealType = (typeof LISTING_DEAL_TYPE)[number];

export const PROJECT_TYPE = ["plotted", "apartment", "mixed"] as const;
export type ProjectType = (typeof PROJECT_TYPE)[number];

export const PROJECT_STATUS = ["launching", "under_construction", "ready"] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const UNIT_TYPE = ["plot", "flat", "villa"] as const;
export type UnitType = (typeof UNIT_TYPE)[number];

export const NA_STATUS = ["approved", "applied", "agricultural"] as const;
export type NaStatus = (typeof NA_STATUS)[number];

export const LAYOUT_APPROVAL_STATUS = ["approved", "in_process", "not_approved"] as const;
export type LayoutApprovalStatus = (typeof LAYOUT_APPROVAL_STATUS)[number];

export const AVAILABILITY_STATUS = ["available", "hold", "sold"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUS)[number];

export const DEFAULTS = {
  landType: "plot" as const,
  brokeragePartnerId: "Chandrapur Real Estate Solutions Pvt Ltd"
};
