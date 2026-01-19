import { z } from "zod";
import {
  AVAILABILITY_STATUS,
  DEFAULTS,
  LISTING_MODE,
  LISTING_DEAL_TYPE,
  NA_STATUS,
  PROPERTY_TYPE,
  UNIT_TYPE
} from "../../constants/propertyEnums";

const mediaItemSchema = z.object({
  objectPath: z.string().min(5)
});

const mediaItemInputSchema = z.preprocess((val) => {
  if (typeof val === "string") return { objectPath: val };
  return val;
}, mediaItemSchema);

const documentSchema = z.object({
  objectPath: z.string().min(5),
  title: z.string().min(1)
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

export const LocationSchema = z
  .object({
    citySlug: z.string().min(1),
    locality: z.string().min(1),
    addressLine: z.string().optional(),
    landmark: z.string().optional(),
    mouza: z.string().optional(),
    tahsil: z.string().optional(),
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
  roadWidth: z.number().positive().optional()
});

const plotInfoSchema = z.object({
  layoutApproved: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  facing: z.string().optional()
});

const flatSpecsSchema = z.object({
  unitNo: z.string().optional(),
  tower: z.string().optional(),
  floor: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  totalFloors: z.number().int().nonnegative().optional(),
  bhk: z.number().int().positive().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  carpetAreaSqFt: z.number().positive().optional(),
  builtUpAreaSqFt: z.number().positive().optional(),
  facing: z.string().optional(),
  parking: z.enum(["none", "open", "covered"]).optional(),
  furnishing: z.enum(["unfurnished", "semi", "fully"]).optional(),
  balconyCount: z.number().int().nonnegative().optional(),
  buildingAgeYears: z.number().int().nonnegative().optional(),
  lift: z.boolean().optional(),
  powerBackup: z.boolean().optional(),
  possessionStatus: z.enum(["ready", "under_construction"]).optional()
});

const villaSpecsSchema = z.object({
  plotAreaSqFt: z.number().positive().optional(),
  builtUpAreaSqFt: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  facing: z.string().optional()
});

const pricingSchema = z.object({
  currency: z.string().optional(),
  totalPrice: z.number().positive().optional(),
  pricePerSqFt: z.number().positive().optional(),
  rate: z.number().positive().optional(),
  rateUnit: z.enum(["sqft", "sqm", "acre", "hectare"]).optional(),
  rentPerMonth: z.number().positive().optional(),
  leaseAmount: z.number().positive().optional(),
  leasePerMonth: z.number().positive().optional(),
  maintenanceMonthly: z.number().positive().optional(),
  deposit: z.number().positive().optional(),
  negotiable: z.boolean().optional()
});

const landRecordSchema = z.object({
  landType: z.enum(["agricultural", "na", "farm", "industrial", "open"]).optional(),
  mouza: z.string().optional(),
  surveyOrGatNo: z.string().optional(),
  wardOrWarg: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().optional(),
  boundaryWall: z.boolean().optional(),
  plotShape: z.string().optional(),
  frontageFeet: z.number().positive().optional(),
  is712Available: z.boolean().optional(),
  naStatus: z.enum(NA_STATUS).optional(),
  roadAccess: z.boolean().optional(),
  waterSource: z.enum(["none", "well", "borewell", "canal"]).optional(),
  electricity: z.boolean().optional()
});

const rentalSchema = z.object({
  leaseTermMonths: z.number().int().positive().optional().default(11),
  availableFrom: z.string().optional(),
  maintenance: z.number().positive().optional(),
  maintenanceIncluded: z.boolean().optional(),
  preferredTenants: z.enum(["family", "bachelor", "any"]).optional(),
  petsAllowed: z.boolean().optional()
});

const areaSchema = z.object({
  value: z.number().positive().optional(),
  unit: z.enum(["sqft", "sqm", "acre", "hectare"]).optional()
});

const contactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  preferred: z.enum(["call", "whatsapp", "both"]).optional()
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

const baseListingSchema = z.object({
  mode: z.enum(LISTING_MODE),
  type: z.enum(LISTING_DEAL_TYPE),
  propertyType: z.enum(PROPERTY_TYPE),
  title: z.string().min(3),
  description: descriptionSchema.optional(),
  brokeragePartnerId: z.literal(DEFAULTS.brokeragePartnerId),
  location: LocationSchema.optional(),
  specs: z
    .object({
      land: landSpecsSchema.optional(),
      flat: flatSpecsSchema.optional(),
      villa: villaSpecsSchema.optional(),
      house: flatSpecsSchema.optional()
    })
    .optional(),
  plotInfo: plotInfoSchema.optional(),
  landRecord: landRecordSchema.optional(),
  area: areaSchema.optional(),
  contact: contactSchema.optional(),
  pricing: pricingSchema.optional(),
  rental: rentalSchema.optional(),
  media: mediaSchema,
  documents: documentsSchema,
  status: z.string().optional(),
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
  availability: z.enum(AVAILABILITY_STATUS).optional()
});

function requireField(condition: boolean, ctx: z.RefinementCtx, message: string, path: (string | number)[]) {
  if (!condition) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
  }
}

export const CreatePropertySchema = baseListingSchema.superRefine((val, ctx) => {
  if (val.mode === "independent") {
    requireField(!!val.location?.citySlug, ctx, "citySlug is required for independent listings", ["location", "citySlug"]);
    requireField(!!val.location?.locality, ctx, "locality is required for independent listings", ["location", "locality"]);
  }
  if (val.mode === "project_unit") {
    requireField(!!val.projectId, ctx, "projectId is required for project units", ["projectId"]);
    requireField(!!val.unitType, ctx, "unitType is required for project units", ["unitType"]);
    requireField(!!val.availability, ctx, "availability is required for project units", ["availability"]);
  }
});
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;

export const PatchPropertySchema = baseListingSchema.deepPartial();
export type PatchPropertyInput = z.infer<typeof PatchPropertySchema>;

export const SubmitPropertySchema = baseListingSchema.superRefine((val, ctx) => {
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
    if (val.propertyType === "land") {
      requireField(!!val.landRecord?.mouza, ctx, "mouza is required for land listings", ["landRecord", "mouza"]);
      requireField(
        !!val.landRecord?.surveyOrGatNo,
        ctx,
        "surveyOrGatNo is required for land listings",
        ["landRecord", "surveyOrGatNo"]
      );
      requireField(!!val.landRecord?.taluka, ctx, "taluka is required for land listings", ["landRecord", "taluka"]);
      requireField(
        !!val.landRecord?.district,
        ctx,
        "district is required for land listings",
        ["landRecord", "district"]
      );
    }
    if (val.propertyType === "apartment" || val.propertyType === "flat") {
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

  if (val.type === "sale") {
    requireField(!!val.pricing?.totalPrice || !!val.pricing?.pricePerSqFt, ctx, "totalPrice or pricePerSqFt is required for sale", ["pricing"]);
  }
  if (val.type === "rent") {
    requireField(!!val.pricing?.rentPerMonth, ctx, "rentPerMonth is required for rent", ["pricing", "rentPerMonth"]);
  }
  if (val.type === "lease") {
    requireField(!!val.pricing?.leaseAmount || !!val.pricing?.leasePerMonth, ctx, "leaseAmount or leasePerMonth is required for lease", ["pricing"]);
  }
});
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
  visibility: z.enum(["draft", "published"])
});
export type SetVisibilityInput = z.infer<typeof SetVisibilitySchema>;

export const FeaturePropertySchema = z.object({
  featured: z.boolean()
});
export type FeaturePropertyInput = z.infer<typeof FeaturePropertySchema>;

export const PublicListQuerySchema = z.object({
  citySlug: z.string().optional(),
  propertyType: z.enum(PROPERTY_TYPE).optional(),
  type: z.enum(LISTING_DEAL_TYPE).optional(),
  mode: z.enum(LISTING_MODE).optional(),
  projectId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const ListPropertiesQuerySchema = z.object({
  mine: z.enum(["1", "true"]).optional()
});
