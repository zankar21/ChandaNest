import { z } from "zod";
import { isSafeObjectPath } from "../../utils/objectPath";
import {
  AVAILABILITY_STATUS,
  DEFAULTS,
  LISTING_MODE,
  LISTING_DEAL_TYPE,
  NA_STATUS,
  PROPERTY_TYPE,
  UNIT_TYPE
} from "../../constants/propertyEnums";

export const DealIntentSchema = z.enum(["sale", "rent", "lease", "joint_venture"]);
export const PublishStateSchema = z.enum(["draft", "published", "unpublished"]);
const CATEGORY_SCHEMA = z.enum(["residential", "commercial", "land_plot"]);
const CATEGORY_TYPE_SCHEMA = z.enum([
  "flat",
  "house",
  "villa",
  "row_house",
  "studio",
  "room",
  "shop",
  "office",
  "warehouse",
  "industrial_shed",
  "showroom",
  "plot",
  "land",
  "pg"
]);
const PROPERTY_TYPE_SCHEMA = z.enum([
  "flat",
  "house",
  "villa",
  "row_house",
  "studio",
  "room",
  "shop",
  "office",
  "warehouse",
  "industrial_shed",
  "showroom",
  "plot",
  "land",
  "pg"
]);
const CATEGORY_TYPE_MAP: Record<z.infer<typeof CATEGORY_SCHEMA>, string[]> = {
  residential: ["flat", "house", "villa", "row_house", "studio", "pg", "room"],
  commercial: ["shop", "office", "warehouse", "industrial_shed", "showroom"],
  land_plot: ["plot", "land"]
};

const mediaItemSchema = z.object({
  objectPath: z.string().min(5),
  id: z.string().optional(),
  kind: z.enum(["image", "video", "doc"]).optional(),
  caption: z.string().max(200).optional(),
  isCover: z.boolean().optional(),
  createdAt: z.string().optional()
});

const mediaItemInputSchema = z.preprocess((val) => {
  if (typeof val === "string") return { objectPath: val };
  if (val && typeof val === "object" && typeof (val as any).storagePath === "string" && !(val as any).objectPath) {
    return { ...(val as any), objectPath: (val as any).storagePath };
  }
  return val;
}, mediaItemSchema);

const documentSchema = z.object({
  objectPath: z.string().min(5),
  title: z.string().min(1).optional(),
  id: z.string().optional(),
  kind: z.enum(["pdf", "image"]).optional(),
  label: z.string().min(1).optional(),
  createdAt: z.string().optional()
});

const landDocumentSchema = z.object({
  objectPath: z.string().min(5),
  fileName: z.string().max(120).optional(),
  contentType: z.string().optional()
});

const landDocumentsSchema = z
  .object({
    extract712: z.union([landDocumentSchema, z.null()]).optional(),
    naOrder: z.union([landDocumentSchema, z.null()]).optional(),
    other: z.union([landDocumentSchema, z.null()]).optional()
  })
  .optional();

const documentsSchema = z
  .object({
    land: landDocumentsSchema.optional()
  })
  .optional();

const mediaSchema = z
  .object({
    hero: z.union([mediaItemInputSchema, z.null()]).optional(),
    gallery: z.array(mediaItemInputSchema).optional(),
    documents: z.array(documentSchema).optional()
  })
  .optional();

const mediaListItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["photo", "video", "doc"]),
  url: z
    .string()
    .min(3)
    .refine((val) => !/^https?:\/\//i.test(val), "Invalid media object path")
    .refine((val) => isSafeObjectPath(val), "Invalid media object path"),
  caption: z.string().max(200).optional(),
  sortOrder: z.number().int().nonnegative()
});

const mediaListSchema = z.array(mediaListItemSchema);

export const LocationSchema = z
  .object({
    citySlug: z.string().min(1),
    locality: z.string().min(1),
    addressLine: z.string().optional(),
    landmark: z.string().optional(),
    showExactAddress: z.boolean().optional(),
    mouza: z.string().optional(),
    tahsil: z.string().optional(),
    taluka: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    geo: z
      .object({
        lat: z.number(),
        lng: z.number()
      })
      .optional()
  })
  .superRefine((val, ctx) => {
    const lat = val.geo?.lat ?? val.lat;
    const lng = val.geo?.lng ?? val.lng;
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Latitude out of range", path: ["geo", "lat"] });
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Longitude out of range", path: ["geo", "lng"] });
    }
  })
  .transform((val) => {
    const geo =
      val.geo ??
      (val.lat !== undefined && val.lng !== undefined ? { lat: val.lat, lng: val.lng } : undefined);
    return {
      ...val,
      geo,
      lat: undefined,
      lng: undefined
    };
  });

const landSpecsSchema = z.object({
  landType: z.string().optional(),
  plotAreaSqFt: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  facing: z.string().optional(),
  corner: z.boolean().optional(),
  roadWidth: z.number().positive().optional(),
  roadWidthFeet: z.number().positive().optional(),
  plotLengthFeet: z.number().positive().optional(),
  plotWidthFeet: z.number().positive().optional(),
  plotInLayout: z.boolean().optional(),
  layoutName: z.string().optional()
});

const plotInfoSchema = z.object({
  layoutApproved: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  facing: z.string().optional()
});

