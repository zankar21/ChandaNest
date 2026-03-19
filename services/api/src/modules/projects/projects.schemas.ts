import { z } from "zod";
import type { UnitDoc } from "./projects.types";

export const RecordStatusSchema = z.enum(["active", "inactive"]);
export const ProjectCategorySchema = z.enum(["residential", "plotted", "commercial", "mixed"]);
export const ProjectTypeSchema = z.enum([
  "apartment",
  "villa",
  "row_house",
  "plot_layout",
  "shop",
  "office",
  "showroom",
  "township",
  "mixed_building"
]);
const ProjectTypeInputSchema = z.enum([
  "apartment",
  "villa",
  "row_house",
  "plot_layout",
  "shop",
  "office",
  "showroom",
  "township",
  "mixed_building",
  "plot",
  "commercial",
  "mixed"
]);
export const ProjectLifecycleStatusSchema = z.enum([
  "planning",
  "under_construction",
  "ready",
  "layout_approved",
  "na_approved",
  "ready_for_sale"
]);
export const VisibilityStateSchema = z.enum(["draft", "published"]);

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$|\s+/g, "");
}

const mediaItemSchema = z.object({
  objectPath: z.string().min(5)
});

const extendedMediaItemSchema = z.object({
  objectPath: z.string().min(5),
  url: z.string().url().optional(),
  contentType: z.string().min(1).optional()
});

const mediaSchema = z
  .object({
    cover: z.union([mediaItemSchema, z.null()]).optional(),
    gallery: z.array(mediaItemSchema).optional(),
    brochure: z.union([mediaItemSchema, z.null()]).optional()
  })
  .optional();

const reraSchema = z
  .object({
    number: z.string().min(3).optional(),
    authority: z.string().min(2).optional()
  })
  .optional();

const approvalsSchema = z
  .object({
    layoutApproved: z.boolean().optional(),
    naApproved: z.boolean().optional(),
    fireNocApproved: z.boolean().optional(),
    ocApproved: z.boolean().optional(),
    ccApproved: z.boolean().optional(),
    liftInspectionApproved: z.boolean().optional(),
    tradeLicenseReady: z.boolean().optional()
  })
  .optional();

const locationSchema = z.object({
  city: z.string().min(2),
  citySlug: z.string().min(2).optional(),
  area: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional(),
  landmark: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  district: z.string().min(2).optional(),
  pincode: z.string().min(4).optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

const contactSchema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().min(6).optional(),
    whatsapp: z.string().min(6).optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  })
  .optional();

const configurationMixSchema = z
  .object({
    bhk1: z.number().int().nonnegative().optional(),
    bhk2: z.number().int().nonnegative().optional(),
    bhk3: z.number().int().nonnegative().optional(),
    bhk4: z.number().int().nonnegative().optional()
  })
  .optional();

const inventorySchema = z
  .object({
    totalUnitsPlanned: z.number().int().nonnegative().optional(),
    totalUnits: z.number().int().nonnegative().optional(),
    availableUnits: z.number().int().nonnegative().optional(),
    towers: z.number().int().nonnegative().optional(),
    floors: z.number().int().nonnegative().optional(),
    parking: z.string().optional()
  })
  .optional();

const priceRangeSchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.literal("INR").optional()
  })
  .refine((value) => {
    if (value?.min == null || value?.max == null) return true;
    return value.min <= value.max;
  }, "priceRange.min must be less than or equal to priceRange.max")
  .optional();

const seoSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    shortDescription: z.string().max(160).optional(),
    longDescription: z.string().max(20000).optional(),
    metaTitle: z.string().max(80).optional(),
    metaDescription: z.string().max(160).optional()
  })
  .optional();

const developerSchema = z
  .object({
    logo: z.union([extendedMediaItemSchema, z.null()]).optional(),
    experienceYears: z.number().nonnegative().optional(),
    completedProjectsCount: z.number().int().nonnegative().optional(),
    ongoingProjectsCount: z.number().int().nonnegative().optional()
  })
  .optional();

const salesStatusSchema = z
  .object({
    preLaunch: z.boolean().optional(),
    bookingOpen: z.boolean().optional(),
    constructionLinkedPlan: z.boolean().optional(),
    subventionPlan: z.boolean().optional()
  })
  .optional();

const flagsSchema = z
  .object({
    featured: z.boolean().optional(),
    verified: z.boolean().optional(),
    exclusivePartner: z.boolean().optional(),
    premiumPosition: z.number().int().min(1).max(100).optional()
  })
  .optional();

