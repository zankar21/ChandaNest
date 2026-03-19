import type { TeamUser } from "../../services/apiTypes";

export const CATEGORY_OPTIONS = ["residential", "commercial", "land"] as const;
export const DEAL_INTENT_OPTIONS = ["sale", "rent", "lease"] as const;
export const PROPERTY_TYPE_OPTIONS = {
  residential: ["flat", "house", "villa", "row_house", "studio", "pg", "room"],
  commercial: ["shop", "office", "warehouse", "industrial_shed", "showroom"],
  land: ["plot", "land"]
} as const;
export const LAND_AREA_UNITS = ["sqft", "sqyd", "sqm", "acre", "guntha", "hectare"] as const;
export const RECORD_STATUS_OPTIONS = ["draft", "review_pending", "published", "archived"] as const;
export const RENTAL_MODEL_OPTIONS = ["full_property", "per_room", "per_bed"] as const;
export const RENTAL_TYPE_OPTIONS = ["family_rent", "single_room", "shared_room", "pg", "1rk", "1bhk", "2bhk"] as const;
export const ACCOMMODATION_TYPE_OPTIONS = ["male", "female", "any"] as const;
export const GEO_ACCURACY_OPTIONS = ["exact", "approx"] as const;
export const LAND_AREA_UNIT_OPTIONS = ["sqft", "sqyd", "sqm", "acre", "guntha", "hectare"] as const;
export const SALE_PRICE_UNIT_OPTIONS = ["total", "sqft", "sqyd", "sqm", "acre", "guntha", "hectare"] as const;
export const FURNISHING_OPTIONS = ["unfurnished", "semi_furnished", "fully_furnished"] as const;
export const LAND_TYPE_OPTIONS = ["agricultural", "na", "farm", "industrial", "open"] as const;
export const POSSESSION_STATUS_OPTIONS = ["ready", "under_construction", "resale"] as const;
export const RENT_TENANT_PREFERENCE_OPTIONS = ["student", "working_professional", "family", "bachelor"] as const;
export const SHARING_TYPE_OPTIONS = ["single", "double", "triple", "four_plus"] as const;
export const RENT_FACILITIES_OPTIONS = [
  "wifi",
  "washing_machine",
  "power_backup",
  "parking",
  "lift",
  "geyser",
  "ac",
  "cooler",
  "ro_water",
  "housekeeping",
  "security",
  "cctv",
  "study_table"
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];
export type DealIntent = (typeof DEAL_INTENT_OPTIONS)[number];
export type PropertyType =
  | "flat"
  | "house"
  | "villa"
  | "row_house"
  | "studio"
  | "pg"
  | "room"
  | "shop"
  | "office"
  | "warehouse"
  | "industrial_shed"
  | "showroom"
  | "plot"
  | "land";
export type RecordStatusUi = (typeof RECORD_STATUS_OPTIONS)[number];
export type RentalModel = (typeof RENTAL_MODEL_OPTIONS)[number];
export type LandAreaUnit = (typeof LAND_AREA_UNIT_OPTIONS)[number];
export type SalePriceUnit = (typeof SALE_PRICE_UNIT_OPTIONS)[number];

export type MediaItem = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  caption?: string;
  sortOrder: number;
};

export type EnterpriseListingDraft = {
  dealIntent: DealIntent;
  category: Category;
  propertyType: PropertyType;
  title: string;
  description: string;
  source: {
    listingSource: string;
    internalReferenceId: string;
    assignedManagerId: string;
    ownerOrBuilderName: string;
  };
  location: {
    citySlug: string;
    locality: string;
    subLocality: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    pinCode: string;
    latitude: string;
    longitude: string;
    geoAccuracy: "exact" | "approx";
  };
  specs: {
    area: {
      carpetSqFt: string;
      builtUpSqFt: string;
      superBuiltUpSqFt: string;
      plotAreaSqFt: string;
      saleableSqFt: string;
      landAreaValue: string;
      landAreaUnit: LandAreaUnit | "";
    };
    structure: {
      bhk: string;
      bedrooms: string;
      bathrooms: string;
      balconyCount: string;
      floor: string;
      totalFloors: string;
      facing: string;
      furnishing: string;
      parking: string;
      societyName: string;
      buildingAgeYears: string;
      lift: boolean;
      powerBackup: boolean;
      waterSupply: string;
      possessionStatus: string;
    };
    commercial: {
      blockWing: string;
      cornerUnit: boolean;
      dedicatedParking: string;
      seatingCapacity: string;
      cabins: string;
      meetingRooms: string;
      washrooms: string;
      pantry: boolean;
      reception: boolean;
      clearHeightFt: string;
      dockDoors: string;
      loadingBay: boolean;
      roadFacingWidthFt: string;
      signageSpace: boolean;
      frontageFt: string;
      depthFt: string;
      ceilingHeightFt: string;
      fitOutStatus: string;
      possessionStatus: string;
      shutterType: string;
      waterConnection: boolean;
      powerLoadKw: string;
      fireSafetyReady: boolean;
      nearEntrance: boolean;
      nearEscalator: boolean;
      nearAnchor: boolean;
      hvacType: string;
      furnishing: string;
      businessParkGrade: string;
      flooringType: string;
      gateWidthFt: string;
      glassFacade: boolean;
      storageAreaSqFt: string;
      displayAreaSqFt: string;
      signageType: string;
      roadExposure: string;
    };
    accommodation: {
      rentalType: "family_rent" | "single_room" | "shared_room" | "pg" | "1rk" | "1bhk" | "2bhk" | "";
      rentalModel: RentalModel | "";
      accommodationType: "male" | "female" | "any" | "";
      tenantPreference: string[];
      noticePeriodDays: string;
      securityDepositMonths: string;
      availableFrom: string;
      occupancyCount: string;
      roomSizeSqFt: string;
      roomBalcony: boolean;
      roomFurnishing: string;
      roomAc: boolean;
      roomWifi: boolean;
      buildingCctv: boolean;
      buildingSecurity: boolean;
      attachedBathroom: boolean;
      foodIncluded: boolean;
      facilities: string[];
      sharingType: "single" | "double" | "triple" | "four_plus" | "";
      mealsNote: string;
      curfewTime: string;
      visitorsAllowed: boolean;
      laundryIncluded: boolean;
      electricityIncluded: boolean;
      waterIncluded: boolean;
      rulesNote: string;
      configuration: "1rk" | "1bhk" | "2bhk" | "3bhk" | "4bhk_plus" | "";
    };
    land: {
      landType: string;
      zoning: string;
      naStatus: string;
      layoutApproved: boolean;
      titleClear: boolean;
      litigation: boolean;
      litigationNotes: string;
      roadAccess: boolean;
      frontageFt: string;
      cornerPlot: boolean;
      boundaryWall: boolean;
      waterSource: string;
      electricityAvailable: boolean;
    };
  };
  pricing: {
    sale: {
      priceOnRequest: boolean;
      expectedPrice: string;
      expectedPriceUnit: SalePriceUnit;
      pricePerSqFt: string;
      saleType: "new_booking" | "resale" | "";
      maintenanceMonthly: string;
      allInclusive: boolean;
      negotiable: boolean;
      taxIncluded: boolean;
      possessionChargesIncluded: boolean;
      manualPricePerSqFt: boolean;
    };
    rent: {
      monthlyRent: string;
      securityDeposit: string;
      maintenanceMonthly: string;
      bookingAmount: string;
      leaseDurationMonths: string;
      lockInMonths: string;
      rentNegotiable: boolean;
      pricingModel: RentalModel | "";
      perRoomAmount: string;
      perBedAmount: string;
    };
  };
  landRecord: {
    landType: string;
    mouza: string;
    surveyOrGatNo: string;
    hissaNo: string;
    wargOrWard: string;
    taluka: string;
    district: string;
    state: string;
    is712Available: boolean;
    is8AAvailable: boolean;
    titleClear: boolean;
    naStatus: string;
    layoutApproved: boolean;
    litigation: boolean;
    litigationNotes: string;
    roadAccess: boolean;
    waterSource: string;
    electricity: boolean;
    boundaryWall: boolean;
    plotShape: string;
    frontageFeet: string;
  };
  amenities: string[];
  highlights: string[];
  contact: {
    name: string;
    phone: string;
    whatsapp: string;
    email: string;
    role: string;
    preferred: "call" | "whatsapp" | "both" | "";
    preferredContactTime: "morning" | "afternoon" | "evening" | "any" | "";
  };
  mediaItems: MediaItem[];
  coverMediaId: string;
  recordStatus: RecordStatusUi;
};