const flatSpecsSchema = z.object({
  unitNo: z.string().optional(),
  tower: z.string().optional(),
  societyName: z.string().optional(),
  floor: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  totalFloors: z.number().int().nonnegative().optional(),
  bhk: z.number().int().positive().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  carpetAreaSqFt: z.number().positive().optional(),
  builtUpAreaSqFt: z.number().positive().optional(),
  superBuiltUpAreaSqFt: z.number().positive().optional(),
  facing: z.string().optional(),
  parking: z.enum(["none", "open", "covered", "both"]).optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully", "semi_furnished", "fully_furnished"]).optional(),
  balconyCount: z.number().int().nonnegative().optional(),
  buildingAgeYears: z.number().int().nonnegative().optional(),
  ageYears: z.number().int().nonnegative().optional(),
  lift: z.boolean().optional(),
  powerBackup: z.boolean().optional(),
  waterSupply: z.enum(["municipal", "borewell", "both", "tanker", "other"]).optional(),
  possessionStatus: z.enum(["ready", "under_construction"]).optional()
});

const villaSpecsSchema = z.object({
  plotAreaSqFt: z.number().positive().optional(),
  builtUpAreaSqFt: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  facing: z.string().optional()
});

const commercialSpecsSchema = z.object({
  floor: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  blockWing: z.string().optional(),
  cornerUnit: z.boolean().optional(),
  facing: z.string().optional(),
  carpetSqFt: z.number().positive().optional(),
  builtUpSqFt: z.number().positive().optional(),
  saleableSqFt: z.number().positive().optional(),
  fitOutStatus: z.enum(["shell", "semi_furnished", "furnished"]).optional(),
  tenancyType: z.enum(["sale", "rent", "lease", "license"]).optional(),
  possessionStatus: z.enum(["ready", "under_construction"]).optional(),
  frontageFt: z.number().positive().optional(),
  depthFt: z.number().positive().optional(),
  ceilingHeightFt: z.number().positive().optional(),
  shutterType: z.enum(["manual", "motorized"]).optional(),
  washroom: z.boolean().optional(),
  signageAllowed: z.boolean().optional(),
  waterConnection: z.boolean().optional(),
  powerLoadKw: z.number().nonnegative().optional(),
  fireSafetyReady: z.boolean().optional(),
  nearEntrance: z.boolean().optional(),
  nearEscalator: z.boolean().optional(),
  nearAnchor: z.boolean().optional(),
  dedicatedParking: z.number().int().nonnegative().optional(),
  office: z
    .object({
      seatingCapacity: z.number().int().nonnegative().optional(),
      cabins: z.number().int().nonnegative().optional(),
      meetingRooms: z.number().int().nonnegative().optional(),
      serverRoom: z.boolean().optional(),
      pantry: z.boolean().optional(),
      hvacType: z.string().optional(),
      furnishing: z.enum(["unfurnished", "semi_furnished", "furnished"]).optional(),
      liftAccess: z.boolean().optional(),
      businessParkGrade: z.string().optional()
    })
    .optional(),
  warehouse: z
    .object({
      plotAreaSqFt: z.number().positive().optional(),
      builtUpSqFt: z.number().positive().optional(),
      clearHeightFt: z.number().positive().optional(),
      dockingBays: z.number().int().nonnegative().optional(),
      gateWidthFt: z.number().positive().optional(),
      flooringType: z.string().optional(),
      craneProvision: z.boolean().optional(),
      truckTurning: z.boolean().optional(),
      fireNocReady: z.boolean().optional(),
      powerLoadKw: z.number().nonnegative().optional(),
      waterConnection: z.boolean().optional()
    })
    .optional(),
  showroom: z
    .object({
      glassFacade: z.boolean().optional(),
      displayAreaSqFt: z.number().positive().optional(),
      storageAreaSqFt: z.number().positive().optional(),
      loadingAccess: z.boolean().optional(),
      signageType: z.enum(["standard", "large", "facade", "totem"]).optional(),
      roadExposure: z.enum(["highway", "main_road", "market_road", "internal_road"]).optional()
    })
    .optional()
});

export const SaleDetailsSchema = z.object({
  saleType: z.enum(["new_booking", "resale"]).optional(),
  priceOnRequest: z.boolean().optional(),
  totalPrice: z.number().positive().optional(),
  ratePerSqFt: z.number().positive().optional(),
  priceUnit: z.enum(["total", "sqft"]).optional(),
  allInclusivePrice: z.boolean().optional(),
  maintenanceMonthly: z.number().positive().optional(),
  negotiable: z.boolean().optional()
});

const landRecordSchema = z.object({
  landType: z.enum(["agricultural", "na", "farm", "industrial", "open"]).optional(),
  mouza: z.string().optional(),
  surveyOrGatNo: z.string().optional(),
  hissaNo: z.string().optional(),
  wardOrWarg: z.string().optional(),
  warg: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  boundaryWall: z.boolean().optional(),
  plotShape: z.string().optional(),
  frontageFeet: z.number().positive().optional(),
  is712Available: z.boolean().optional(),
  is8AAvailable: z.boolean().optional(),
  naStatus: z.enum(NA_STATUS).optional(),
  layoutApproved: z.boolean().optional(),
  titleClear: z.boolean().optional(),
  litigation: z.boolean().optional(),
  litigationNotes: z.string().optional(),
  roadAccess: z.boolean().optional(),
  waterSource: z.enum(["none", "well", "borewell", "canal"]).optional(),
  electricity: z.boolean().optional()
});