const plotDetailsSchema = z
  .object({
    totalLandArea: z.number().nonnegative().optional(),
    totalLandAreaUnit: z.enum(["sq_ft", "sq_m", "acre", "hectare"]).optional(),
    totalPlotsPlanned: z.number().int().nonnegative().optional(),
    plotSizeSqFt: z.number().nonnegative().optional(),
    plotCount: z.number().int().nonnegative().optional(),
    plotInventories: z
      .array(
        z
          .object({
            sizeSqFt: z.number().nonnegative().optional(),
            sizeValue: z.number().nonnegative().optional(),
            sizeUnit: z.enum(["sq_ft", "sq_m", "acre", "hectare"]).optional(),
            count: z.number().int().nonnegative(),
            label: z.string().min(1).optional(),
            frontageFt: z.number().nonnegative().optional(),
            depthFt: z.number().nonnegative().optional()
          })
          .superRefine((value, ctx) => {
            const hasAny =
              value.sizeValue != null ||
              value.sizeSqFt != null ||
              value.count != null ||
              value.frontageFt != null ||
              value.depthFt != null ||
              Boolean(value.label);
            if (!hasAny) return;
            const hasSize = value.sizeValue != null || value.sizeSqFt != null;
            if (!hasSize) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "plot size is required",
                path: ["sizeValue"]
              });
            }
            const normalizedSize = value.sizeValue ?? value.sizeSqFt;
            if (normalizedSize != null && normalizedSize <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "plot size must be greater than 0",
                path: ["sizeValue"]
              });
            }
            if (normalizedSize != null && !value.sizeUnit) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "plot size unit is required",
                path: ["sizeUnit"]
              });
            }
            if (value.count <= 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "plot count must be greater than 0",
                path: ["count"]
              });
            }
          })
      )
      .optional(),
    frontageFt: z.number().nonnegative().optional(),
    depthFt: z.number().nonnegative().optional(),
    approvals: z
      .object({
        layoutApproved: z.boolean().optional(),
        naApproved: z.boolean().optional(),
        tpApproved: z.boolean().optional()
      })
      .optional(),
    layoutApproval: z
      .object({
        authority: z.string().min(2).optional(),
        approvalNo: z.string().min(2).optional(),
        approvalDate: isoDateString.optional()
      })
      .optional(),
    naOrder: z
      .object({
        orderNo: z.string().min(2).optional(),
        orderDate: isoDateString.optional()
      })
      .optional(),
    tpApproval: z
      .object({
        office: z.string().min(2).optional(),
        approvalNo: z.string().min(2).optional()
      })
      .optional(),
    revenue: z
      .object({
        mouza: z.string().min(2).optional(),
        taluka: z.string().min(2).optional(),
        district: z.string().min(2).optional(),
        state: z.string().min(2).optional(),
        surveyNo: z.string().min(1).optional(),
        gatNo: z.string().min(1).optional()
      })
      .optional(),
    infra: z
      .object({
        internalRoadType: z.string().min(2).optional(),
        typicalRoadWidthFeet: z.number().nonnegative().optional(),
        waterAvailable: z.boolean().optional(),
        electricityAvailable: z.boolean().optional(),
        drainageAvailable: z.boolean().optional(),
        streetLights: z.boolean().optional(),
        boundaryWall: z.boolean().optional(),
        sewageSystem: z.enum(["septic", "underground_drainage"]).optional(),
        waterSource: z.enum(["borewell", "municipal", "both"]).optional()
      })
      .optional(),
    gatedCommunity: z.boolean().optional(),
    layoutAuthority: z.string().min(2).optional(),
    layoutApprovalNo: z.string().min(2).optional(),
    layoutApprovalDate: isoDateString.optional(),
    naOrderNo: z.string().min(2).optional(),
    naOrderDate: isoDateString.optional(),
    tpOffice: z.string().min(2).optional(),
    tpApprovalNo: z.string().min(2).optional(),
    mouza: z.string().min(2).optional(),
    surveyNo: z.string().min(1).optional(),
    gatNo: z.string().min(1).optional(),
    hissaNo: z.string().min(1).optional(),
    plotNo: z.string().min(1).optional(),
    taluka: z.string().min(2).optional(),
    district: z.string().min(2).optional(),
    roadWidthM: z.number().nonnegative().optional(),
    roadWidthFeet: z.number().nonnegative().optional(),
    roadType: z.string().min(2).optional(),
    internalRoadType: z.enum(["cc", "asphalt", "wbm"]).optional(),
    waterConnection: z.boolean().optional(),
    electricityConnection: z.boolean().optional(),
    drainageConnection: z.boolean().optional(),
    waterSource: z.enum(["borewell", "municipal", "both"]).optional(),
    sewageSystem: z.enum(["septic", "underground_drainage"]).optional(),
    boundaryWall: z.boolean().optional(),
    bankLoanApproved: z.boolean().optional(),
    bankLoanReady: z.boolean().optional(),
    titleClear: z.boolean().optional(),
    litigation: z.boolean().optional(),
    approvedBanks: z.array(z.string().min(2)).optional(),
    possessionTimeline: z.enum(["ready", "6_months", "12_months", "18_months", "2_years", "3_years"]).optional(),
    possessionTimelineNote: z.string().min(2).optional()
  })
  .optional();

const commercialDetailsSchema = z
  .object({
    typicalUnitSizeMinSqFt: z.number().nonnegative().optional(),
    typicalUnitSizeMaxSqFt: z.number().nonnegative().optional(),
    parkingNotes: z.string().min(2).optional(),
    footfallEstimateMinPerDay: z.number().nonnegative().optional(),
    footfallEstimateMaxPerDay: z.number().nonnegative().optional(),
    frontageVisibility: z.enum(["High", "Medium", "Low"]).optional(),
    mainRoadAccess: z.boolean().optional(),
    nearbyAnchor: z.string().min(2).optional()
  })
  .refine((value) => {
    if (value?.typicalUnitSizeMinSqFt == null || value?.typicalUnitSizeMaxSqFt == null) return true;
    return value.typicalUnitSizeMinSqFt <= value.typicalUnitSizeMaxSqFt;
  }, "commercialDetails.typicalUnitSizeMinSqFt must be less than or equal to typicalUnitSizeMaxSqFt")
  .refine((value) => {
    if (value?.footfallEstimateMinPerDay == null || value?.footfallEstimateMaxPerDay == null) return true;
    return value.footfallEstimateMinPerDay <= value.footfallEstimateMaxPerDay;
  }, "commercialDetails.footfallEstimateMinPerDay must be less than or equal to footfallEstimateMaxPerDay")
  .optional();

const commercialMixSchema = z
  .object({
    shopUnits: z.number().int().nonnegative().optional(),
    kiosks: z.number().int().nonnegative().optional(),
    foodCourtUnits: z.number().int().nonnegative().optional(),
    anchorStores: z.number().int().nonnegative().optional(),
    officeUnits: z.number().int().nonnegative().optional()
  })
  .optional();

const mixedIncludesSchema = z
  .object({
    residential: z.boolean().optional(),
    commercial: z.boolean().optional(),
    plotted: z.boolean().optional()
  })
  .optional();

const mixedUseIncludesSchema = z
  .object({
    residential: z.boolean().optional(),
    commercial: z.boolean().optional(),
    plotted: z.boolean().optional()
  })
  .optional();

const mixedDetailsSchema = z
  .object({
    kind: z.enum(["township", "mixed_building"]),
    totalLandArea: z.number().nonnegative().optional(),
    landAreaUnit: z.enum(["sqft", "acre", "hectare"]).optional(),
    phasesCount: z.number().int().nonnegative().optional(),
    sectorsCount: z.number().int().nonnegative().optional(),
    internalRoads: z
      .object({
        roadType: z.string().min(2).optional(),
        minWidthM: z.number().nonnegative().optional()
      })
      .optional(),
    openSpacePct: z.number().nonnegative().max(100).optional(),
    masterPlanNotes: z.string().max(500).optional(),
    buildingName: z.string().min(2).optional(),
    towersCount: z.number().int().nonnegative().optional(),
    totalFloors: z.number().int().nonnegative().optional(),
    podiumParking: z.boolean().optional(),
    retailFloors: z.number().int().nonnegative().optional(),
    residentialFloors: z.number().int().nonnegative().optional()
  })
  .superRefine((value, ctx) => {
    if (value.kind === "township") {
      if (value.totalLandArea == null || value.totalLandArea <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mixedDetails.totalLandArea is required for township",
          path: ["totalLandArea"]
        });
      }
      if (!value.landAreaUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mixedDetails.landAreaUnit is required for township",
          path: ["landAreaUnit"]
        });
      }
      if (value.internalRoads?.minWidthM != null && value.internalRoads.minWidthM <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "internalRoads.minWidthM must be greater than 0",
          path: ["internalRoads", "minWidthM"]
        });
      }
    }
    if (value.kind === "mixed_building") {
      if (value.buildingName == null && value.towersCount == null && value.totalFloors == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Provide building name, towers count, or total floors",
          path: ["buildingName"]
        });
      }
      if (
        value.totalFloors != null &&
        value.retailFloors != null &&
        value.residentialFloors != null &&
        value.retailFloors + value.residentialFloors > value.totalFloors
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "retailFloors + residentialFloors must be <= totalFloors",
          path: ["retailFloors"]
        });
      }
      if (value.totalFloors != null && value.retailFloors != null && value.retailFloors > value.totalFloors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "retailFloors must be <= totalFloors",
          path: ["retailFloors"]
        });
      }
      if (value.totalFloors != null && value.residentialFloors != null && value.residentialFloors > value.totalFloors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "residentialFloors must be <= totalFloors",
          path: ["residentialFloors"]
        });
      }
    }
  })
  .optional();