export type PropertyCapability = {
  category: Category;
  residential: boolean;
  commercial: boolean;
  land: boolean;
  sharedAccommodation: boolean;
  residentialUnit: boolean;
  flatLike: boolean;
  houseLike: boolean;
  villaLike: boolean;
  commercialOffice: boolean;
  commercialWarehouse: boolean;
  commercialShowroom: boolean;
  landAsset: boolean;
  plotAsset: boolean;
};

export type DraftSectionStatus = {
  key: "basics" | "location" | "specifications" | "pricing" | "amenities" | "media";
  label: string;
  complete: boolean;
  blockers: string[];
  warnings: string[];
};

export type DraftAssessment = {
  blockers: string[];
  warnings: string[];
  sections: DraftSectionStatus[];
  publicSummary: Array<{ label: string; value: string }>;
  mediaReadiness: Array<{ label: string; ready: boolean; detail: string }>;
  legalReadiness: Array<{ label: string; ready: boolean; detail: string }>;
};

export const defaultEnterpriseListingDraft: EnterpriseListingDraft = {
  dealIntent: "sale",
  category: "residential",
  propertyType: "flat",
  title: "",
  description: "",
  source: {
    listingSource: "manual",
    internalReferenceId: "",
    assignedManagerId: "",
    ownerOrBuilderName: ""
  },
  location: {
    citySlug: "",
    locality: "",
    subLocality: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    pinCode: "",
    latitude: "",
    longitude: "",
    geoAccuracy: "approx"
  },
  specs: {
    area: {
      carpetSqFt: "",
      builtUpSqFt: "",
      superBuiltUpSqFt: "",
      plotAreaSqFt: "",
      saleableSqFt: "",
      landAreaValue: "",
      landAreaUnit: ""
    },
    structure: {
      bhk: "",
      bedrooms: "",
      bathrooms: "",
      balconyCount: "",
      floor: "",
      totalFloors: "",
      facing: "",
      furnishing: "",
      parking: "",
      societyName: "",
      buildingAgeYears: "",
      lift: false,
      powerBackup: false,
      waterSupply: "",
      possessionStatus: ""
    },
    commercial: {
      blockWing: "",
      cornerUnit: false,
      dedicatedParking: "",
      seatingCapacity: "",
      cabins: "",
      meetingRooms: "",
      washrooms: "",
      pantry: false,
      reception: false,
      clearHeightFt: "",
      dockDoors: "",
      loadingBay: false,
      roadFacingWidthFt: "",
      signageSpace: false,
      frontageFt: "",
      depthFt: "",
      ceilingHeightFt: "",
      fitOutStatus: "",
      possessionStatus: "",
      shutterType: "",
      waterConnection: false,
      powerLoadKw: "",
      fireSafetyReady: false,
      nearEntrance: false,
      nearEscalator: false,
      nearAnchor: false,
      hvacType: "",
      furnishing: "",
      businessParkGrade: "",
      flooringType: "",
      gateWidthFt: "",
      glassFacade: false,
      storageAreaSqFt: "",
      displayAreaSqFt: "",
      signageType: "",
      roadExposure: ""
    },
    accommodation: {
      rentalType: "",
      rentalModel: "",
      accommodationType: "",
      tenantPreference: [],
      noticePeriodDays: "",
      securityDepositMonths: "",
      availableFrom: "",
      occupancyCount: "",
      roomSizeSqFt: "",
      roomBalcony: false,
      roomFurnishing: "",
      roomAc: false,
      roomWifi: false,
      buildingCctv: false,
      buildingSecurity: false,
      attachedBathroom: false,
      foodIncluded: false,
      facilities: [],
      sharingType: "",
      mealsNote: "",
      curfewTime: "",
      visitorsAllowed: false,
      laundryIncluded: false,
      electricityIncluded: false,
      waterIncluded: false,
      rulesNote: "",
      configuration: ""
    },
    land: {
      landType: "",
      zoning: "",
      naStatus: "",
      layoutApproved: false,
      titleClear: false,
      litigation: false,
      litigationNotes: "",
      roadAccess: false,
      frontageFt: "",
      cornerPlot: false,
      boundaryWall: false,
      waterSource: "",
      electricityAvailable: false
    }
  },
  pricing: {
    sale: {
      priceOnRequest: false,
      expectedPrice: "",
      expectedPriceUnit: "total",
      pricePerSqFt: "",
      saleType: "",
      maintenanceMonthly: "",
      allInclusive: false,
      negotiable: false,
      taxIncluded: false,
      possessionChargesIncluded: false,
      manualPricePerSqFt: false
    },
    rent: {
      monthlyRent: "",
      securityDeposit: "",
      maintenanceMonthly: "",
      bookingAmount: "",
      leaseDurationMonths: "",
      lockInMonths: "",
      rentNegotiable: false,
      pricingModel: "",
      perRoomAmount: "",
      perBedAmount: ""
    }
  },
  landRecord: {
    landType: "",
    mouza: "",
    surveyOrGatNo: "",
    hissaNo: "",
    wargOrWard: "",
    taluka: "",
    district: "",
    state: "Maharashtra",
    is712Available: false,
    is8AAvailable: false,
    titleClear: false,
    naStatus: "",
    layoutApproved: false,
    litigation: false,
    litigationNotes: "",
    roadAccess: false,
    waterSource: "",
    electricity: false,
    boundaryWall: false,
    plotShape: "",
    frontageFeet: ""
  },
  amenities: [],
  highlights: [],
  contact: {
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    role: "",
    preferred: "",
    preferredContactTime: ""
  },
  mediaItems: [],
  coverMediaId: "",
  recordStatus: "draft"
};

export function getPropertyTypeOptions(category: Category, dealIntent: DealIntent): PropertyType[] {
  const options = [...PROPERTY_TYPE_OPTIONS[category]] as PropertyType[];
  if (category === "residential" && dealIntent === "sale") {
    return options.filter((type) => type !== "pg" && type !== "room");
  }
  return options;
}

export function getPropertyCapability(propertyType: PropertyType): PropertyCapability {
  return {
    category: getCategoryFromPropertyType(propertyType),
    residential: ["flat", "house", "villa", "row_house", "studio", "pg", "room"].includes(propertyType),
    commercial: ["shop", "office", "warehouse", "industrial_shed", "showroom"].includes(propertyType),
    land: ["plot", "land"].includes(propertyType),
    sharedAccommodation: propertyType === "pg" || propertyType === "room",
    residentialUnit: ["flat", "house", "villa", "row_house", "studio"].includes(propertyType),
    flatLike: propertyType === "flat" || propertyType === "studio",
    houseLike: propertyType === "house" || propertyType === "row_house",
    villaLike: propertyType === "villa",
    commercialOffice: propertyType === "office",
    commercialWarehouse: propertyType === "warehouse" || propertyType === "industrial_shed",
    commercialShowroom: propertyType === "showroom",
    landAsset: propertyType === "land",
    plotAsset: propertyType === "plot"
  };
}

export function getCategoryFromPropertyType(propertyType: PropertyType): Category {
  if (["shop", "office", "warehouse", "industrial_shed", "showroom"].includes(propertyType)) return "commercial";
  if (["plot", "land"].includes(propertyType)) return "land";
  return "residential";
}

export function toDisplayLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function trimOrUndefined(value?: string | null) {
  const next = value?.trim();
  return next ? next : undefined;
}