const rentalDetailsSchema = z
  .object({
    rentalModel: z.enum(["whole_unit", "single_room", "shared_room", "per_bed"]).optional(),
    accommodationType: z.enum(["standard_home", "pg", "room"]).optional(),
    configuration: z.enum(["1rk", "1bhk", "2bhk", "3bhk", "4bhk_plus"]).optional(),
    rentalType: z
      .enum(["family_rent", "single_room", "shared_room", "pg", "1rk", "1bhk", "2bhk"])
      .optional(),
    pricing: z
      .object({
        monthlyRent: z.number().positive().optional(),
        rentPerBed: z.number().positive().optional(),
        deposit: z.number().positive().optional(),
        lockInMonths: z.number().int().positive().optional(),
        maintenanceMonthly: z.number().positive().optional(),
        noticePeriodDays: z.number().int().positive().optional(),
        electricityIncluded: z.boolean().optional(),
        waterIncluded: z.boolean().optional()
      })
      .optional(),
    availability: z
      .object({
        availableFrom: z.string().optional(),
        totalUnits: z.number().int().nonnegative().optional(),
        availableUnits: z.number().int().nonnegative().optional(),
        totalBeds: z.number().int().nonnegative().optional(),
        availableBeds: z.number().int().nonnegative().optional(),
        occupiedBeds: z.number().int().nonnegative().optional(),
        minimumStayMonths: z.number().int().positive().optional()
      })
      .optional(),
    suitability: z
      .object({
        suitableFor: z.array(z.enum(["student", "bachelor", "family", "working_professional"])).optional(),
        preferredGender: z.enum(["male", "female", "boys", "girls", "any"]).optional(),
        genderPreference: z.enum(["male", "female", "boys", "girls", "any"]).optional(),
        vegOnly: z.boolean().optional(),
        studentsOnly: z.boolean().optional(),
        workingOnly: z.boolean().optional()
      })
      .optional(),
    furnishing: z
      .object({
        level: z.enum(["unfurnished", "semi_furnished", "fully_furnished"]).optional(),
        includes: z.array(z.string().min(1)).optional()
      })
      .optional(),
    facilities: z
      .array(
        z.enum([
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
        ])
      )
      .optional(),
    pg: z
      .object({
        sharingType: z.enum(["single", "double", "triple", "dormitory", "four_plus"]).optional(),
        foodIncluded: z.boolean().optional(),
        mealsPerDay: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
        attachedBathroom: z.boolean().optional(),
        gateClosingTime: z.string().optional(),
        visitorsAllowed: z.boolean().optional(),
        smokingAllowed: z.boolean().optional(),
        alcoholAllowed: z.boolean().optional(),
        mealsIncluded: z.boolean().optional(),
        mealsNote: z.string().optional(),
        curfewTime: z.string().optional(),
        laundryIncluded: z.boolean().optional(),
        electricityIncluded: z.boolean().optional(),
        waterIncluded: z.boolean().optional(),
        rulesNote: z.string().optional()
      })
      .optional(),
    room: z
      .object({
        roomSizeSqFt: z.number().positive().optional(),
        attachedBathroom: z.boolean().optional(),
        balcony: z.boolean().optional(),
        furnishing: z.enum(["unfurnished", "semi_furnished", "fully_furnished"]).optional(),
        ac: z.boolean().optional(),
        wifi: z.boolean().optional()
      })
      .optional(),
    building: z
      .object({
        floor: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
        totalFloors: z.number().int().nonnegative().optional(),
        lift: z.boolean().optional(),
        parking: z.boolean().optional(),
        cctv: z.boolean().optional(),
        security: z.boolean().optional()
      })
      .optional(),
    commercial: z
      .object({
        camCharges: z.number().positive().optional(),
        escalationPct: z.number().nonnegative().optional(),
        powerLoadKw: z.number().nonnegative().optional(),
        parkingCount: z.number().int().nonnegative().optional(),
        fitoutStatus: z.enum(["shell", "semi_furnished", "furnished"]).optional()
      })
      .optional()
  })
  .optional();

const areaSchema = z.object({
  value: z.number().positive().optional(),
  unit: z.enum(["sqft", "sqm", "acre", "hectare"]).optional()
});

const contactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  preferred: z.enum(["call", "whatsapp", "both"]).optional(),
  preferredContactTime: z.enum(["morning", "afternoon", "evening", "any"]).optional()
});

const descriptionSchema = z.union([
  z.string(),
  z.object({
    user: z.string().optional(),
    ai: z.string().optional(),
    active: z.enum(["user", "ai"]).optional(),
    aiMeta: z
      .object({
        model: z.string().min(1),
        generatedAt: z.string().min(1),
        sourceHash: z.string().min(1)
      })
      .optional()
  })
]);