const legacyStatusSchema = z.enum(["active", "inactive"]).optional();

const VALID_TYPES_BY_CATEGORY: Record<
  z.infer<typeof ProjectCategorySchema>,
  z.infer<typeof ProjectTypeSchema>[]
> = {
  residential: ["apartment", "villa", "row_house"],
  plotted: ["plot_layout"],
  commercial: ["shop", "office", "showroom"],
  mixed: ["township", "mixed_building"]
};

function normalizeProjectType(
  value: z.infer<typeof ProjectTypeInputSchema>
): z.infer<typeof ProjectTypeSchema> {
  if (value === "plot") return "plot_layout";
  if (value === "commercial") return "shop";
  if (value === "mixed") return "township";
  return value as z.infer<typeof ProjectTypeSchema>;
}

const ProjectCreateSchemaRawBase = z.object({
  developerName: z.string().min(2).optional(),
  name: z.string().min(3),
  slug: z.string().min(2).optional(),
  enterpriseId: z.string().optional(),
  category: ProjectCategorySchema.optional(),
  type: ProjectTypeInputSchema.optional(),
  lifecycleStatus: ProjectLifecycleStatusSchema.optional(),
  recordStatus: RecordStatusSchema.optional(),
  possessionStatus: z.enum(["ready", "under_construction"]).optional(),
  rera: reraSchema,
  approvals: approvalsSchema,
  launchDate: z.string().optional(),
  completionDate: z.string().optional(),
  possessionDate: z.string().optional(),
  totalUnitsPlanned: z.number().int().nonnegative().optional(),
  configurationMix: configurationMixSchema,
  commercialMix: commercialMixSchema,
  plotDetails: plotDetailsSchema,
  commercialDetails: commercialDetailsSchema,
  mixedIncludes: mixedIncludesSchema,
  mixedUseIncludes: mixedUseIncludesSchema,
  mixedDetails: mixedDetailsSchema,
  location: locationSchema.optional(),
  priceRange: priceRangeSchema,
  amenities: z.array(z.string().min(1)).optional(),
  highlights: z.array(z.string().min(1)).optional(),
  media: mediaSchema,
  contact: contactSchema,
  inventory: inventorySchema,
  seo: seoSchema,
  developer: developerSchema,
  salesStatus: salesStatusSchema,
  flags: flagsSchema,
  city: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional(),
  status: legacyStatusSchema,
  reraId: z.string().min(3).optional(),
  propertyTypesSupported: z.array(z.string().min(1)).optional()
});

function inferProjectType(input: z.infer<typeof ProjectCreateSchemaRawBase>) {
  if (input.type) return normalizeProjectType(input.type);
  if (input.category) return VALID_TYPES_BY_CATEGORY[input.category][0];
  const types = (input.propertyTypesSupported || []).map((t) => t.toLowerCase());
  if (types.some((t) => t.includes("plot") || t.includes("land"))) return "plot_layout";
  if (types.some((t) => t.includes("commercial"))) return "shop";
  if (types.some((t) => t.includes("township") || t.includes("mixed"))) return "township";
  return "apartment";
}

function inferProjectCategory(input: z.infer<typeof ProjectCreateSchemaRawBase>) {
  if (input.category) return input.category;
  const type = input.type ? normalizeProjectType(input.type) : undefined;
  if (type) {
    for (const [category, types] of Object.entries(VALID_TYPES_BY_CATEGORY)) {
      if (types.includes(type as z.infer<typeof ProjectTypeSchema>)) {
        return category as z.infer<typeof ProjectCategorySchema>;
      }
    }
  }
  return "residential";
}

function inferLifecycleStatus(input: z.infer<typeof ProjectCreateSchemaRawBase>) {
  if (input.lifecycleStatus) return input.lifecycleStatus;
  if (input.possessionStatus === "ready") return "ready";
  if (input.possessionStatus === "under_construction") return "under_construction";
  return "planning";
}

type ProjectCreateNormalized = {
  name: string;
  slug: string;
  developerName?: string;
  enterpriseId?: string;
  category: z.infer<typeof ProjectCategorySchema>;
  type: z.infer<typeof ProjectTypeSchema>;
  lifecycleStatus: z.infer<typeof ProjectLifecycleStatusSchema>;
  recordStatus: z.infer<typeof RecordStatusSchema>;
  possessionStatus?: "ready" | "under_construction";
  rera?: z.infer<typeof reraSchema>;
  approvals?: z.infer<typeof approvalsSchema>;
  launchDate?: string;
  completionDate?: string;
  possessionDate?: string;
  configurationMix?: z.infer<typeof configurationMixSchema>;
  commercialMix?: z.infer<typeof commercialMixSchema>;
  plotDetails?: z.infer<typeof plotDetailsSchema>;
  commercialDetails?: z.infer<typeof commercialDetailsSchema>;
  mixedIncludes?: z.infer<typeof mixedIncludesSchema>;
  mixedUseIncludes?: z.infer<typeof mixedUseIncludesSchema>;
  mixedDetails?: z.infer<typeof mixedDetailsSchema>;
  totalUnitsPlanned?: number;
  inventory?: z.infer<typeof inventorySchema>;
  location: z.infer<typeof locationSchema>;
  priceRange?: z.infer<typeof priceRangeSchema>;
  amenities?: string[];
  highlights?: string[];
  media?: z.infer<typeof mediaSchema>;
  contact?: z.infer<typeof contactSchema>;
  seo?: z.infer<typeof seoSchema>;
  developer?: z.infer<typeof developerSchema>;
  salesStatus?: z.infer<typeof salesStatusSchema>;
  flags?: z.infer<typeof flagsSchema>;
};

function normalizeActivePlotInventories(plotInventories?: any[]) {
  return (plotInventories || []).filter((item) => {
    const sizeValue = item.sizeValue ?? item.sizeSqFt;
    const isActive =
      sizeValue != null ||
      item.count != null ||
      item.frontageFt != null ||
      item.depthFt != null ||
      Boolean(item.label);
    return isActive && sizeValue != null && sizeValue > 0 && item.count != null && item.count > 0 && Boolean(item.sizeUnit);
  });
}