export function toNumberOrUndefined(value?: string | null) {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function buildMediaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function stripEmpty(input: any): any {
  if (Array.isArray(input)) {
    const cleaned = input.map(stripEmpty).filter((item) => item !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (input && typeof input === "object") {
    const next: Record<string, any> = {};
    Object.entries(input).forEach(([key, value]) => {
      const cleaned = stripEmpty(value);
      if (cleaned !== undefined && cleaned !== "" && cleaned !== null) {
        next[key] = cleaned;
      }
    });
    return Object.keys(next).length ? next : undefined;
  }
  if (input === "" || input === null) return undefined;
  return input;
}

function normalizeDraftCategory(rawCategory?: string | null, rawPropertyType?: string | null): Category {
  if (rawPropertyType && ["plot", "land"].includes(rawPropertyType)) return "land";
  if (rawCategory === "land_plot") return "land";
  if (rawCategory === "residential" || rawCategory === "commercial" || rawCategory === "land") return rawCategory;
  return "residential";
}

function normalizePropertyType(rawPropertyType?: string | null, category?: Category): PropertyType {
  if (rawPropertyType && [
    "flat",
    "house",
    "villa",
    "row_house",
    "studio",
    "pg",
    "room",
    "shop",
    "office",
    "warehouse",
    "industrial_shed",
    "showroom",
    "plot",
    "land"
  ].includes(rawPropertyType)) {
    return rawPropertyType as PropertyType;
  }
  if (category === "commercial") return "shop";
  if (category === "land") return "plot";
  return "flat";
}

function deriveUiRecordStatus(data: any): RecordStatusUi {
  if (data?.recordStatus === "inactive") return "archived";
  if (String(data?.publishState || "").toLowerCase() === "published") return "published";
  return "draft";
}

function normalizeLandType(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (["agricultural", "na", "farm", "industrial", "open"].includes(normalized)) {
    return normalized as "agricultural" | "na" | "farm" | "industrial" | "open";
  }
  if (normalized === "n_a" || normalized === "non_agricultural" || normalized === "non-agricultural") return "na";
  if (normalized === "agriculture") return "agricultural";
  return "";
}

function normalizeAccommodationGender(value?: string | null) {
  if (value === "boys" || value === "male") return "male";
  if (value === "girls" || value === "female") return "female";
  if (value === "any") return "any";
  return "";
}

function deriveDraftPricingModel(data: any): RentalModel | "" {
  const explicit = data?.rentalDetails?.rentalModel;
  if (explicit === "full_property" || explicit === "per_room" || explicit === "per_bed") return explicit;
  if (explicit === "whole_unit") return "full_property";
  if (explicit === "single_room") return "per_room";
  if (explicit === "shared_room" || explicit === "per_bed") return "per_bed";
  return "";
}

function deriveDraftRentalType(propertyType: PropertyType, data: any): EnterpriseListingDraft["specs"]["accommodation"]["rentalType"] {
  const rentalType = data?.rentalDetails?.rentalType;
  if (rentalType === "family_rent" || rentalType === "single_room" || rentalType === "shared_room" || rentalType === "pg" || rentalType === "1rk" || rentalType === "1bhk" || rentalType === "2bhk") return rentalType;
  if (propertyType === "pg") return "pg";
  if (propertyType === "room") return data?.rentalDetails?.room?.sharingType ? "shared_room" : "single_room";
  if (propertyType === "studio") return "1rk";
  if (propertyType === "flat") {
    const bhk = Number(data?.specs?.flat?.bhk ?? data?.specs?.house?.bhk ?? 0);
    if (bhk === 1) return "1bhk";
    if (bhk === 2) return "2bhk";
  }
  return "family_rent";
}

export function mapListingToDraft(data: any): EnterpriseListingDraft {
  const category = normalizeDraftCategory(data?.category, data?.propertyType || data?.categoryType);
  const propertyType = normalizePropertyType(data?.propertyType || data?.categoryType, category);
  const structureSource =
    propertyType === "villa"
      ? data?.specs?.villa || {}
      : propertyType === "house" || propertyType === "row_house"
      ? data?.specs?.house || {}
      : data?.specs?.flat || {};
  const commercial = data?.specs?.commercial || {};
  const land = data?.specs?.land || {};
  const sale = data?.saleDetails || {};
  const rent = data?.rentalDetails || {};
  const rentPricing = rent?.pricing || {};
  const location = data?.location || {};
  const geo = location?.geo || {};

  return {
    ...defaultEnterpriseListingDraft,
    dealIntent: data?.dealIntent === "rent" || data?.dealIntent === "lease" ? data.dealIntent : "sale",
    category,
    propertyType,
    title: data?.title || "",
    description: typeof data?.description === "string" ? data.description : data?.description?.user || "",
    source: {
      listingSource: data?.source || "manual",
      internalReferenceId: data?.internalReferenceId || "",
      assignedManagerId: data?.assignedToUid || "",
      ownerOrBuilderName: data?.ownerOrBuilderName || data?.contact?.name || ""
    },
    location: {
      citySlug: location?.citySlug || "",
      locality: location?.locality || "",
      subLocality: location?.subLocality || "",
      addressLine1: location?.addressLine || "",
      addressLine2: location?.addressLine2 || "",
      landmark: location?.landmark || "",
      pinCode: location?.pincode || location?.pinCode || "",
      latitude: geo?.lat != null ? String(geo.lat) : "",
      longitude: geo?.lng != null ? String(geo.lng) : "",
      geoAccuracy: location?.showExactAddress ? "exact" : "approx"
    },
    specs: {
      area: {
        carpetSqFt: structureSource?.carpetAreaSqFt != null ? String(structureSource.carpetAreaSqFt) : commercial?.carpetSqFt != null ? String(commercial.carpetSqFt) : "",
        builtUpSqFt: structureSource?.builtUpAreaSqFt != null ? String(structureSource.builtUpAreaSqFt) : commercial?.builtUpSqFt != null ? String(commercial.builtUpSqFt) : commercial?.warehouse?.builtUpSqFt != null ? String(commercial.warehouse.builtUpSqFt) : "",
        superBuiltUpSqFt: structureSource?.superBuiltUpAreaSqFt != null ? String(structureSource.superBuiltUpAreaSqFt) : "",
        plotAreaSqFt: structureSource?.plotAreaSqFt != null ? String(structureSource.plotAreaSqFt) : commercial?.warehouse?.plotAreaSqFt != null ? String(commercial.warehouse.plotAreaSqFt) : land?.plotAreaSqFt != null ? String(land.plotAreaSqFt) : "",
        saleableSqFt: commercial?.saleableSqFt != null ? String(commercial.saleableSqFt) : "",
        landAreaValue: data?.area?.value != null ? String(data.area.value) : "",
        landAreaUnit: data?.area?.unit || ""
      },
      structure: {
        bhk: structureSource?.bhk != null ? String(structureSource.bhk) : structureSource?.bedrooms != null ? String(structureSource.bedrooms) : "",
        bedrooms: structureSource?.bedrooms != null ? String(structureSource.bedrooms) : structureSource?.bhk != null ? String(structureSource.bhk) : "",
        bathrooms: structureSource?.bathrooms != null ? String(structureSource.bathrooms) : "",
        balconyCount: structureSource?.balconyCount != null ? String(structureSource.balconyCount) : "",
        floor: structureSource?.floor != null ? String(structureSource.floor) : "",
        totalFloors: structureSource?.totalFloors != null ? String(structureSource.totalFloors) : "",
        facing: structureSource?.facing || "",
        furnishing: structureSource?.furnishing || "",
        parking: structureSource?.parking != null ? String(structureSource.parking) : "",
        societyName: structureSource?.societyName || "",
        buildingAgeYears: structureSource?.buildingAgeYears != null ? String(structureSource.buildingAgeYears) : structureSource?.ageYears != null ? String(structureSource.ageYears) : "",
        lift: Boolean(structureSource?.lift),
        powerBackup: Boolean(structureSource?.powerBackup),
        waterSupply: structureSource?.waterSupply || "",
        possessionStatus: structureSource?.possessionStatus || ""
      },
      commercial: {
        blockWing: commercial?.blockWing || "",
        cornerUnit: Boolean(commercial?.cornerUnit),
        dedicatedParking: commercial?.dedicatedParking != null ? String(commercial.dedicatedParking) : "",
        seatingCapacity: commercial?.office?.seatingCapacity != null ? String(commercial.office.seatingCapacity) : "",
        cabins: commercial?.office?.cabins != null ? String(commercial.office.cabins) : "",
        meetingRooms: commercial?.office?.meetingRooms != null ? String(commercial.office.meetingRooms) : "",
        washrooms: commercial?.washroom ? "1" : "",
        pantry: Boolean(commercial?.office?.pantry),
        reception: false,
        clearHeightFt: commercial?.warehouse?.clearHeightFt != null ? String(commercial.warehouse.clearHeightFt) : "",
        dockDoors: commercial?.warehouse?.dockingBays != null ? String(commercial.warehouse.dockingBays) : "",
        loadingBay: Boolean(commercial?.showroom?.loadingAccess || commercial?.warehouse?.truckTurning),
        roadFacingWidthFt: commercial?.frontageFt != null ? String(commercial.frontageFt) : commercial?.showroom?.displayAreaSqFt != null ? "" : "",
        signageSpace: Boolean(commercial?.signageAllowed),
        frontageFt: commercial?.frontageFt != null ? String(commercial.frontageFt) : "",
        depthFt: commercial?.depthFt != null ? String(commercial.depthFt) : "",
        ceilingHeightFt: commercial?.ceilingHeightFt != null ? String(commercial.ceilingHeightFt) : "",
        fitOutStatus: commercial?.fitOutStatus || "",
        possessionStatus: commercial?.possessionStatus || "",
        shutterType: commercial?.shutterType || "",
        waterConnection: Boolean(commercial?.waterConnection),
        powerLoadKw: commercial?.powerLoadKw != null ? String(commercial.powerLoadKw) : commercial?.warehouse?.powerLoadKw != null ? String(commercial.warehouse.powerLoadKw) : "",
        fireSafetyReady: Boolean(commercial?.fireSafetyReady || commercial?.warehouse?.fireNocReady),
        nearEntrance: Boolean(commercial?.nearEntrance),
        nearEscalator: Boolean(commercial?.nearEscalator),
        nearAnchor: Boolean(commercial?.nearAnchor),
        hvacType: commercial?.office?.hvacType || "",
        furnishing: commercial?.office?.furnishing || "",
        businessParkGrade: commercial?.office?.businessParkGrade || "",
        flooringType: commercial?.warehouse?.flooringType || "",
        gateWidthFt: commercial?.warehouse?.gateWidthFt != null ? String(commercial.warehouse.gateWidthFt) : "",
        glassFacade: Boolean(commercial?.showroom?.glassFacade),
        storageAreaSqFt: commercial?.showroom?.storageAreaSqFt != null ? String(commercial.showroom.storageAreaSqFt) : "",
        displayAreaSqFt: commercial?.showroom?.displayAreaSqFt != null ? String(commercial.showroom.displayAreaSqFt) : "",
        signageType: commercial?.showroom?.signageType || "",
        roadExposure: commercial?.showroom?.roadExposure || ""
      },
      accommodation: {
        rentalType: deriveDraftRentalType(propertyType, data),
        rentalModel: deriveDraftPricingModel(data),
        accommodationType: normalizeAccommodationGender(rent?.suitability?.genderPreference || rent?.suitability?.preferredGender),
        tenantPreference: Array.isArray(rent?.suitability?.suitableFor) ? rent.suitability.suitableFor : [],
        noticePeriodDays: rentPricing?.noticePeriodDays != null ? String(rentPricing.noticePeriodDays) : "",
        securityDepositMonths: rent?.securityDepositMonths != null ? String(rent.securityDepositMonths) : "",
        availableFrom: rent?.availability?.availableFrom || "",
        occupancyCount:
          rent?.availability?.availableBeds != null
            ? String(rent.availability.availableBeds)
            : rent?.availability?.availableUnits != null
            ? String(rent.availability.availableUnits)
            : "",
        roomSizeSqFt: rent?.room?.roomSizeSqFt != null ? String(rent.room.roomSizeSqFt) : "",
        roomBalcony: Boolean(rent?.room?.balcony),
        roomFurnishing: rent?.room?.furnishing || "",
        roomAc: Boolean(rent?.room?.ac),
        roomWifi: Boolean(rent?.room?.wifi),
        buildingCctv: Boolean(rent?.building?.cctv),
        buildingSecurity: Boolean(rent?.building?.security),
        attachedBathroom: Boolean(rent?.room?.attachedBathroom || rent?.pg?.attachedBathroom),
        foodIncluded: Boolean(rent?.pg?.foodIncluded || rent?.pg?.mealsIncluded),
        facilities: Array.isArray(rent?.facilities) ? rent.facilities : [],
        sharingType:
          rent?.pg?.sharingType === "single" ||
          rent?.pg?.sharingType === "double" ||
          rent?.pg?.sharingType === "triple" ||
          rent?.pg?.sharingType === "four_plus"
            ? rent.pg.sharingType
            : "",
        mealsNote: rent?.pg?.mealsNote || "",
        curfewTime: rent?.pg?.curfewTime || rent?.pg?.gateClosingTime || "",
        visitorsAllowed: Boolean(rent?.pg?.visitorsAllowed),
        laundryIncluded: Boolean(rent?.pg?.laundryIncluded),
        electricityIncluded: Boolean(rentPricing?.electricityIncluded || rent?.pg?.electricityIncluded),
        waterIncluded: Boolean(rentPricing?.waterIncluded || rent?.pg?.waterIncluded),
        rulesNote: rent?.pg?.rulesNote || "",
        configuration: rent?.configuration || ""
      },
      land: {
        landType: "",
        zoning: data?.landRecord?.zoning || "",
        naStatus: "",
        layoutApproved: false,
        titleClear: false,
        litigation: false,
        litigationNotes: "",
        roadAccess: Boolean(data?.landRecord?.roadAccess),
        frontageFt: data?.landRecord?.frontageFeet != null ? String(data.landRecord.frontageFeet) : land?.frontage != null ? String(land.frontage) : "",
        cornerPlot: Boolean(land?.corner),
        boundaryWall: Boolean(data?.landRecord?.boundaryWall),
        waterSource: data?.landRecord?.waterSource || "",
        electricityAvailable: Boolean(data?.landRecord?.electricity)
      }
    },
    pricing: {
      sale: {
        priceOnRequest: Boolean(sale?.priceOnRequest),
        expectedPrice: sale?.ratePerSqFt != null && sale?.priceUnit === "sqft" ? String(sale.ratePerSqFt) : sale?.totalPrice != null ? String(sale.totalPrice) : "",
        expectedPriceUnit: sale?.ratePerSqFt != null && sale?.priceUnit === "sqft" ? "sqft" : "total",
        pricePerSqFt: sale?.ratePerSqFt != null ? String(sale.ratePerSqFt) : "",
        saleType: sale?.saleType === "new_booking" || sale?.saleType === "resale" ? sale.saleType : "",
        maintenanceMonthly: sale?.maintenanceMonthly != null ? String(sale.maintenanceMonthly) : "",
        allInclusive: Boolean(sale?.allInclusivePrice),
        negotiable: Boolean(sale?.negotiable),
        taxIncluded: false,
        possessionChargesIncluded: false,
        manualPricePerSqFt: Boolean(sale?.ratePerSqFt)
      },
      rent: {
        monthlyRent: rentPricing?.monthlyRent != null ? String(rentPricing.monthlyRent) : "",
        securityDeposit: rentPricing?.deposit != null ? String(rentPricing.deposit) : "",
        maintenanceMonthly: rentPricing?.maintenanceMonthly != null ? String(rentPricing.maintenanceMonthly) : "",
        bookingAmount: "",
        leaseDurationMonths: "",
        lockInMonths: rentPricing?.lockInMonths != null ? String(rentPricing.lockInMonths) : "",
        rentNegotiable: false,
        pricingModel: deriveDraftPricingModel(data),
        perRoomAmount: deriveDraftPricingModel(data) === "per_room" ? String(rentPricing?.monthlyRent || "") : "",
        perBedAmount: rentPricing?.rentPerBed != null ? String(rentPricing.rentPerBed) : ""
      }
    },
    landRecord: {
      landType: normalizeLandType(data?.landRecord?.landType || data?.specs?.land?.landType) || "",
      mouza: data?.landRecord?.mouza || "",
      surveyOrGatNo: data?.landRecord?.surveyOrGatNo || "",
      hissaNo: data?.landRecord?.hissaNo || "",
      wargOrWard: data?.landRecord?.warg || data?.landRecord?.wardOrWarg || "",
      taluka: data?.landRecord?.taluka || "",
      district: data?.landRecord?.district || "",
      state: data?.landRecord?.state || "Maharashtra",
      is712Available: Boolean(data?.landRecord?.is712Available),
      is8AAvailable: Boolean(data?.landRecord?.is8AAvailable),
      titleClear: Boolean(data?.landRecord?.titleClear),
      naStatus: data?.landRecord?.naStatus || "",
      layoutApproved: Boolean(data?.landRecord?.layoutApproved),
      litigation: Boolean(data?.landRecord?.litigation),
      litigationNotes: data?.landRecord?.litigationNotes || "",
      roadAccess: Boolean(data?.landRecord?.roadAccess),
      waterSource: data?.landRecord?.waterSource || "",
      electricity: Boolean(data?.landRecord?.electricity),
      boundaryWall: Boolean(data?.landRecord?.boundaryWall),
      plotShape: data?.landRecord?.plotShape || "",
      frontageFeet: data?.landRecord?.frontageFeet != null ? String(data.landRecord.frontageFeet) : ""
    },
    amenities: Array.isArray(data?.amenities) ? data.amenities : [],
    highlights: Array.isArray(data?.highlights) ? data.highlights : [],
    contact: {
      name: data?.contact?.name || "",
      phone: data?.contact?.phone || "",
      whatsapp: data?.contact?.whatsapp || "",
      email: data?.contact?.email || "",
      role: data?.contact?.role || "",
      preferred: data?.contact?.preferred === "call" || data?.contact?.preferred === "whatsapp" || data?.contact?.preferred === "both" ? data.contact.preferred : "",
      preferredContactTime:
        data?.contact?.preferredContactTime === "morning" ||
        data?.contact?.preferredContactTime === "afternoon" ||
        data?.contact?.preferredContactTime === "evening" ||
        data?.contact?.preferredContactTime === "any"
          ? data.contact.preferredContactTime
          : ""
    },
    mediaItems: Array.isArray(data?.mediaItems)
      ? data.mediaItems
      : [
          ...(() => {
            const hero = data?.media?.hero;
            const gallery = Array.isArray(data?.media?.gallery) ? data.media.gallery : [];
            const hasHeroInGallery = gallery.some((item: any) => item?.objectPath && item.objectPath === hero?.objectPath);
            if (!hero?.objectPath || hasHeroInGallery) return [];
            return [{
              id: hero?.id || buildMediaId(),
              type: "photo" as const,
              url: hero.objectPath,
              caption: hero?.caption || hero?.label || "",
              sortOrder: 0
            }];
          })(),
          ...((Array.isArray(data?.media?.gallery) ? data.media.gallery : []) as any[]).map((item: any, index: number) => ({
            id: item?.id || buildMediaId(),
            type: "photo" as const,
            url: item?.objectPath || "",
            caption: item?.caption || item?.label || "",
            sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : index + 1
          })),
          ...((Array.isArray(data?.media?.documents) ? data.media.documents : []) as any[]).map((item: any, index: number) => ({
            id: item?.id || buildMediaId(),
            type: "doc" as const,
            url: item?.objectPath || "",
            caption: item?.caption || item?.label || item?.title || "",
            sortOrder: typeof item?.sortOrder === "number" ? item.sortOrder : index + 1000
          }))
        ].filter((item) => item.url),
    coverMediaId: data?.coverMediaId || data?.media?.coverMediaId || data?.media?.hero?.id || "",
    recordStatus: deriveUiRecordStatus(data)
  };
}

const AREA_TO_SQFT_FACTOR: Record<Exclude<SalePriceUnit, "total"> | LandAreaUnit, number> = {
  sqft: 1,
  sqyd: 9,
  sqm: 10.7639,
  acre: 43560,
  guntha: 1089,
  hectare: 107639
};

function getPrimaryAreaSqFt(draft: EnterpriseListingDraft) {
  const capability = getPropertyCapability(draft.propertyType);
  if (capability.land) {
    const value = toNumberOrUndefined(draft.specs.area.landAreaValue);
    const unit = draft.specs.area.landAreaUnit;
    if (!value || !unit) return undefined;
    return value * AREA_TO_SQFT_FACTOR[unit];
  }
  return (
    toNumberOrUndefined(draft.specs.area.carpetSqFt) ||
    toNumberOrUndefined(draft.specs.area.builtUpSqFt) ||
    toNumberOrUndefined(draft.specs.area.saleableSqFt) ||
    toNumberOrUndefined(draft.specs.area.superBuiltUpSqFt) ||
    toNumberOrUndefined(draft.specs.area.plotAreaSqFt)
  );
}

function getPerSqFtRateFromExpectedPrice(draft: EnterpriseListingDraft) {
  const expectedPrice = toNumberOrUndefined(draft.pricing.sale.expectedPrice);
  if (!expectedPrice) return undefined;
  if (draft.pricing.sale.expectedPriceUnit === "total") {
    const areaSqFt = getPrimaryAreaSqFt(draft);
    if (!areaSqFt) return undefined;
    return expectedPrice / areaSqFt;
  }
  const factor = AREA_TO_SQFT_FACTOR[draft.pricing.sale.expectedPriceUnit];
  return factor ? expectedPrice / factor : undefined;
}

function getTotalPriceFromExpectedPrice(draft: EnterpriseListingDraft) {
  const expectedPrice = toNumberOrUndefined(draft.pricing.sale.expectedPrice);
  if (!expectedPrice) return undefined;
  if (draft.pricing.sale.expectedPriceUnit === "total") return expectedPrice;
  const areaSqFt = getPrimaryAreaSqFt(draft);
  const factor = AREA_TO_SQFT_FACTOR[draft.pricing.sale.expectedPriceUnit];
  if (!areaSqFt || !factor) return undefined;
  return (expectedPrice / factor) * areaSqFt;
}

function getPrimaryAreaValues(draft: EnterpriseListingDraft) {
  return [
    toNumberOrUndefined(draft.specs.area.carpetSqFt),
    toNumberOrUndefined(draft.specs.area.builtUpSqFt),
    toNumberOrUndefined(draft.specs.area.superBuiltUpSqFt),
    toNumberOrUndefined(draft.specs.area.plotAreaSqFt),
    toNumberOrUndefined(draft.specs.area.saleableSqFt)
  ].filter((value): value is number => typeof value === "number" && value > 0);
}

export function maybeAutoComputePricePerSqFt(draft: EnterpriseListingDraft) {
  if (draft.pricing.sale.manualPricePerSqFt) return draft.pricing.sale.pricePerSqFt;
  const perSqFt = getPerSqFtRateFromExpectedPrice(draft);
  if (!perSqFt) return "";
  return String(Math.round(perSqFt * 100) / 100);
}

function deriveBackendRentalType(draft: EnterpriseListingDraft): string | undefined {
  if (draft.specs.accommodation.rentalType) return draft.specs.accommodation.rentalType;
  if (draft.propertyType === "pg") return "pg";
  if (draft.propertyType === "room") {
    const pricingModel = draft.pricing.rent.pricingModel || draft.specs.accommodation.rentalModel;
    return pricingModel === "per_bed" ? "shared_room" : "single_room";
  }
  return "family_rent";
}

function serializeRentalModel(model: RentalModel | "") {
  if (model === "full_property") return "whole_unit";
  if (model === "per_room") return "single_room";
  if (model === "per_bed") return "per_bed";
  return undefined;
}

function serializeRecordStatus(recordStatus: RecordStatusUi) {
  return recordStatus === "archived" ? "inactive" : "active";
}

function serializePublishState(recordStatus: RecordStatusUi) {
  if (recordStatus === "published") return "published";
  return "draft";
}

function buildMediaPayload(mediaItems: MediaItem[], coverMediaId?: string | null) {
  const photos = mediaItems.filter((item) => item.type === "photo" && item.url);
  const docs = mediaItems.filter((item) => item.type === "doc" && item.url);
  const cover = photos.find((item) => item.id === coverMediaId) || photos[0];
  return stripEmpty({
    hero: cover ? { objectPath: cover.url, id: cover.id, kind: "image", isCover: true } : undefined,
    gallery: photos.map((item) => ({ objectPath: item.url, id: item.id, kind: "image", caption: item.caption, sortOrder: item.sortOrder })),
    documents: docs.map((item) => ({ objectPath: item.url, id: item.id, kind: "document", caption: item.caption, sortOrder: item.sortOrder }))
  });
}

export function serializeListingDraft(
  draft: EnterpriseListingDraft,
  mediaItems: MediaItem[] = draft.mediaItems,
  coverMediaId: string | null = draft.coverMediaId || null
) {
  const capability = getPropertyCapability(draft.propertyType);
  const lat = toNumberOrUndefined(draft.location.latitude);
  const lng = toNumberOrUndefined(draft.location.longitude);
  const geo =
    typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)
      ? { lat, lng }
      : undefined;
  const pricingModel = draft.pricing.rent.pricingModel || draft.specs.accommodation.rentalModel;
  const computedPricePerSqFt = maybeAutoComputePricePerSqFt(draft);
  const computedTotalPrice = getTotalPriceFromExpectedPrice(draft);

  const payload = {
    title: draft.title.trim(),
    description: draft.description.trim() ? { user: draft.description.trim(), active: "user" } : undefined,
    source: draft.source.listingSource,
    internalReferenceId: trimOrUndefined(draft.source.internalReferenceId),
    ownerOrBuilderName: trimOrUndefined(draft.source.ownerOrBuilderName),
    assignedToUid: trimOrUndefined(draft.source.assignedManagerId),
    dealIntent: draft.dealIntent,
    category: capability.land ? "land_plot" : draft.category,
    propertyType: draft.propertyType,
    location: stripEmpty({
      citySlug: trimOrUndefined(draft.location.citySlug),
      locality: trimOrUndefined(draft.location.locality),
      subLocality: trimOrUndefined(draft.location.subLocality),
      addressLine: trimOrUndefined(draft.location.addressLine1),
      addressLine2: trimOrUndefined(draft.location.addressLine2),
      landmark: trimOrUndefined(draft.location.landmark),
      pincode: trimOrUndefined(draft.location.pinCode),
      district: trimOrUndefined(draft.landRecord.district),
      taluka: trimOrUndefined(draft.landRecord.taluka),
      state: trimOrUndefined(draft.landRecord.state),
      showExactAddress: draft.location.geoAccuracy === "exact" || undefined,
      geo
    }),
    area: capability.land
      ? stripEmpty({
          value: toNumberOrUndefined(draft.specs.area.landAreaValue),
          unit: draft.specs.area.landAreaUnit || undefined
        })
      : undefined,
    specs: stripEmpty({
      flat:
        capability.flatLike
          ? {
              bhk: toNumberOrUndefined(draft.specs.structure.bhk),
              carpetAreaSqFt: toNumberOrUndefined(draft.specs.area.carpetSqFt),
              builtUpAreaSqFt: toNumberOrUndefined(draft.specs.area.builtUpSqFt),
              superBuiltUpAreaSqFt: toNumberOrUndefined(draft.specs.area.superBuiltUpSqFt),
              floor: trimOrUndefined(draft.specs.structure.floor),
              totalFloors: toNumberOrUndefined(draft.specs.structure.totalFloors),
              bathrooms: toNumberOrUndefined(draft.specs.structure.bathrooms),
              balconyCount: toNumberOrUndefined(draft.specs.structure.balconyCount),
              furnishing: trimOrUndefined(draft.specs.structure.furnishing),
              facing: trimOrUndefined(draft.specs.structure.facing),
              parking: toNumberOrUndefined(draft.specs.structure.parking),
              societyName: trimOrUndefined(draft.specs.structure.societyName),
              buildingAgeYears: toNumberOrUndefined(draft.specs.structure.buildingAgeYears),
              ageYears: toNumberOrUndefined(draft.specs.structure.buildingAgeYears),
              lift: draft.specs.structure.lift || undefined,
              powerBackup: draft.specs.structure.powerBackup || undefined,
              waterSupply: trimOrUndefined(draft.specs.structure.waterSupply),
              possessionStatus: trimOrUndefined(draft.specs.structure.possessionStatus)
            }
          : undefined,
      house:
        capability.houseLike
          ? {
              bhk: toNumberOrUndefined(draft.specs.structure.bhk),
              bedrooms: toNumberOrUndefined(draft.specs.structure.bedrooms),
              carpetAreaSqFt: toNumberOrUndefined(draft.specs.area.carpetSqFt),
              builtUpAreaSqFt: toNumberOrUndefined(draft.specs.area.builtUpSqFt),
              superBuiltUpAreaSqFt: toNumberOrUndefined(draft.specs.area.superBuiltUpSqFt),
              plotAreaSqFt: toNumberOrUndefined(draft.specs.area.plotAreaSqFt),
              floor: trimOrUndefined(draft.specs.structure.floor),
              totalFloors: toNumberOrUndefined(draft.specs.structure.totalFloors),
              bathrooms: toNumberOrUndefined(draft.specs.structure.bathrooms),
              balconyCount: toNumberOrUndefined(draft.specs.structure.balconyCount),
              furnishing: trimOrUndefined(draft.specs.structure.furnishing),
              facing: trimOrUndefined(draft.specs.structure.facing),
              parking: toNumberOrUndefined(draft.specs.structure.parking),
              societyName: trimOrUndefined(draft.specs.structure.societyName),
              buildingAgeYears: toNumberOrUndefined(draft.specs.structure.buildingAgeYears),
              ageYears: toNumberOrUndefined(draft.specs.structure.buildingAgeYears),
              lift: draft.specs.structure.lift || undefined,
              powerBackup: draft.specs.structure.powerBackup || undefined,
              waterSupply: trimOrUndefined(draft.specs.structure.waterSupply),
              possessionStatus: trimOrUndefined(draft.specs.structure.possessionStatus)
            }
          : undefined,
      villa:
        capability.villaLike
          ? {
              plotAreaSqFt: toNumberOrUndefined(draft.specs.area.plotAreaSqFt),
              builtUpAreaSqFt: toNumberOrUndefined(draft.specs.area.builtUpSqFt),
              bedrooms: toNumberOrUndefined(draft.specs.structure.bedrooms || draft.specs.structure.bhk),
              bathrooms: toNumberOrUndefined(draft.specs.structure.bathrooms),
              facing: trimOrUndefined(draft.specs.structure.facing)
            }
          : undefined,
      commercial:
        capability.commercial
          ? {
              floor: trimOrUndefined(draft.specs.structure.floor),
              blockWing: trimOrUndefined(draft.specs.commercial.blockWing),
              cornerUnit: draft.specs.commercial.cornerUnit || undefined,
              facing: trimOrUndefined(draft.specs.structure.facing),
              carpetSqFt: toNumberOrUndefined(draft.specs.area.carpetSqFt),
              builtUpSqFt: toNumberOrUndefined(draft.specs.area.builtUpSqFt),
              saleableSqFt: toNumberOrUndefined(draft.specs.area.saleableSqFt),
              fitOutStatus: trimOrUndefined(draft.specs.commercial.fitOutStatus),
              possessionStatus: trimOrUndefined(draft.specs.commercial.possessionStatus),
              frontageFt: toNumberOrUndefined(draft.specs.commercial.frontageFt),
              depthFt: toNumberOrUndefined(draft.specs.commercial.depthFt),
              ceilingHeightFt: toNumberOrUndefined(draft.specs.commercial.ceilingHeightFt),
              shutterType: trimOrUndefined(draft.specs.commercial.shutterType),
              washroom: toNumberOrUndefined(draft.specs.commercial.washrooms) ? true : undefined,
              signageAllowed: draft.specs.commercial.signageSpace || undefined,
              waterConnection: draft.specs.commercial.waterConnection || undefined,
              powerLoadKw: toNumberOrUndefined(draft.specs.commercial.powerLoadKw),
              fireSafetyReady: draft.specs.commercial.fireSafetyReady || undefined,
              nearEntrance: draft.specs.commercial.nearEntrance || undefined,
              nearEscalator: draft.specs.commercial.nearEscalator || undefined,
              nearAnchor: draft.specs.commercial.nearAnchor || undefined,
              dedicatedParking: toNumberOrUndefined(draft.specs.commercial.dedicatedParking),
              office:
                capability.commercialOffice
                  ? {
                      seatingCapacity: toNumberOrUndefined(draft.specs.commercial.seatingCapacity),
                      cabins: toNumberOrUndefined(draft.specs.commercial.cabins),
                      meetingRooms: toNumberOrUndefined(draft.specs.commercial.meetingRooms),
                      pantry: draft.specs.commercial.pantry || undefined,
                      reception: draft.specs.commercial.reception || undefined,
                      hvacType: trimOrUndefined(draft.specs.commercial.hvacType),
                      furnishing: trimOrUndefined(draft.specs.commercial.furnishing),
                      businessParkGrade: trimOrUndefined(draft.specs.commercial.businessParkGrade)
                    }
                  : undefined,
              warehouse:
                capability.commercialWarehouse
                  ? {
                      plotAreaSqFt: toNumberOrUndefined(draft.specs.area.plotAreaSqFt),
                      builtUpSqFt: toNumberOrUndefined(draft.specs.area.builtUpSqFt),
                      clearHeightFt: toNumberOrUndefined(draft.specs.commercial.clearHeightFt),
                      dockingBays: toNumberOrUndefined(draft.specs.commercial.dockDoors),
                      gateWidthFt: toNumberOrUndefined(draft.specs.commercial.gateWidthFt),
                      flooringType: trimOrUndefined(draft.specs.commercial.flooringType),
                      truckTurning: draft.specs.commercial.loadingBay || undefined,
                      fireNocReady: draft.specs.commercial.fireSafetyReady || undefined,
                      powerLoadKw: toNumberOrUndefined(draft.specs.commercial.powerLoadKw),
                      waterConnection: draft.specs.commercial.waterConnection || undefined
                    }
                  : undefined,
              showroom:
                capability.commercialShowroom
                  ? {
                      glassFacade: draft.specs.commercial.glassFacade || undefined,
                      displayAreaSqFt: toNumberOrUndefined(draft.specs.commercial.displayAreaSqFt),
                      storageAreaSqFt: toNumberOrUndefined(draft.specs.commercial.storageAreaSqFt),
                      loadingAccess: draft.specs.commercial.loadingBay || undefined,
                      signageType: trimOrUndefined(draft.specs.commercial.signageType),
                      roadExposure: trimOrUndefined(draft.specs.commercial.roadExposure)
                    }
                  : undefined
            }
          : undefined,
      land:
        capability.land
          ? {
              plotAreaSqFt: toNumberOrUndefined(draft.specs.area.plotAreaSqFt),
              frontage: toNumberOrUndefined(draft.specs.land.frontageFt),
              corner: draft.specs.land.cornerPlot || undefined
            }
          : undefined
    }),
    saleDetails:
      draft.dealIntent === "sale"
        ? stripEmpty({
            priceOnRequest: draft.pricing.sale.priceOnRequest || undefined,
            totalPrice: draft.pricing.sale.priceOnRequest ? undefined : computedTotalPrice,
            ratePerSqFt: draft.pricing.sale.priceOnRequest ? undefined : toNumberOrUndefined(computedPricePerSqFt || draft.pricing.sale.pricePerSqFt),
            priceUnit: draft.pricing.sale.priceOnRequest ? undefined : draft.pricing.sale.expectedPriceUnit === "sqft" ? "sqft" : "total",
            saleType: draft.pricing.sale.saleType || undefined,
            allInclusivePrice: draft.pricing.sale.allInclusive || undefined,
            negotiable: draft.pricing.sale.negotiable,
            taxIncluded: draft.pricing.sale.taxIncluded || undefined,
            possessionChargesIncluded: draft.pricing.sale.possessionChargesIncluded || undefined,
            maintenanceMonthly: toNumberOrUndefined(draft.pricing.sale.maintenanceMonthly)
          })
        : undefined,
    rentalDetails:
      draft.dealIntent === "rent" || draft.dealIntent === "lease"
        ? stripEmpty({
            rentalType: deriveBackendRentalType(draft),
            rentalModel: serializeRentalModel(pricingModel),
            accommodationType:
              capability.sharedAccommodation ? (draft.propertyType === "pg" ? "pg" : "room") : capability.residential ? "standard_home" : undefined,
            configuration: trimOrUndefined(draft.specs.accommodation.configuration),
            pricing: {
              monthlyRent:
                pricingModel === "per_room"
                  ? toNumberOrUndefined(draft.pricing.rent.perRoomAmount)
                  : pricingModel === "per_bed"
                  ? undefined
                  : toNumberOrUndefined(draft.pricing.rent.monthlyRent),
              rentPerBed: pricingModel === "per_bed" ? toNumberOrUndefined(draft.pricing.rent.perBedAmount) : undefined,
              deposit: toNumberOrUndefined(draft.pricing.rent.securityDeposit),
              maintenanceMonthly: toNumberOrUndefined(draft.pricing.rent.maintenanceMonthly),
              lockInMonths: toNumberOrUndefined(draft.pricing.rent.lockInMonths),
              noticePeriodDays: toNumberOrUndefined(draft.specs.accommodation.noticePeriodDays),
              electricityIncluded: draft.specs.accommodation.electricityIncluded || undefined,
              waterIncluded: draft.specs.accommodation.waterIncluded || undefined
            },
            availability: {
              availableFrom: trimOrUndefined(draft.specs.accommodation.availableFrom),
              availableBeds: pricingModel === "per_bed" ? toNumberOrUndefined(draft.specs.accommodation.occupancyCount) : undefined,
              availableUnits: pricingModel !== "per_bed" ? toNumberOrUndefined(draft.specs.accommodation.occupancyCount) : undefined
            },
            suitability: {
              suitableFor: draft.specs.accommodation.tenantPreference.length ? draft.specs.accommodation.tenantPreference : undefined,
              genderPreference: draft.specs.accommodation.accommodationType || undefined
            },
            facilities: draft.specs.accommodation.facilities.length ? draft.specs.accommodation.facilities : undefined,
            pg:
              capability.sharedAccommodation
                ? {
                    sharingType: trimOrUndefined(draft.specs.accommodation.sharingType),
                    foodIncluded: draft.specs.accommodation.foodIncluded || undefined,
                    attachedBathroom: draft.specs.accommodation.attachedBathroom || undefined,
                    mealsIncluded: draft.specs.accommodation.foodIncluded || undefined,
                    mealsNote: trimOrUndefined(draft.specs.accommodation.mealsNote),
                    curfewTime: trimOrUndefined(draft.specs.accommodation.curfewTime),
                    visitorsAllowed: draft.specs.accommodation.visitorsAllowed || undefined,
                    laundryIncluded: draft.specs.accommodation.laundryIncluded || undefined,
                    electricityIncluded: draft.specs.accommodation.electricityIncluded || undefined,
                    waterIncluded: draft.specs.accommodation.waterIncluded || undefined,
                    rulesNote: trimOrUndefined(draft.specs.accommodation.rulesNote)
                  }
                : undefined,
            room:
              draft.propertyType === "room"
                ? {
                    attachedBathroom: draft.specs.accommodation.attachedBathroom || undefined,
                    roomSizeSqFt: toNumberOrUndefined(draft.specs.accommodation.roomSizeSqFt),
                    balcony: draft.specs.accommodation.roomBalcony || undefined,
                    furnishing: trimOrUndefined(draft.specs.accommodation.roomFurnishing),
                    ac: draft.specs.accommodation.roomAc || undefined,
                    wifi: draft.specs.accommodation.roomWifi || undefined
                  }
                : undefined,
            building:
              capability.sharedAccommodation
                ? {
                    floor: toNumberOrUndefined(draft.specs.structure.floor),
                    totalFloors: toNumberOrUndefined(draft.specs.structure.totalFloors),
                    lift: draft.specs.structure.lift || undefined,
                    parking: toNumberOrUndefined(draft.specs.structure.parking),
                    cctv: draft.specs.accommodation.buildingCctv || undefined,
                    security: draft.specs.accommodation.buildingSecurity || undefined
                  }
                : undefined
          })
        : undefined,
    landRecord:
      capability.land
        ? stripEmpty({
            landType: normalizeLandType(draft.landRecord.landType) || undefined,
            mouza: trimOrUndefined(draft.landRecord.mouza),
            surveyOrGatNo: trimOrUndefined(draft.landRecord.surveyOrGatNo),
            hissaNo: trimOrUndefined(draft.landRecord.hissaNo),
            warg: trimOrUndefined(draft.landRecord.wargOrWard),
            taluka: trimOrUndefined(draft.landRecord.taluka),
            district: trimOrUndefined(draft.landRecord.district),
            state: trimOrUndefined(draft.landRecord.state),
            is712Available: draft.landRecord.is712Available || undefined,
            is8AAvailable: draft.landRecord.is8AAvailable || undefined,
            naStatus: trimOrUndefined(draft.landRecord.naStatus),
            layoutApproved: draft.landRecord.layoutApproved || undefined,
            titleClear: draft.landRecord.titleClear || undefined,
            litigation: draft.landRecord.litigation || undefined,
            litigationNotes: trimOrUndefined(draft.landRecord.litigationNotes),
            roadAccess: draft.landRecord.roadAccess || undefined,
            boundaryWall: draft.landRecord.boundaryWall || undefined,
            frontageFeet: toNumberOrUndefined(draft.landRecord.frontageFeet || draft.specs.land.frontageFt),
            waterSource: trimOrUndefined(draft.landRecord.waterSource || draft.specs.land.waterSource),
            electricity: draft.landRecord.electricity || undefined,
            plotShape: trimOrUndefined(draft.landRecord.plotShape)
          })
        : undefined,
    amenities: draft.amenities.length ? draft.amenities : undefined,
    highlights: draft.highlights.length ? draft.highlights : undefined,
    contact: stripEmpty({
      name: trimOrUndefined(draft.contact.name),
      phone: trimOrUndefined(draft.contact.phone),
      whatsapp: trimOrUndefined(draft.contact.whatsapp),
      email: trimOrUndefined(draft.contact.email),
      role: trimOrUndefined(draft.contact.role),
      preferred: draft.contact.preferred || undefined,
      preferredContactTime: draft.contact.preferredContactTime || undefined
    }),
    media: buildMediaPayload(mediaItems, coverMediaId),
    mediaItems: mediaItems.length ? mediaItems : undefined,
    coverMediaId: coverMediaId || undefined,
    publishState: serializePublishState(draft.recordStatus),
    recordStatus: serializeRecordStatus(draft.recordStatus)
  };

  return stripEmpty(payload);
}

function hasAnyArea(values: Array<string>) {
  return values.some((value) => Boolean(toNumberOrUndefined(value)));
}

export function assessDraft(
  draft: EnterpriseListingDraft,
  mediaItems: MediaItem[] = draft.mediaItems,
  coverMediaId: string | null = draft.coverMediaId || null
): DraftAssessment {
  const capability = getPropertyCapability(draft.propertyType);
  const blockers: string[] = [];
  const warnings: string[] = [];

  const basicsBlockers: string[] = [];
  if (!draft.dealIntent) basicsBlockers.push("Deal intent is required.");
  if (!draft.category) basicsBlockers.push("Category is required.");
  if (!draft.propertyType) basicsBlockers.push("Property type is required.");
  if (!draft.title.trim()) basicsBlockers.push("Title is required.");

  const locationBlockers: string[] = [];
  if (!draft.location.citySlug.trim()) locationBlockers.push("City is required.");
  if (!draft.location.locality.trim()) locationBlockers.push("Locality is required.");

  const specificationBlockers: string[] = [];
  const specificationWarnings: string[] = [];
  if (capability.flatLike) {
    if (!hasAnyArea([draft.specs.area.carpetSqFt, draft.specs.area.builtUpSqFt, draft.specs.area.superBuiltUpSqFt])) {
      specificationBlockers.push("At least one residential area field is required.");
    }
    if (draft.propertyType === "flat" && !toNumberOrUndefined(draft.specs.structure.bhk)) {
      specificationBlockers.push("BHK is required for flats.");
    }
  }
  if (capability.houseLike || capability.villaLike) {
    if (!hasAnyArea([draft.specs.area.carpetSqFt, draft.specs.area.builtUpSqFt, draft.specs.area.superBuiltUpSqFt, draft.specs.area.plotAreaSqFt])) {
      specificationBlockers.push("At least one area field is required.");
    }
    if (!toNumberOrUndefined(draft.specs.structure.bhk) && !toNumberOrUndefined(draft.specs.structure.bedrooms)) {
      specificationBlockers.push("BHK or bedrooms is required.");
    }
    if (!toNumberOrUndefined(draft.specs.structure.bathrooms)) {
      specificationBlockers.push("Bathrooms are required.");
    }
  }
  if (capability.sharedAccommodation) {
    if (!(draft.dealIntent === "rent" || draft.dealIntent === "lease")) {
      specificationBlockers.push("PG and room listings are allowed only for rent or lease.");
    }
    if (!(draft.specs.accommodation.rentalModel || draft.pricing.rent.pricingModel)) {
      specificationBlockers.push("Rental model is required for shared accommodation.");
    }
    if (!draft.specs.accommodation.accommodationType) {
      specificationBlockers.push("Accommodation type is required for PG and room listings.");
    }
  }
  if (capability.commercial) {
    if (!hasAnyArea([draft.specs.area.carpetSqFt, draft.specs.area.builtUpSqFt, draft.specs.area.saleableSqFt])) {
      specificationBlockers.push("At least one commercial area field is required.");
    }
  }
  if (capability.land) {
    if (!toNumberOrUndefined(draft.specs.area.landAreaValue)) specificationBlockers.push("Land area value is required.");
    if (!draft.specs.area.landAreaUnit) specificationBlockers.push("Land area unit is required.");
    if (!draft.landRecord.mouza.trim()) specificationBlockers.push("Mouza is required.");
    if (!draft.landRecord.surveyOrGatNo.trim()) specificationBlockers.push("Survey or Gat number is required.");
    if (!draft.landRecord.taluka.trim()) specificationBlockers.push("Taluka is required.");
    if (!draft.landRecord.district.trim()) specificationBlockers.push("District is required.");
  }

  const pricingBlockers: string[] = [];
  const pricingWarnings: string[] = [];
  const pricingModelForValidation = draft.pricing.rent.pricingModel || draft.specs.accommodation.rentalModel;
  if (draft.dealIntent === "sale") {
    if (!draft.pricing.sale.priceOnRequest && !toNumberOrUndefined(draft.pricing.sale.expectedPrice)) {
      pricingBlockers.push("Expected price is required unless price on request is enabled.");
    }
  } else if (pricingModelForValidation === "per_room") {
    if (!toNumberOrUndefined(draft.pricing.rent.perRoomAmount)) pricingBlockers.push("Per room amount is required.");
  } else if (pricingModelForValidation === "per_bed") {
    if (!toNumberOrUndefined(draft.pricing.rent.perBedAmount)) pricingBlockers.push("Per bed amount is required.");
  } else if (!toNumberOrUndefined(draft.pricing.rent.monthlyRent)) {
    pricingBlockers.push(draft.dealIntent === "lease" ? "Monthly lease amount is required." : "Monthly rent is required.");
  }
  if (draft.dealIntent === "lease") {
    if (!toNumberOrUndefined(draft.pricing.rent.leaseDurationMonths)) pricingWarnings.push("Lease duration is recommended.");
    if (!toNumberOrUndefined(draft.pricing.rent.lockInMonths)) pricingWarnings.push("Lock-in period is recommended.");
  }

  const amenitiesWarnings: string[] = [];
  if (!draft.highlights.length) amenitiesWarnings.push("Add at least one highlight for stronger review output.");

  const mediaBlockers: string[] = [];
  const photoItems = mediaItems.filter((item) => item.type === "photo");
  if (!mediaItems.length) mediaBlockers.push("At least one media item is required.");
  if (photoItems.length < 1) mediaBlockers.push("At least 1 photo is required for publish.");
  if (!coverMediaId) mediaBlockers.push("Cover media is required.");

  const sections: DraftSectionStatus[] = [
    { key: "basics", label: "Basics", complete: basicsBlockers.length === 0, blockers: basicsBlockers, warnings: [] },
    { key: "location", label: "Location", complete: locationBlockers.length === 0, blockers: locationBlockers, warnings: [] },
    {
      key: "specifications",
      label: "Specifications",
      complete: specificationBlockers.length === 0,
      blockers: specificationBlockers,
      warnings: specificationWarnings
    },
    { key: "pricing", label: "Pricing", complete: pricingBlockers.length === 0, blockers: pricingBlockers, warnings: pricingWarnings },
    { key: "amenities", label: "Amenities & Highlights", complete: true, blockers: [], warnings: amenitiesWarnings },
    { key: "media", label: "Media", complete: mediaBlockers.length === 0, blockers: mediaBlockers, warnings: [] }
  ];

  sections.forEach((section) => {
    blockers.push(...section.blockers);
    warnings.push(...section.warnings);
  });

  return {
    blockers,
    warnings,
    sections,
    publicSummary: [
      { label: "Title", value: draft.title.trim() || "Untitled listing" },
      { label: "Deal", value: toDisplayLabel(draft.dealIntent) },
      { label: "Category", value: toDisplayLabel(draft.category) },
      { label: "Type", value: toDisplayLabel(draft.propertyType) },
      {
        label: "Location",
        value: [draft.location.locality.trim(), draft.location.citySlug.trim()].filter(Boolean).join(", ") || "Location pending"
      },
      {
        label: draft.dealIntent === "sale" ? "Expected price" : "Rent",
        value:
          draft.dealIntent === "sale"
            ? draft.pricing.sale.priceOnRequest
              ? "On request"
              : draft.pricing.sale.expectedPrice || "Not set"
            : pricingModelForValidation === "per_bed"
            ? draft.pricing.rent.perBedAmount || "Not set"
            : pricingModelForValidation === "per_room"
            ? draft.pricing.rent.perRoomAmount || "Not set"
            : draft.pricing.rent.monthlyRent || "Not set"
      },
      {
        label: draft.dealIntent === "sale" ? "Pricing basis" : "Pricing model",
        value:
          draft.dealIntent === "sale"
            ? draft.pricing.sale.priceOnRequest
              ? "Price on request"
              : draft.pricing.sale.expectedPriceUnit === "total"
              ? "Total listing price"
              : `Per ${draft.pricing.sale.expectedPriceUnit}`
            : pricingModelForValidation
            ? toDisplayLabel(pricingModelForValidation)
            : "Not set"
      },
      ...(draft.dealIntent === "sale"
        ? [
            {
              label: "Derived price per sqft",
              value: draft.pricing.sale.priceOnRequest ? "Hidden" : maybeAutoComputePricePerSqFt(draft) || draft.pricing.sale.pricePerSqFt || "Not available"
            }
          ]
        : [])
    ],
    mediaReadiness: [
      {
        label: "Gallery",
        ready: photoItems.length >= 1,
        detail: photoItems.length >= 1 ? `${photoItems.length} photo(s) ready.` : "Add at least 1 photo."
      },
      {
        label: "Cover media",
        ready: Boolean(coverMediaId),
        detail: coverMediaId ? "Cover media selected." : "Select a cover photo."
      }
    ],
    legalReadiness: capability.land
      ? [
          { label: "Mouza", ready: Boolean(draft.landRecord.mouza.trim()), detail: draft.landRecord.mouza.trim() || "Required" },
          {
            label: "Survey / Gat",
            ready: Boolean(draft.landRecord.surveyOrGatNo.trim()),
            detail: draft.landRecord.surveyOrGatNo.trim() || "Required"
          },
          { label: "Taluka", ready: Boolean(draft.landRecord.taluka.trim()), detail: draft.landRecord.taluka.trim() || "Required" },
          { label: "District", ready: Boolean(draft.landRecord.district.trim()), detail: draft.landRecord.district.trim() || "Required" },
          {
            label: "Title clarity",
            ready: draft.landRecord.titleClear,
            detail: draft.landRecord.titleClear ? "Marked clear." : "Not confirmed."
          }
        ]
      : []
  };
}