function pickTruthOnlyListingFields<T extends Record<string, any>>(input: T): T {
  return {
    mode: input.mode,
    dealIntent: input.dealIntent,
    category: input.category,
    categoryType: input.categoryType,
    propertyType: input.propertyType,
    title: input.title,
    description: input.description,
    brokeragePartnerId: input.brokeragePartnerId,
    saleDetails: input.saleDetails,
    rentalDetails: input.rentalDetails,
    amenities: input.amenities,
    highlights: input.highlights,
    location: input.location,
    enterpriseId: input.enterpriseId,
    publishState: input.publishState,
    recordStatus: input.recordStatus,
    source: input.source,
    internalReferenceId: input.internalReferenceId,
    ownerOrBuilderName: input.ownerOrBuilderName,
    assignedToUid: input.assignedToUid,
    tags: input.tags,
    leadPriority: input.leadPriority,
    expiryDate: input.expiryDate,
    specs: input.specs,
    plotInfo: input.plotInfo,
    landRecord: input.landRecord,
    area: input.area,
    contact: input.contact,
    media: input.media,
    mediaItems: input.mediaItems,
    coverMediaId: input.coverMediaId,
    documents: input.documents,
    projectId: input.projectId,
    unitType: input.unitType,
    unit: input.unit,
    availability: input.availability,
    ownerConsent: input.ownerConsent,
    ownerConsentMode: input.ownerConsentMode,
    exclusiveListing: input.exclusiveListing,
    brokerageApplicable: input.brokerageApplicable,
    brokerageType: input.brokerageType,
    brokerageValue: input.brokerageValue,
    brokerageNotes: input.brokerageNotes,
    internalNotes: input.internalNotes,
    expiresAt: input.expiresAt
  } as unknown as T;
}

function rejectLegacyTruthFields(val: Record<string, any>, ctx: z.RefinementCtx) {
  if ("type" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use dealIntent instead of type", path: ["type"] });
  }
  if ("purpose" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: purpose is forbidden", path: ["purpose"] });
  }
  if ("price" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use saleDetails instead of price", path: ["price"] });
  }
  if ("pricing" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use saleDetails/rentalDetails instead of pricing", path: ["pricing"] });
  }
  if ("rental" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use rentalDetails instead of rental", path: ["rental"] });
  }
  if ("visibility" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use publishState instead of visibility", path: ["visibility"] });
  }
  if ("listingStatus" in val) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: listingStatus is not used in V3", path: ["listingStatus"] });
  }
  if (val.category === "land") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use category land_plot", path: ["category"] });
  }
  if (val.propertyType === "apartment") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "legacy fields not allowed: use propertyType flat", path: ["propertyType"] });
  }
}

const baseListingSchema = z.object({
  mode: z.enum(LISTING_MODE),
  dealIntent: DealIntentSchema,
  category: CATEGORY_SCHEMA.optional(),
  categoryType: CATEGORY_TYPE_SCHEMA.optional(),
  propertyType: PROPERTY_TYPE_SCHEMA,
  title: z.string().min(3),
  description: descriptionSchema.optional(),
  brokeragePartnerId: z.literal(DEFAULTS.brokeragePartnerId),
  saleDetails: SaleDetailsSchema.optional(),
  amenities: z.array(z.string().min(1)).optional(),
  highlights: z.array(z.string().min(1)).optional(),
  location: LocationSchema.optional(),
  enterpriseId: z.string().optional(),
  publishState: PublishStateSchema.optional(),
  recordStatus: z.enum(["active", "inactive"]).optional(),
  source: z.enum(["manual", "import_csv", "api"]).optional(),
  internalReferenceId: z.string().optional(),
  ownerOrBuilderName: z.string().optional(),
  assignedToUid: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  leadPriority: z.enum(["low", "medium", "high"]).optional(),
  expiryDate: z.string().optional(),
  specs: z
    .object({
      land: landSpecsSchema.optional(),
      flat: flatSpecsSchema.optional(),
      villa: villaSpecsSchema.optional(),
      house: flatSpecsSchema.optional(),
      commercial: commercialSpecsSchema.optional()
    })
    .optional(),
  plotInfo: plotInfoSchema.optional(),
  landRecord: landRecordSchema.optional(),
  area: areaSchema.optional(),
  contact: contactSchema.optional(),
  rentalDetails: rentalDetailsSchema,
  media: mediaSchema,
  mediaItems: mediaListSchema.optional(),
  coverMediaId: z.string().min(1).optional(),
  documents: documentsSchema,
  projectId: z.string().optional(),
  unitType: z.enum(UNIT_TYPE).optional(),
  unit: z
    .object({
      plot: landSpecsSchema.optional(),
      flat: flatSpecsSchema.optional(),
      villa: villaSpecsSchema.optional(),
      plotNo: z.string().optional(),
      unitNo: z.string().optional()
    })
    .optional(),
  availability: z.enum(AVAILABILITY_STATUS).optional(),
  ownerConsent: z.boolean().optional(),
  ownerConsentMode: z.enum(["call_recorded", "whatsapp_confirm", "written"]).optional(),
  exclusiveListing: z.boolean().optional(),
  brokerageApplicable: z.boolean().optional(),
  brokerageType: z.enum(["percentage", "fixed"]).optional(),
  brokerageValue: z.number().positive().optional(),
  brokerageNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  expiresAt: z.string().optional()
}).passthrough();

function requireField(condition: boolean, ctx: z.RefinementCtx, message: string, path: (string | number)[]) {
  if (!condition) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
  }
}