function canonicalizePlottedProjectFields<T extends Record<string, any>>(input: T): T {
  const category = input.category ?? inferProjectCategory(input as unknown as z.infer<typeof ProjectCreateSchemaRawBase>);
  if (category !== "plotted" || !input.plotDetails) return input;
  const normalizedInventories = normalizeActivePlotInventories(input.plotDetails.plotInventories);
  const derivedTotalPlots = normalizedInventories.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
  const totalPlotsPlanned =
    derivedTotalPlots > 0 ? derivedTotalPlots : input.plotDetails.totalPlotsPlanned ?? input.plotDetails.plotCount;
  return {
    ...input,
    plotDetails: {
      ...input.plotDetails,
      plotInventories: normalizedInventories.length ? normalizedInventories : undefined,
      totalPlotsPlanned
    }
  };
}

function normalizeProjectCreate(
  input: z.infer<typeof ProjectCreateSchemaRawBase>
): ProjectCreateNormalized {
  const canonicalInput = canonicalizePlottedProjectFields(input);
  const location = canonicalInput.location
    ? { ...canonicalInput.location }
    : canonicalInput.city
    ? {
        city: canonicalInput.city,
        addressLine: canonicalInput.addressLine
      }
    : undefined;
  if (!location?.city) {
    throw new Error("location.city is required");
  }

  if (location?.city && !location.citySlug) {
    location.citySlug = slugify(location.city);
  }

  const rera = canonicalInput.rera
    ? { ...canonicalInput.rera }
    : canonicalInput.reraId
    ? { number: canonicalInput.reraId }
    : undefined;

  const inventory = canonicalInput.inventory
    ? { ...canonicalInput.inventory }
    : undefined;

  let priceRange = canonicalInput.priceRange ? { ...canonicalInput.priceRange } : undefined;
  if (priceRange && (priceRange.min != null || priceRange.max != null) && !priceRange.currency) {
    priceRange = { ...priceRange, currency: "INR" };
  }

  const slug = canonicalInput.slug || slugify(canonicalInput.name);
  const totalUnitsPlanned = canonicalInput.totalUnitsPlanned ?? inventory?.totalUnitsPlanned;

  return {
    name: canonicalInput.name,
    slug,
    developerName: canonicalInput.developerName,
    enterpriseId: canonicalInput.enterpriseId,
    category: inferProjectCategory(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>),
    type: inferProjectType(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>),
    lifecycleStatus: inferLifecycleStatus(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>),
    recordStatus: canonicalInput.recordStatus ?? canonicalInput.status ?? "active",
    possessionStatus: canonicalInput.possessionStatus,
    rera,
    approvals: canonicalInput.approvals,
    launchDate: canonicalInput.launchDate,
    completionDate: canonicalInput.completionDate,
    possessionDate: canonicalInput.possessionDate,
    configurationMix: canonicalInput.configurationMix,
    commercialMix: canonicalInput.commercialMix,
    plotDetails: canonicalInput.plotDetails,
    commercialDetails: canonicalInput.commercialDetails,
    mixedIncludes: canonicalInput.mixedIncludes,
    mixedUseIncludes: canonicalInput.mixedUseIncludes ?? canonicalInput.mixedIncludes,
    mixedDetails: canonicalInput.mixedDetails,
    totalUnitsPlanned,
    inventory,
    location,
    priceRange,
    amenities: canonicalInput.amenities,
    highlights: canonicalInput.highlights,
    media: canonicalInput.media,
    contact: canonicalInput.contact,
    seo: canonicalInput.seo,
    developer: canonicalInput.developer,
    salesStatus: canonicalInput.salesStatus,
    flags: canonicalInput.flags
  };
}

type ProjectPatchNormalized = Omit<Partial<ProjectCreateNormalized>, "location"> & {
  location?: Partial<z.infer<typeof locationSchema>>;
};

function normalizeProjectPatch(input: Partial<z.infer<typeof ProjectCreateSchemaRawBase>>): ProjectPatchNormalized {
  const canonicalInput = canonicalizePlottedProjectFields(input);
  const out: ProjectPatchNormalized = {};

  if (canonicalInput.name) {
    out.name = canonicalInput.name;
    if (!canonicalInput.slug) {
      out.slug = slugify(canonicalInput.name);
    }
  }
  if (canonicalInput.slug) out.slug = canonicalInput.slug;
  if (canonicalInput.developerName) out.developerName = canonicalInput.developerName;
  if (canonicalInput.enterpriseId) out.enterpriseId = canonicalInput.enterpriseId;
  if (canonicalInput.category) out.category = canonicalInput.category;

  if (canonicalInput.location) {
    if (!canonicalInput.location.city) {
      throw new Error("location.city is required when location is provided");
    }
    const location = { ...canonicalInput.location };
    if (location.city && !location.citySlug) {
      location.citySlug = slugify(location.city);
    }
    out.location = location;
  } else if (canonicalInput.city || canonicalInput.addressLine) {
    if (canonicalInput.city) {
      const location: { city: string; addressLine?: string; citySlug?: string } = {
        city: canonicalInput.city,
        addressLine: canonicalInput.addressLine
      };
      if (!location.citySlug) {
        location.citySlug = slugify(canonicalInput.city);
      }
      out.location = location;
    } else if (canonicalInput.addressLine) {
      out.location = { addressLine: canonicalInput.addressLine };
    }
  }

  if (canonicalInput.recordStatus) out.recordStatus = canonicalInput.recordStatus;
  if (canonicalInput.status) out.recordStatus = canonicalInput.status;

  if (canonicalInput.rera) out.rera = canonicalInput.rera;
  else if (canonicalInput.reraId) out.rera = { number: canonicalInput.reraId };

  if (canonicalInput.inventory) {
    out.inventory = canonicalInput.inventory;
  }

  if (canonicalInput.priceRange) {
    const pr = { ...canonicalInput.priceRange };
    if ((pr.min != null || pr.max != null) && !pr.currency) {
      pr.currency = "INR";
    }
    out.priceRange = pr;
  }

  if (canonicalInput.type) out.type = normalizeProjectType(canonicalInput.type);
  else if (canonicalInput.propertyTypesSupported) {
    out.type = inferProjectType(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>);
  }
  if (!out.category && (canonicalInput.category || canonicalInput.type || canonicalInput.propertyTypesSupported)) {
    out.category = inferProjectCategory(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>);
  }

  if (canonicalInput.lifecycleStatus) out.lifecycleStatus = canonicalInput.lifecycleStatus;
  else if (canonicalInput.possessionStatus) {
    out.lifecycleStatus = inferLifecycleStatus(canonicalInput as z.infer<typeof ProjectCreateSchemaRawBase>);
  }

  if (canonicalInput.possessionStatus) out.possessionStatus = canonicalInput.possessionStatus;
  if (canonicalInput.launchDate) out.launchDate = canonicalInput.launchDate;
  if (canonicalInput.completionDate) out.completionDate = canonicalInput.completionDate;
  if (canonicalInput.possessionDate) out.possessionDate = canonicalInput.possessionDate;
  if (canonicalInput.configurationMix) out.configurationMix = canonicalInput.configurationMix;
  if (canonicalInput.commercialMix) out.commercialMix = canonicalInput.commercialMix;
  if (canonicalInput.plotDetails) out.plotDetails = canonicalInput.plotDetails;
  if (canonicalInput.commercialDetails) out.commercialDetails = canonicalInput.commercialDetails;
  if (canonicalInput.mixedIncludes) out.mixedIncludes = canonicalInput.mixedIncludes;
  if (canonicalInput.mixedUseIncludes) out.mixedUseIncludes = canonicalInput.mixedUseIncludes;
  if (canonicalInput.mixedIncludes && !canonicalInput.mixedUseIncludes) out.mixedUseIncludes = canonicalInput.mixedIncludes;
  if (canonicalInput.mixedDetails) out.mixedDetails = canonicalInput.mixedDetails;
  if (canonicalInput.amenities) out.amenities = canonicalInput.amenities;
  if (canonicalInput.highlights) out.highlights = canonicalInput.highlights;
  if (canonicalInput.media) out.media = canonicalInput.media;
  if (canonicalInput.contact) out.contact = canonicalInput.contact;
  if (canonicalInput.seo) out.seo = canonicalInput.seo;
  if (canonicalInput.developer) out.developer = canonicalInput.developer;
  if (canonicalInput.salesStatus) out.salesStatus = canonicalInput.salesStatus;
  if (canonicalInput.flags) out.flags = canonicalInput.flags;

  return out;
}