function addRentalDetailsRules(val: any, ctx: z.RefinementCtx) {
  const monthlyRent = val.rentalDetails?.pricing?.monthlyRent;
  const rentPerBed = val.rentalDetails?.pricing?.rentPerBed;
  const rentalType = val.rentalDetails?.rentalType;
  const rentalModel =
    val.rentalDetails?.rentalModel ||
    (rentalType === "shared_room"
      ? "shared_room"
      : rentalType === "single_room"
      ? "single_room"
      : rentalType === "pg"
      ? "per_bed"
      : rentalType
      ? "whole_unit"
      : undefined);
  const accommodationType =
    val.rentalDetails?.accommodationType ||
    (val.propertyType === "pg"
      ? "pg"
      : val.propertyType === "room"
      ? "room"
      : rentalType === "pg"
      ? "pg"
      : rentalType === "single_room" || rentalType === "shared_room"
      ? "room"
      : "standard_home");
  const isPgRoom = val.propertyType === "pg" || val.propertyType === "room" || accommodationType === "pg" || accommodationType === "room";
  const isCommercial = val.category === "commercial";
  const isLandPlot = val.category === "land_plot";

  // Residential rent rules are model-driven:
  // - whole_unit => monthlyRent
  // - shared_room/per_bed => rentPerBed
  // - single_room => monthlyRent or rentPerBed
  if (val.dealIntent === "rent" || val.dealIntent === "lease") {
    if (isLandPlot) {
      requireField(Boolean(monthlyRent), ctx, "monthlyRent is required for land/plot rent/lease listings", [
        "rentalDetails",
        "pricing",
        "monthlyRent"
      ]);
      if (rentalModel && rentalModel !== "whole_unit") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "land/plot rent listings must use rentalModel=whole_unit",
          path: ["rentalDetails", "rentalModel"]
        });
      }
      return;
    }
    if (isCommercial) {
      requireField(Boolean(monthlyRent), ctx, "monthlyRent is required for commercial rent/lease listings", [
        "rentalDetails",
        "pricing",
        "monthlyRent"
      ]);
      if (rentalModel && rentalModel !== "whole_unit") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "commercial rent listings must use rentalModel=whole_unit",
          path: ["rentalDetails", "rentalModel"]
        });
      }
      const commercialSpecs = val.specs?.commercial || {};
      requireField(
        Boolean(commercialSpecs.carpetSqFt || commercialSpecs.builtUpSqFt || commercialSpecs.saleableSqFt),
        ctx,
        "at least one commercial area (carpet/built-up/saleable) is required",
        ["specs", "commercial"]
      );
      return;
    }
    if (rentalModel === "shared_room" || rentalModel === "per_bed") {
      requireField(Boolean(rentPerBed), ctx, "rentPerBed is required for shared/per-bed rentals", ["rentalDetails", "pricing", "rentPerBed"]);
    } else if (rentalModel === "single_room") {
      requireField(Boolean(monthlyRent || rentPerBed), ctx, "monthlyRent or rentPerBed is required", ["rentalDetails", "pricing"]);
    } else {
      requireField(Boolean(monthlyRent), ctx, "monthlyRent is required for whole unit rentals", ["rentalDetails", "pricing", "monthlyRent"]);
    }
  }

  // PG/room operational listings must include sharing type when the model is shared/per-bed.
  if (isPgRoom && (rentalModel === "shared_room" || rentalModel === "per_bed" || accommodationType === "pg")) {
    requireField(
      Boolean(val.rentalDetails?.pg?.sharingType),
      ctx,
      "sharingType is required for PG/room shared rentals",
      ["rentalDetails", "pg", "sharingType"]
    );
  }
}

export const CreatePropertySchema = baseListingSchema
  .superRefine((val, ctx) => {
  rejectLegacyTruthFields(val, ctx);
  if (val.category) {
    const allowedTypes = CATEGORY_TYPE_MAP[val.category];
    if (val.categoryType && !allowedTypes.includes(val.categoryType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryType does not match category",
        path: ["categoryType"]
      });
    }
    if (val.propertyType && !allowedTypes.includes(val.propertyType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyType does not match category",
        path: ["propertyType"]
      });
    }
    if (val.categoryType && val.propertyType && val.categoryType !== val.propertyType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryType must match propertyType",
        path: ["categoryType"]
      });
    }
    if (val.category === "land_plot") {
      requireField(!!val.area?.value, ctx, "area value is required for land/plot listings", ["area", "value"]);
      requireField(!!val.area?.unit, ctx, "area unit is required for land/plot listings", ["area", "unit"]);
      requireField(!!val.landRecord?.mouza, ctx, "mouza is required for land/plot listings", ["landRecord", "mouza"]);
        requireField(
          !!val.landRecord?.surveyOrGatNo,
          ctx,
          "surveyOrGatNo is required for land/plot listings",
          ["landRecord", "surveyOrGatNo"]
        );
      requireField(!!val.landRecord?.taluka, ctx, "taluka is required for land/plot listings", ["landRecord", "taluka"]);
      requireField(
        !!val.landRecord?.district,
          ctx,
          "district is required for land/plot listings",
          ["landRecord", "district"]
        );
    }
  }
  if (val.mode === "independent") {
    requireField(!!val.location?.citySlug, ctx, "citySlug is required for independent listings", ["location", "citySlug"]);
    requireField(!!val.location?.locality, ctx, "locality is required for independent listings", ["location", "locality"]);
  }
  if (val.mode === "project_unit") {
    requireField(!!val.projectId, ctx, "projectId is required for project units", ["projectId"]);
    requireField(!!val.unitType, ctx, "unitType is required for project units", ["unitType"]);
    requireField(!!val.availability, ctx, "availability is required for project units", ["availability"]);
  }
  if (val.ownerConsent) {
    requireField(!!val.ownerConsentMode, ctx, "ownerConsentMode is required when ownerConsent is true", ["ownerConsentMode"]);
  }
  if (val.brokerageApplicable) {
    requireField(!!val.brokerageType, ctx, "brokerageType is required when brokerageApplicable is true", ["brokerageType"]);
    requireField(
      typeof val.brokerageValue === "number" && val.brokerageValue > 0,
      ctx,
      "brokerageValue is required when brokerageApplicable is true",
      ["brokerageValue"]
    );
  }
  if (val.coverMediaId && Array.isArray(val.mediaItems)) {
    const hasMatch = val.mediaItems.some((item) => item?.id === val.coverMediaId);
    requireField(hasMatch, ctx, "coverMediaId must match one of mediaItems.id", ["coverMediaId"]);
  }
  if (val.coverMediaId && !Array.isArray(val.mediaItems)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "mediaItems is required when coverMediaId is provided",
      path: ["mediaItems"]
    });
  }
  addRentalDetailsRules(val, ctx);
})
  .transform((val) => pickTruthOnlyListingFields(val));
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;

export const PatchPropertySchema = baseListingSchema
  .deepPartial()
  .superRefine((val, ctx) => {
  rejectLegacyTruthFields(val as Record<string, any>, ctx);
  const hasOwnerConsentFlag = val.ownerConsent === true || val.ownerConsent === false;
  const hasOwnerConsentMode = typeof val.ownerConsentMode === "string" && val.ownerConsentMode.length > 0;
  if (val.ownerConsent === true && !val.ownerConsentMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ownerConsentMode is required when ownerConsent is true",
      path: ["ownerConsentMode"]
    });
  }
  if (hasOwnerConsentMode && !hasOwnerConsentFlag) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ownerConsent is required when ownerConsentMode is provided",
      path: ["ownerConsent"]
    });
  }

  const hasBrokerageApplicable = val.brokerageApplicable === true || val.brokerageApplicable === false;
  const hasBrokerageType = typeof val.brokerageType === "string" && val.brokerageType.length > 0;
  const hasBrokerageValue = typeof val.brokerageValue === "number";
  const requiresBrokerageDetails = val.brokerageApplicable === true || hasBrokerageType || hasBrokerageValue;

  if (requiresBrokerageDetails && val.brokerageApplicable !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "brokerageApplicable must be true when brokerage details are provided",
      path: ["brokerageApplicable"]
    });
  }
  if (val.brokerageApplicable === true) {
    if (!val.brokerageType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "brokerageType is required when brokerageApplicable is true",
        path: ["brokerageType"]
      });
    }
    if (!(typeof val.brokerageValue === "number" && val.brokerageValue > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "brokerageValue is required when brokerageApplicable is true",
        path: ["brokerageValue"]
      });
    }
  }
  if (val.coverMediaId && Array.isArray(val.mediaItems)) {
    const hasMatch = val.mediaItems.some((item) => item?.id === val.coverMediaId);
    if (!hasMatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "coverMediaId must match one of mediaItems.id",
        path: ["coverMediaId"]
      });
    }
  }
  if (val.coverMediaId && !Array.isArray(val.mediaItems)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "mediaItems is required when coverMediaId is provided",
      path: ["mediaItems"]
    });
  }
  addRentalDetailsRules(val, ctx);
})
  .transform((val) => pickTruthOnlyListingFields(val));
export type PatchPropertyInput = z.infer<typeof PatchPropertySchema>;