export const ProjectCreateSchemaRaw = ProjectCreateSchemaRawBase.superRefine((input, ctx) => {
  if (!input.location?.city && !input.city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "location.city is required",
      path: ["location", "city"]
    });
  }
  if (input.category && input.type) {
    const normalizedType = normalizeProjectType(input.type);
    if (!VALID_TYPES_BY_CATEGORY[input.category].includes(normalizedType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "type does not match category",
        path: ["type"]
      });
    }
  }
  if (input.category === "mixed") {
    const includes = input.mixedUseIncludes ?? input.mixedIncludes;
    const hasIncludes = Boolean(includes?.residential || includes?.commercial || includes?.plotted);
    if (!hasIncludes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mixedUseIncludes must include at least one category",
        path: ["mixedUseIncludes"]
      });
    }
    if (!input.mixedDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mixedDetails is required for mixed category",
        path: ["mixedDetails"]
      });
    } else if (input.type) {
      const normalizedType = normalizeProjectType(input.type);
      if (normalizedType === "township" && input.mixedDetails.kind !== "township") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mixedDetails.kind must be township",
          path: ["mixedDetails", "kind"]
        });
      }
      if (normalizedType === "mixed_building" && input.mixedDetails.kind !== "mixed_building") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mixedDetails.kind must be mixed_building",
          path: ["mixedDetails", "kind"]
        });
      }
    }
  }
});

export const ProjectCreateSchema = ProjectCreateSchemaRaw.transform((input) =>
  normalizeProjectCreate(input as z.infer<typeof ProjectCreateSchemaRawBase>)
);

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectPatchSchema = ProjectCreateSchemaRawBase.partial()
  .superRefine((input, ctx) => {
    if (input.location && !input.location.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "location.city is required when location is provided",
        path: ["location", "city"]
      });
    }
    if (input.category && input.type) {
      const normalizedType = normalizeProjectType(input.type);
      if (!VALID_TYPES_BY_CATEGORY[input.category].includes(normalizedType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "type does not match category",
          path: ["type"]
        });
      }
    }
  })
  .transform((input) => normalizeProjectPatch(input)) as z.ZodType<ProjectPatchNormalized>;

export const ProjectUpdateSchema = ProjectPatchSchema;
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

export const UnitAvailabilitySchema = z.enum(["available", "blocked", "sold"]);

const unitAreaSchema = z
  .object({
    areaSqFt: z.number().nonnegative().optional(),
    carpetSqFt: z.number().nonnegative().optional(),
    builtUpSqFt: z.number().nonnegative().optional(),
    superBuiltUpSqFt: z.number().nonnegative().optional()
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry != null),
    "area must include at least one measurement"
  )
  .optional();

const unitPricingSchema = z
  .object({
    basePrice: z.number().nonnegative().optional(),
    allInclusivePrice: z.number().nonnegative().optional(),
    pricePerSqFt: z.number().nonnegative().optional(),
    bookingAmount: z.number().nonnegative().optional(),
    maintenanceMonthly: z.number().nonnegative().optional(),
    currency: z.literal("INR").optional()
  })
  .optional();

const unitFloorSchema = z
  .object({
    number: z.number().int().optional(),
    totalFloors: z.number().int().nonnegative().optional()
  })
  .optional();

const unitMediaSchema = z
  .object({
    floorPlan: mediaItemSchema.optional()
  })
  .optional();

const mixedMetaSchema = z
  .object({
    projectKind: z.enum(["township", "mixed_building"]),
    phase: z.string().max(80).optional(),
    sector: z.string().max(80).optional(),
    buildingName: z.string().max(80).optional(),
    useZone: z.enum(["residential", "commercial", "plotted"]).optional(),
    block: z.string().max(80).optional()
  })
  .optional();

const unitRevenueSchema = z
  .object({
    surveyNo: z.string().min(1).optional(),
    gatNo: z.string().min(1).optional(),
    hissaNo: z.string().min(1).optional()
  })
  .optional();