export const SubmitPropertySchema = baseListingSchema
  .superRefine((val, ctx) => {
  rejectLegacyTruthFields(val, ctx);
  if (val.category) {
    const allowedTypes = CATEGORY_TYPE_MAP[val.category];
    if (val.categoryType && !allowedTypes.includes(val.categoryType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryType does not match category",
        path: ["categoryType"]
      });
    }
    if (val.propertyType && !allowedTypes.includes(val.propertyType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyType does not match category",
        path: ["propertyType"]
      });
    }
    if (val.categoryType && val.propertyType && val.categoryType !== val.propertyType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryType must match propertyType",
        path: ["categoryType"]
      });
    }
    if (val.category === "land_plot") {
      requireField(!!val.area?.value, ctx, "area value is required for land/plot listings", ["area", "value"]);
      requireField(!!val.area?.unit, ctx, "area unit is required for land/plot listings", ["area", "unit"]);
      requireField(!!val.landRecord?.mouza, ctx, "mouza is required for land/plot listings", ["landRecord", "mouza"]);
        requireField(
          !!val.landRecord?.surveyOrGatNo,
          ctx,
          "surveyOrGatNo is required for land/plot listings",
          ["landRecord", "surveyOrGatNo"]
        );
      requireField(!!val.landRecord?.taluka, ctx, "taluka is required for land/plot listings", ["landRecord", "taluka"]);
      requireField(
        !!val.landRecord?.district,
          ctx,
          "district is required for land/plot listings",
          ["landRecord", "district"]
        );
    }
  }
  if (val.mode === "independent") {
    requireField(!!val.location?.citySlug, ctx, "citySlug is required", ["location", "citySlug"]);
    requireField(!!val.location?.locality, ctx, "locality is required", ["location", "locality"]);
    requireField(!!val.contact?.phone, ctx, "contact phone is required", ["contact", "phone"]);
    const descriptionMin = 30;
    const resolveDescriptionText = (input: any) => {
      if (!input) return "";
      if (typeof input === "string") return input;
      if (typeof input === "object") {
        const active = input.active;
        if (active === "ai" && typeof input.ai === "string") return input.ai;
        if (active === "user" && typeof input.user === "string") return input.user;
        if (typeof input.user === "string") return input.user;
        if (typeof input.ai === "string") return input.ai;
      }
      return "";
    };
    const descriptionText = resolveDescriptionText(val.description);
    const hasDescription = descriptionText.trim().length >= descriptionMin;
    requireField(
      hasDescription,
      ctx,
      `description must be at least ${descriptionMin} characters`,
      ["description"]
    );
    const hasHero = Boolean(val.media?.hero?.objectPath);
    const galleryCount = val.media?.gallery?.length ?? 0;
    requireField(
      hasHero || galleryCount >= 1,
      ctx,
      "at least one photo is required",
      hasHero ? ["media", "hero"] : ["media", "gallery"]
    );
    if (val.propertyType === "land" || val.propertyType === "plot") {
      requireField(!!val.area?.value, ctx, "area value is required for land/plot listings", ["area", "value"]);
      requireField(!!val.area?.unit, ctx, "area unit is required for land/plot listings", ["area", "unit"]);
    }
    if (val.propertyType === "land" || val.propertyType === "plot") {
      requireField(!!val.landRecord?.mouza, ctx, "mouza is required for land/plot listings", ["landRecord", "mouza"]);
      requireField(
        !!val.landRecord?.surveyOrGatNo,
        ctx,
        "surveyOrGatNo is required for land/plot listings",
        ["landRecord", "surveyOrGatNo"]
      );
      requireField(!!val.landRecord?.taluka, ctx, "taluka is required for land/plot listings", ["landRecord", "taluka"]);
      requireField(
        !!val.landRecord?.district,
        ctx,
        "district is required for land/plot listings",
        ["landRecord", "district"]
      );
    }
    if (val.propertyType === "flat") {
      requireField(!!val.specs?.flat?.bhk, ctx, "bhk is required for flats", ["specs", "flat", "bhk"]);
      requireField(!!val.specs?.flat?.carpetAreaSqFt, ctx, "carpetAreaSqFt is required for flats", ["specs", "flat", "carpetAreaSqFt"]);
    }
    if (val.propertyType === "villa") {
      requireField(!!val.specs?.villa?.plotAreaSqFt, ctx, "plotAreaSqFt is required for villas", ["specs", "villa", "plotAreaSqFt"]);
      requireField(!!val.specs?.villa?.builtUpAreaSqFt, ctx, "builtUpAreaSqFt is required for villas", ["specs", "villa", "builtUpAreaSqFt"]);
    }
    if (val.propertyType === "house") {
      requireField(!!val.specs?.house?.bhk, ctx, "bhk is required for houses", ["specs", "house", "bhk"]);
      requireField(!!val.specs?.house?.builtUpAreaSqFt, ctx, "builtUpAreaSqFt is required for houses", ["specs", "house", "builtUpAreaSqFt"]);
    }
    if (val.propertyType === "row_house") {
      requireField(!!val.specs?.house?.bhk, ctx, "bhk is required for row houses", ["specs", "house", "bhk"]);
      requireField(
        !!val.specs?.house?.builtUpAreaSqFt,
        ctx,
        "builtUpAreaSqFt is required for row houses",
        ["specs", "house", "builtUpAreaSqFt"]
      );
    }
    if (val.propertyType === "studio") {
      requireField(!!val.specs?.flat?.bhk, ctx, "bhk is required for studios", ["specs", "flat", "bhk"]);
      requireField(
        !!val.specs?.flat?.carpetAreaSqFt,
        ctx,
        "carpetAreaSqFt is required for studios",
        ["specs", "flat", "carpetAreaSqFt"]
      );
    }
    if (val.category === "commercial" && val.dealIntent === "sale") {
      const commercialSpecs = val.specs?.commercial || {};
      const hasCommercialArea = Boolean(
        commercialSpecs.carpetSqFt || commercialSpecs.builtUpSqFt || commercialSpecs.saleableSqFt
      );
      requireField(
        hasCommercialArea,
        ctx,
        "at least one commercial area (carpet/built-up/saleable) is required",
        ["specs", "commercial"]
      );
      const hasCoreCommercialDetails = Boolean(
        commercialSpecs.fitOutStatus ||
          commercialSpecs.possessionStatus ||
          commercialSpecs.floor ||
          commercialSpecs.washroom ||
          commercialSpecs.powerLoadKw ||
          commercialSpecs.signageAllowed
      );
      requireField(
        hasCoreCommercialDetails,
        ctx,
        "commercial details are required (fit-out/possession/floor/washroom/power/signage)",
        ["specs", "commercial"]
      );
    }
  }

  if (val.mode === "project_unit") {
    requireField(!!val.projectId, ctx, "projectId is required", ["projectId"]);
    requireField(!!val.unitType, ctx, "unitType is required", ["unitType"]);
    requireField(!!val.unit, ctx, "unit details are required", ["unit"]);
    requireField(!!val.availability, ctx, "availability is required", ["availability"]);

    if (val.unitType === "plot") {
      requireField(!!val.unit?.plot?.plotAreaSqFt, ctx, "plotAreaSqFt is required for plot units", ["unit", "plot", "plotAreaSqFt"]);
      requireField(!!val.unit?.plotNo, ctx, "plotNo is required for plot units", ["unit", "plotNo"]);
    }
    if (val.unitType === "flat") {
      requireField(!!val.unit?.flat?.bhk, ctx, "bhk is required for flat units", ["unit", "flat", "bhk"]);
      requireField(!!val.unit?.flat?.carpetAreaSqFt, ctx, "carpetAreaSqFt is required for flat units", ["unit", "flat", "carpetAreaSqFt"]);
      requireField(!!val.unit?.unitNo, ctx, "unitNo is required for flat units", ["unit", "unitNo"]);
    }
    if (val.unitType === "villa") {
      requireField(!!val.unit?.villa?.plotAreaSqFt, ctx, "plotAreaSqFt is required for villa units", ["unit", "villa", "plotAreaSqFt"]);
      requireField(!!val.unit?.villa?.builtUpAreaSqFt, ctx, "builtUpAreaSqFt is required for villa units", ["unit", "villa", "builtUpAreaSqFt"]);
    }
  }

  if (val.dealIntent === "sale" && !val.saleDetails?.priceOnRequest) {
    const hasPrice = !!val.saleDetails?.totalPrice || !!val.saleDetails?.ratePerSqFt;
    requireField(
      hasPrice,
      ctx,
      "totalPrice or ratePerSqFt is required for sale",
      ["saleDetails"]
    );
  }
  if (val.ownerConsent) {
    requireField(!!val.ownerConsentMode, ctx, "ownerConsentMode is required when ownerConsent is true", ["ownerConsentMode"]);
  }
  if (val.brokerageApplicable) {
    requireField(!!val.brokerageType, ctx, "brokerageType is required when brokerageApplicable is true", ["brokerageType"]);
    requireField(
      typeof val.brokerageValue === "number" && val.brokerageValue > 0,
      ctx,
      "brokerageValue is required when brokerageApplicable is true",
      ["brokerageValue"]
    );
  }
  if (val.coverMediaId && Array.isArray(val.mediaItems)) {
    const hasMatch = val.mediaItems.some((item) => item?.id === val.coverMediaId);
    requireField(hasMatch, ctx, "coverMediaId must match one of mediaItems.id", ["coverMediaId"]);
  }
  if (val.coverMediaId && !Array.isArray(val.mediaItems)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "mediaItems is required when coverMediaId is provided",
      path: ["mediaItems"]
    });
  }
  addRentalDetailsRules(val, ctx);
})
  .transform((val) => pickTruthOnlyListingFields(val));
export type SubmitPropertyInput = z.infer<typeof SubmitPropertySchema>;

export const ApprovePropertySchema = z.object({
  remarks: z.string().optional()
});
export type ApprovePropertyInput = z.infer<typeof ApprovePropertySchema>;

export const RejectPropertySchema = z.object({
  reason: z.string().min(3)
});
export type RejectPropertyInput = z.infer<typeof RejectPropertySchema>;

export const SetVisibilitySchema = z.object({
  publishState: PublishStateSchema
});
export type SetVisibilityInput = z.infer<typeof SetVisibilitySchema>;

export const FeaturePropertySchema = z.object({
  featured: z.boolean()
});
export type FeaturePropertyInput = z.infer<typeof FeaturePropertySchema>;

export const MediaInitSchema = z.object({
  kind: z.enum(["image", "doc"]),
  contentType: z.string().min(3),
  fileName: z.string().min(1),
  sizeBytes: z.number().int().positive()
});
export type MediaInitInput = z.infer<typeof MediaInitSchema>;

export const MediaCommitSchema = z.object({
  mediaId: z.string().min(6),
  storagePath: z.string().min(5),
  kind: z.enum(["image", "doc"]),
  isCover: z.boolean().optional(),
  caption: z.string().max(200).optional(),
  label: z.string().max(120).optional()
});
export type MediaCommitInput = z.infer<typeof MediaCommitSchema>;

export const MediaUrlSchema = z.object({
  mediaId: z.string().min(6)
});
export type MediaUrlInput = z.infer<typeof MediaUrlSchema>;

export const PublicListQuerySchema = z.object({
  citySlug: z.string().optional(),
  propertyType: PROPERTY_TYPE_SCHEMA.optional(),
  dealIntent: DealIntentSchema.optional(),
  mode: z.enum(LISTING_MODE).optional(),
  projectId: z.string().optional(),
  featured: z.enum(["1", "true"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const ListPropertiesQuerySchema = z.object({
  mine: z.enum(["1", "true"]).optional(),
  projectId: z.string().optional(),
  publishState: PublishStateSchema.optional(),
  recordStatus: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional()
});