const UnitCreateSchemaRawBase = z.object({
  type: z.enum(["apartment", "villa", "row_house", "plot_layout", "shop", "office", "showroom"]),
  availability: UnitAvailabilitySchema,
  unitNumber: z.string().min(1).optional(),
  tower: z.string().min(1).optional(),
  bhk: z.number().int().min(0).max(10).optional(),
  configurationLabel: z.string().min(2).optional(),
  plotLengthFeet: z.number().nonnegative().optional(),
  plotWidthFeet: z.number().nonnegative().optional(),
  plotAreaSqFt: z.number().nonnegative().optional(),
  revenue: unitRevenueSchema,
  surveyNo: z.string().min(1).optional(),
  gatNo: z.string().min(1).optional(),
  hissaNo: z.string().min(1).optional(),
  roadWidthFeet: z.number().nonnegative().optional(),
  corner: z.boolean().optional(),
  cornerPremiumPct: z.number().nonnegative().optional(),
  finalPrice: z.number().nonnegative().optional(),
  privateOpenSpaceSqFt: z.number().nonnegative().optional(),
  cornerUnit: z.boolean().optional(),
  floorsType: z.enum(["G", "G+1", "G+2"]).optional(),
  parkingSlots: z.number().int().nonnegative().optional(),
  privateGardenSqFt: z.number().nonnegative().optional(),
  commercialUse: z.string().min(2).optional(),
  saleableSqFt: z.number().nonnegative().optional(),
  frontageFeet: z.number().nonnegative().optional(),
  depthFeet: z.number().nonnegative().optional(),
  ceilingHeightFeet: z.number().nonnegative().optional(),
  shutterType: z.enum(["manual", "motorized"]).optional(),
  powerLoadKw: z.number().nonnegative().optional(),
  washroom: z.boolean().optional(),
  waterConnection: z.boolean().optional(),
  fireSafetyReady: z.boolean().optional(),
  signageAllowed: z.boolean().optional(),
  dedicatedParking: z.number().int().nonnegative().optional(),
  visibilityScore: z.enum(["low", "medium", "high"]).optional(),
  footfallGrade: z.enum(["low", "medium", "high"]).optional(),
  nearEntrance: z.boolean().optional(),
  nearEscalator: z.boolean().optional(),
  nearAnchor: z.boolean().optional(),
  tenancyType: z.enum(["sale", "rent", "lease", "license"]).optional(),
  monthlyRentExpected: z.number().nonnegative().optional(),
  depositExpected: z.number().nonnegative().optional(),
  camPerSqFt: z.number().nonnegative().optional(),
  propertyTaxMonthly: z.number().nonnegative().optional(),
  fitoutStatus: z.enum(["shell", "semi-furnished", "furnished"]).optional(),
  possession: z.enum(["ready", "under_construction"]).optional(),
  cabinsCount: z.number().int().nonnegative().optional(),
  workstationsCapacity: z.number().int().nonnegative().optional(),
  meetingRoomsCount: z.number().int().nonnegative().optional(),
  pantry: z.boolean().optional(),
  acProvision: z.enum(["central", "split_ready", "none"]).optional(),
  internetReady: z.boolean().optional(),
  powerBackup: z.boolean().optional(),
  furnishing: z.enum(["unfurnished", "semi_furnished", "furnished"]).optional(),
  glassFacade: z.boolean().optional(),
  displayAreaSqFt: z.number().nonnegative().optional(),
  storageAreaSqFt: z.number().nonnegative().optional(),
  loadingAccess: z.boolean().optional(),
  signageType: z.enum(["standard", "large", "facade", "totem"]).optional(),
  roadExposure: z.enum(["highway", "main_road", "market_road", "internal_road"]).optional(),
  remarks: z.string().optional(),
  mixedMeta: mixedMetaSchema,
  area: unitAreaSchema,
  pricing: unitPricingSchema,
  floorInfo: unitFloorSchema,
  areaSqFt: z.number().nonnegative().optional(),
  carpetSqFt: z.number().nonnegative().optional(),
  builtUpSqFt: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  floor: z.number().int().optional(),
  facing: z.string().optional(),
  media: unitMediaSchema
});

function collectStrictUnitValidationErrors(data: any) {
  const errors: Record<string, string> = {};
  const type = data?.type;
  const unitNumber = typeof data?.unitNumber === "string" ? data.unitNumber.trim() : "";
  const bhk = data?.bhk;
  const areaSqFt = data?.area?.areaSqFt ?? data?.areaSqFt;
  const carpetSqFt = data?.area?.carpetSqFt ?? data?.carpetSqFt;
  const builtUpSqFt = data?.area?.builtUpSqFt ?? data?.builtUpSqFt;
  const saleableSqFt = data?.saleableSqFt;
  const plotAreaSqFt = data?.plotAreaSqFt;
  const plotLengthFeet = data?.plotLengthFeet;
  const plotWidthFeet = data?.plotWidthFeet;
  const frontageFeet = data?.frontageFeet;
  const ceilingHeightFeet = data?.ceilingHeightFeet;
  const tenancyType = data?.tenancyType;
  const fitoutStatus = data?.fitoutStatus;
  const possession = data?.possession;
  const monthlyRentExpected = data?.monthlyRentExpected;
  const depositExpected = data?.depositExpected;
  const basePrice = data?.pricing?.basePrice ?? data?.price;
  const allInclusivePrice = data?.pricing?.allInclusivePrice;
  const hasPrice = Boolean(basePrice || allInclusivePrice);

  if (
    type === "apartment" ||
    type === "villa" ||
    type === "row_house" ||
    type === "plot_layout" ||
    type === "shop" ||
    type === "office" ||
    type === "showroom"
  ) {
    if (!unitNumber) {
      errors.unitNumber = type === "plot_layout" ? "Plot number is required." : "Unit number is required.";
    }
  }

  if (type === "apartment") {
    if (bhk == null) {
      errors.bhk = "BHK is required for apartment.";
    }
    if (!(areaSqFt || builtUpSqFt)) {
      errors.area = "Area is required for apartment.";
    }
    if (!hasPrice) {
      errors.pricing = "Price required for apartment.";
    }
  }

  if (type === "villa" || type === "row_house") {
    if (!(typeof bhk === "number" && bhk > 0 && bhk <= 10)) {
      errors.bhk = "BHK is required.";
    }
    if (!(plotAreaSqFt > 0)) {
      errors.plotAreaSqFt = "Plot area required.";
    }
    if (!(builtUpSqFt > 0)) {
      errors.area = "Built-up area required.";
    }
    if (!(basePrice > 0)) {
      errors.pricing = "Base price required.";
    }
  }

  if (type === "plot_layout") {
    const hasDerivedArea = (plotAreaSqFt ?? 0) > 0 || ((plotLengthFeet ?? 0) > 0 && (plotWidthFeet ?? 0) > 0);
    if (!hasDerivedArea) {
      errors.plotAreaSqFt = "Valid plot area required.";
    }
    if (!(basePrice > 0)) {
      errors.pricing = "Base price required for plot.";
    }
  }

  if (type === "shop" || type === "office" || type === "showroom") {
    const hasCommercialArea = Boolean(saleableSqFt || carpetSqFt || areaSqFt || builtUpSqFt);
    if (!hasCommercialArea) {
      errors.area = "Area is required for commercial unit.";
    }
    if (!tenancyType) {
      errors.tenancyType = "Tenancy type required.";
    }
    if (!fitoutStatus) {
      errors.fitoutStatus = "Fit-out status required.";
    }
    if (!possession) {
      errors.possession = "Possession required.";
    }

    if (tenancyType === "sale" && !hasPrice) {
      errors.pricing = "Price required for sale unit.";
    }

    if (tenancyType === "lease") {
      if (!(monthlyRentExpected > 0)) {
        errors.monthlyRentExpected = "Monthly rent required.";
      }
      if (!(depositExpected > 0)) {
        errors.depositExpected = "Deposit required.";
      }
    }

    if ((tenancyType === "rent" || tenancyType === "license") && !(basePrice || allInclusivePrice || monthlyRentExpected)) {
      errors.pricing = "Price or monthly rent required.";
    }

    if (type === "showroom") {
      if (!(frontageFeet > 0)) {
        errors.frontageFeet = "Frontage required for showroom.";
      }
      if (!(ceilingHeightFeet > 0)) {
        errors.ceilingHeightFeet = "Ceiling height required for showroom.";
      }
    }
  }

  return errors;
}

export function validateUnitStrict(data: any) {
  return collectStrictUnitValidationErrors(data);
}

const UnitCreateSchemaRaw = UnitCreateSchemaRawBase.superRefine((data, ctx) => {
  const errors = collectStrictUnitValidationErrors(data);
  Object.entries(errors).forEach(([path, message]) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message
    });
  });
});

function normalizeUnitCreate(input: z.infer<typeof UnitCreateSchemaRawBase>) {
  const area =
    input.area ??
    (input.areaSqFt != null || input.carpetSqFt != null || input.builtUpSqFt != null
      ? {
          areaSqFt: input.areaSqFt,
          carpetSqFt: input.carpetSqFt,
          builtUpSqFt: input.builtUpSqFt
        }
      : undefined);

  let pricing =
    input.pricing ??
    (input.price != null
      ? {
          basePrice: input.price
        }
      : undefined);

  if (pricing && (pricing.basePrice != null || pricing.allInclusivePrice != null) && !pricing.currency) {
    pricing = { ...pricing, currency: "INR" };
  }

  const floorInfo =
    input.floorInfo ??
    (input.floor != null
      ? {
          number: input.floor
        }
      : undefined);

  return {
    type: input.type,
    availability: input.availability,
    unitNumber: input.unitNumber,
    tower: input.tower,
    bhk: input.bhk,
    configurationLabel: input.configurationLabel,
    plotLengthFeet: input.plotLengthFeet,
    plotWidthFeet: input.plotWidthFeet,
    plotAreaSqFt: input.plotAreaSqFt,
    revenue:
      input.revenue ||
      (input.surveyNo !== undefined || input.gatNo !== undefined || input.hissaNo !== undefined
        ? {
            surveyNo: input.surveyNo,
            gatNo: input.gatNo,
            hissaNo: input.hissaNo
          }
        : undefined),
    surveyNo: input.surveyNo,
    gatNo: input.gatNo,
    hissaNo: input.hissaNo,
    roadWidthFeet: input.roadWidthFeet,
    corner: input.corner,
    cornerPremiumPct: input.cornerPremiumPct,
    finalPrice: input.finalPrice,
    privateOpenSpaceSqFt: input.privateOpenSpaceSqFt,
    cornerUnit: input.cornerUnit,
    floorsType: input.floorsType,
    parkingSlots: input.parkingSlots,
    privateGardenSqFt: input.privateGardenSqFt,
    commercialUse: input.commercialUse,
    saleableSqFt: input.saleableSqFt,
    frontageFeet: input.frontageFeet,
    depthFeet: input.depthFeet,
    ceilingHeightFeet: input.ceilingHeightFeet,
    shutterType: input.shutterType,
    powerLoadKw: input.powerLoadKw,
    washroom: input.washroom,
    waterConnection: input.waterConnection,
    fireSafetyReady: input.fireSafetyReady,
    signageAllowed: input.signageAllowed,
    dedicatedParking: input.dedicatedParking,
    visibilityScore: input.visibilityScore,
    footfallGrade: input.footfallGrade,
    nearEntrance: input.nearEntrance,
    nearEscalator: input.nearEscalator,
    nearAnchor: input.nearAnchor,
    tenancyType: input.tenancyType,
    monthlyRentExpected: input.monthlyRentExpected,
    depositExpected: input.depositExpected,
    camPerSqFt: input.camPerSqFt,
    propertyTaxMonthly: input.propertyTaxMonthly,
    fitoutStatus: input.fitoutStatus,
    possession: input.possession,
    cabinsCount: input.cabinsCount,
    workstationsCapacity: input.workstationsCapacity,
    meetingRoomsCount: input.meetingRoomsCount,
    pantry: input.pantry,
    acProvision: input.acProvision,
    internetReady: input.internetReady,
    powerBackup: input.powerBackup,
    furnishing: input.furnishing,
    glassFacade: input.glassFacade,
    displayAreaSqFt: input.displayAreaSqFt,
    storageAreaSqFt: input.storageAreaSqFt,
    loadingAccess: input.loadingAccess,
    signageType: input.signageType,
    roadExposure: input.roadExposure,
    remarks: input.remarks,
    mixedMeta: input.mixedMeta,
    area,
    pricing,
    floorInfo,
    facing: input.facing,
    media: input.media
  };
}

type UnitPatchInput = Partial<z.infer<typeof UnitCreateSchemaRawBase>>;

function normalizeUnitPatch(input: UnitPatchInput) {
  const out: Record<string, unknown> = {};

  if (input.type !== undefined) out.type = input.type;
  if (input.availability !== undefined) out.availability = input.availability;
  if (input.unitNumber !== undefined) out.unitNumber = input.unitNumber;
  if (input.tower !== undefined) out.tower = input.tower;
  if (input.bhk !== undefined) out.bhk = input.bhk;
  if (input.configurationLabel !== undefined) out.configurationLabel = input.configurationLabel;
  if (input.plotLengthFeet !== undefined) out.plotLengthFeet = input.plotLengthFeet;
  if (input.plotWidthFeet !== undefined) out.plotWidthFeet = input.plotWidthFeet;
  if (input.plotAreaSqFt !== undefined) out.plotAreaSqFt = input.plotAreaSqFt;
  if (input.revenue !== undefined) out.revenue = input.revenue;
  if (input.surveyNo !== undefined) out.surveyNo = input.surveyNo;
  if (input.gatNo !== undefined) out.gatNo = input.gatNo;
  if (input.hissaNo !== undefined) out.hissaNo = input.hissaNo;
  if (input.roadWidthFeet !== undefined) out.roadWidthFeet = input.roadWidthFeet;
  if (input.corner !== undefined) out.corner = input.corner;
  if (input.cornerPremiumPct !== undefined) out.cornerPremiumPct = input.cornerPremiumPct;
  if (input.finalPrice !== undefined) out.finalPrice = input.finalPrice;
  if (input.privateOpenSpaceSqFt !== undefined) out.privateOpenSpaceSqFt = input.privateOpenSpaceSqFt;
  if (input.cornerUnit !== undefined) out.cornerUnit = input.cornerUnit;
  if (input.floorsType !== undefined) out.floorsType = input.floorsType;
  if (input.parkingSlots !== undefined) out.parkingSlots = input.parkingSlots;
  if (input.privateGardenSqFt !== undefined) out.privateGardenSqFt = input.privateGardenSqFt;
  if (input.commercialUse !== undefined) out.commercialUse = input.commercialUse;
  if (input.saleableSqFt !== undefined) out.saleableSqFt = input.saleableSqFt;
  if (input.frontageFeet !== undefined) out.frontageFeet = input.frontageFeet;
  if (input.depthFeet !== undefined) out.depthFeet = input.depthFeet;
  if (input.ceilingHeightFeet !== undefined) out.ceilingHeightFeet = input.ceilingHeightFeet;
  if (input.shutterType !== undefined) out.shutterType = input.shutterType;
  if (input.powerLoadKw !== undefined) out.powerLoadKw = input.powerLoadKw;
  if (input.washroom !== undefined) out.washroom = input.washroom;
  if (input.waterConnection !== undefined) out.waterConnection = input.waterConnection;
  if (input.fireSafetyReady !== undefined) out.fireSafetyReady = input.fireSafetyReady;
  if (input.signageAllowed !== undefined) out.signageAllowed = input.signageAllowed;
  if (input.dedicatedParking !== undefined) out.dedicatedParking = input.dedicatedParking;
  if (input.visibilityScore !== undefined) out.visibilityScore = input.visibilityScore;
  if (input.footfallGrade !== undefined) out.footfallGrade = input.footfallGrade;
  if (input.nearEntrance !== undefined) out.nearEntrance = input.nearEntrance;
  if (input.nearEscalator !== undefined) out.nearEscalator = input.nearEscalator;
  if (input.nearAnchor !== undefined) out.nearAnchor = input.nearAnchor;
  if (input.tenancyType !== undefined) out.tenancyType = input.tenancyType;
  if (input.monthlyRentExpected !== undefined) out.monthlyRentExpected = input.monthlyRentExpected;
  if (input.depositExpected !== undefined) out.depositExpected = input.depositExpected;
  if (input.camPerSqFt !== undefined) out.camPerSqFt = input.camPerSqFt;
  if (input.propertyTaxMonthly !== undefined) out.propertyTaxMonthly = input.propertyTaxMonthly;
  if (input.fitoutStatus !== undefined) out.fitoutStatus = input.fitoutStatus;
  if (input.possession !== undefined) out.possession = input.possession;
  if (input.cabinsCount !== undefined) out.cabinsCount = input.cabinsCount;
  if (input.workstationsCapacity !== undefined) out.workstationsCapacity = input.workstationsCapacity;
  if (input.meetingRoomsCount !== undefined) out.meetingRoomsCount = input.meetingRoomsCount;
  if (input.pantry !== undefined) out.pantry = input.pantry;
  if (input.acProvision !== undefined) out.acProvision = input.acProvision;
  if (input.internetReady !== undefined) out.internetReady = input.internetReady;
  if (input.powerBackup !== undefined) out.powerBackup = input.powerBackup;
  if (input.furnishing !== undefined) out.furnishing = input.furnishing;
  if (input.glassFacade !== undefined) out.glassFacade = input.glassFacade;
  if (input.displayAreaSqFt !== undefined) out.displayAreaSqFt = input.displayAreaSqFt;
  if (input.storageAreaSqFt !== undefined) out.storageAreaSqFt = input.storageAreaSqFt;
  if (input.loadingAccess !== undefined) out.loadingAccess = input.loadingAccess;
  if (input.signageType !== undefined) out.signageType = input.signageType;
  if (input.roadExposure !== undefined) out.roadExposure = input.roadExposure;
  if (input.remarks !== undefined) out.remarks = input.remarks;
  if (input.mixedMeta !== undefined) out.mixedMeta = input.mixedMeta;
  if (input.facing !== undefined) out.facing = input.facing;
  if (input.media !== undefined) out.media = input.media;

  if (input.area) {
    out.area = input.area;
  } else if (
    input.areaSqFt !== undefined ||
    input.carpetSqFt !== undefined ||
    input.builtUpSqFt !== undefined
  ) {
    const area = {
      areaSqFt: input.areaSqFt,
      carpetSqFt: input.carpetSqFt,
      builtUpSqFt: input.builtUpSqFt
    };
    if (Object.values(area).some((entry) => entry != null)) {
      out.area = area;
    }
  }

  if (input.pricing) {
    const pricing = input.pricing;
    if ((pricing.basePrice != null || pricing.allInclusivePrice != null) && !pricing.currency) {
      out.pricing = { ...pricing, currency: "INR" };
    } else {
      out.pricing = pricing;
    }
  } else if (input.price != null) {
    out.pricing = { basePrice: input.price, currency: "INR" };
  }

  if (input.floorInfo) {
    out.floorInfo = input.floorInfo;
  } else if (input.floor != null) {
    out.floorInfo = { number: input.floor };
  }

  return out;
}

function mergeUnitLike(existing: any, patchInput: any) {
  return {
    ...existing,
    ...patchInput,
    revenue:
      patchInput?.revenue !== undefined
        ? {
            ...(existing?.revenue || {}),
            ...(patchInput?.revenue || {})
          }
        : existing?.revenue,
    area:
      patchInput?.area !== undefined
        ? {
            ...(existing?.area || {}),
            ...(patchInput?.area || {})
          }
        : existing?.area,
    pricing:
      patchInput?.pricing !== undefined
        ? {
            ...(existing?.pricing || {}),
            ...(patchInput?.pricing || {})
          }
        : existing?.pricing,
    floorInfo:
      patchInput?.floorInfo !== undefined
        ? {
            ...(existing?.floorInfo || {}),
            ...(patchInput?.floorInfo || {})
          }
        : existing?.floorInfo,
    media:
      patchInput?.media !== undefined
        ? {
            ...(existing?.media || {}),
            ...(patchInput?.media || {})
          }
        : existing?.media,
    mixedMeta:
      patchInput?.mixedMeta !== undefined
        ? {
            ...(existing?.mixedMeta || {}),
            ...(patchInput?.mixedMeta || {})
          }
        : existing?.mixedMeta
  };
}

export function validateUnitMergedStrict(args: {
  existing: UnitDoc;
  patchInput: any;
}): { ok: true; unit: UnitDoc } | { ok: false; errors: Record<string, string> } {
  const unit = mergeUnitLike(args.existing, args.patchInput) as UnitDoc;
  const errors = collectStrictUnitValidationErrors(unit);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, unit };
}

export const UnitCreateSchema = UnitCreateSchemaRaw.transform(normalizeUnitCreate);
export type UnitCreateInput = z.infer<typeof UnitCreateSchema>;

export const UnitUpdateSchema: z.ZodType<Partial<UnitCreateInput>> =
  UnitCreateSchemaRawBase.partial().transform(normalizeUnitPatch);
export type UnitUpdateInput = z.infer<typeof UnitUpdateSchema>;

export const UnitBulkCreateSchema = z.object({
  units: z.array(UnitCreateSchema).min(1)
});
export type UnitBulkCreateInput = z.infer<typeof UnitBulkCreateSchema>;

export const ProjectListQuerySchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  lifecycleStatus: z.string().optional(),
  recordStatus: z.string().optional(),
  visibility: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional()
});

export const PublicProjectListQuerySchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  lifecycleStatus: z.string().optional(),
  recordStatus: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  bhk: z.string().optional(),
  sort: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional()
});

export const PublicProjectUnitsQuerySchema = z.object({
  availability: z.string().optional(),
  bhk: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.string().optional()
});
