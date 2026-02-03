"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListPropertiesQuerySchema = exports.PublicListQuerySchema = exports.FeaturePropertySchema = exports.SetVisibilitySchema = exports.RejectPropertySchema = exports.ApprovePropertySchema = exports.SubmitPropertySchema = exports.PatchPropertySchema = exports.CreatePropertySchema = exports.LocationSchema = void 0;
const zod_1 = require("zod");
const propertyEnums_1 = require("../../constants/propertyEnums");
const mediaItemSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5)
});
const mediaItemInputSchema = zod_1.z.preprocess((val) => {
    if (typeof val === "string")
        return { objectPath: val };
    return val;
}, mediaItemSchema);
const documentSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5),
    title: zod_1.z.string().min(1)
});
const landDocumentSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5),
    fileName: zod_1.z.string().max(120).optional(),
    contentType: zod_1.z.string().optional()
});
const landDocumentsSchema = zod_1.z
    .object({
    extract712: zod_1.z.union([landDocumentSchema, zod_1.z.null()]).optional(),
    naOrder: zod_1.z.union([landDocumentSchema, zod_1.z.null()]).optional(),
    other: zod_1.z.union([landDocumentSchema, zod_1.z.null()]).optional()
})
    .optional();
const documentsSchema = zod_1.z
    .object({
    land: landDocumentsSchema.optional()
})
    .optional();
const mediaSchema = zod_1.z
    .object({
    hero: zod_1.z.union([mediaItemInputSchema, zod_1.z.null()]).optional(),
    gallery: zod_1.z.array(mediaItemInputSchema).optional(),
    documents: zod_1.z.array(documentSchema).optional()
})
    .optional();
exports.LocationSchema = zod_1.z
    .object({
    citySlug: zod_1.z.string().min(1),
    locality: zod_1.z.string().min(1),
    addressLine: zod_1.z.string().optional(),
    landmark: zod_1.z.string().optional(),
    mouza: zod_1.z.string().optional(),
    tahsil: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional(),
    geo: zod_1.z
        .object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number()
    })
        .optional()
})
    .superRefine((val, ctx) => {
    const lat = val.geo?.lat ?? val.lat;
    const lng = val.geo?.lng ?? val.lng;
    if (lat !== undefined && (lat < -90 || lat > 90)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Latitude out of range", path: ["geo", "lat"] });
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message: "Longitude out of range", path: ["geo", "lng"] });
    }
})
    .transform((val) => {
    const geo = val.geo ??
        (val.lat !== undefined && val.lng !== undefined ? { lat: val.lat, lng: val.lng } : undefined);
    return {
        ...val,
        geo,
        lat: undefined,
        lng: undefined
    };
});
const landSpecsSchema = zod_1.z.object({
    landType: zod_1.z.string().optional(),
    plotAreaSqFt: zod_1.z.number().positive().optional(),
    frontage: zod_1.z.number().positive().optional(),
    depth: zod_1.z.number().positive().optional(),
    facing: zod_1.z.string().optional(),
    corner: zod_1.z.boolean().optional(),
    roadWidth: zod_1.z.number().positive().optional()
});
const plotInfoSchema = zod_1.z.object({
    layoutApproved: zod_1.z.boolean().optional(),
    cornerPlot: zod_1.z.boolean().optional(),
    facing: zod_1.z.string().optional()
});
const flatSpecsSchema = zod_1.z.object({
    unitNo: zod_1.z.string().optional(),
    tower: zod_1.z.string().optional(),
    floor: zod_1.z.union([zod_1.z.number().int().nonnegative(), zod_1.z.string().min(1)]).optional(),
    totalFloors: zod_1.z.number().int().nonnegative().optional(),
    bhk: zod_1.z.number().int().positive().optional(),
    bathrooms: zod_1.z.number().int().nonnegative().optional(),
    carpetAreaSqFt: zod_1.z.number().positive().optional(),
    builtUpAreaSqFt: zod_1.z.number().positive().optional(),
    facing: zod_1.z.string().optional(),
    parking: zod_1.z.enum(["none", "open", "covered"]).optional(),
    furnishing: zod_1.z.enum(["unfurnished", "semi", "fully"]).optional(),
    balconyCount: zod_1.z.number().int().nonnegative().optional(),
    buildingAgeYears: zod_1.z.number().int().nonnegative().optional(),
    lift: zod_1.z.boolean().optional(),
    powerBackup: zod_1.z.boolean().optional(),
    possessionStatus: zod_1.z.enum(["ready", "under_construction"]).optional()
});
const villaSpecsSchema = zod_1.z.object({
    plotAreaSqFt: zod_1.z.number().positive().optional(),
    builtUpAreaSqFt: zod_1.z.number().positive().optional(),
    bedrooms: zod_1.z.number().int().positive().optional(),
    bathrooms: zod_1.z.number().int().nonnegative().optional(),
    facing: zod_1.z.string().optional()
});
const pricingSchema = zod_1.z.object({
    currency: zod_1.z.string().optional(),
    totalPrice: zod_1.z.number().positive().optional(),
    pricePerSqFt: zod_1.z.number().positive().optional(),
    rate: zod_1.z.number().positive().optional(),
    rateUnit: zod_1.z.enum(["sqft", "sqm", "acre", "hectare"]).optional(),
    rentPerMonth: zod_1.z.number().positive().optional(),
    leaseAmount: zod_1.z.number().positive().optional(),
    leasePerMonth: zod_1.z.number().positive().optional(),
    maintenanceMonthly: zod_1.z.number().positive().optional(),
    deposit: zod_1.z.number().positive().optional(),
    negotiable: zod_1.z.boolean().optional()
});
const landRecordSchema = zod_1.z.object({
    landType: zod_1.z.enum(["agricultural", "na", "farm", "industrial", "open"]).optional(),
    mouza: zod_1.z.string().optional(),
    surveyOrGatNo: zod_1.z.string().optional(),
    wardOrWarg: zod_1.z.string().optional(),
    taluka: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    boundaryWall: zod_1.z.boolean().optional(),
    plotShape: zod_1.z.string().optional(),
    frontageFeet: zod_1.z.number().positive().optional(),
    is712Available: zod_1.z.boolean().optional(),
    naStatus: zod_1.z.enum(propertyEnums_1.NA_STATUS).optional(),
    roadAccess: zod_1.z.boolean().optional(),
    waterSource: zod_1.z.enum(["none", "well", "borewell", "canal"]).optional(),
    electricity: zod_1.z.boolean().optional()
});
const rentalSchema = zod_1.z.object({
    leaseTermMonths: zod_1.z.number().int().positive().optional().default(11),
    availableFrom: zod_1.z.string().optional(),
    maintenance: zod_1.z.number().positive().optional(),
    maintenanceIncluded: zod_1.z.boolean().optional(),
    preferredTenants: zod_1.z.enum(["family", "bachelor", "any"]).optional(),
    petsAllowed: zod_1.z.boolean().optional()
});
const areaSchema = zod_1.z.object({
    value: zod_1.z.number().positive().optional(),
    unit: zod_1.z.enum(["sqft", "sqm", "acre", "hectare"]).optional()
});
const contactSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    whatsapp: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    preferred: zod_1.z.enum(["call", "whatsapp", "both"]).optional()
});
const descriptionSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.object({
        user: zod_1.z.string().optional(),
        ai: zod_1.z.string().optional(),
        active: zod_1.z.enum(["user", "ai"]).optional(),
        aiMeta: zod_1.z
            .object({
            model: zod_1.z.string().min(1),
            generatedAt: zod_1.z.string().min(1),
            sourceHash: zod_1.z.string().min(1)
        })
            .optional()
    })
]);
const baseListingSchema = zod_1.z.object({
    mode: zod_1.z.enum(propertyEnums_1.LISTING_MODE),
    type: zod_1.z.enum(propertyEnums_1.LISTING_DEAL_TYPE),
    propertyType: zod_1.z.enum(propertyEnums_1.PROPERTY_TYPE),
    title: zod_1.z.string().min(3),
    description: descriptionSchema.optional(),
    brokeragePartnerId: zod_1.z.literal(propertyEnums_1.DEFAULTS.brokeragePartnerId),
    location: exports.LocationSchema.optional(),
    specs: zod_1.z
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
    status: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    unitType: zod_1.z.enum(propertyEnums_1.UNIT_TYPE).optional(),
    unit: zod_1.z
        .object({
        plot: landSpecsSchema.optional(),
        flat: flatSpecsSchema.optional(),
        villa: villaSpecsSchema.optional(),
        plotNo: zod_1.z.string().optional(),
        unitNo: zod_1.z.string().optional()
    })
        .optional(),
    availability: zod_1.z.enum(propertyEnums_1.AVAILABILITY_STATUS).optional()
});
function requireField(condition, ctx, message, path) {
    if (!condition) {
        ctx.addIssue({ code: zod_1.z.ZodIssueCode.custom, message, path });
    }
}
exports.CreatePropertySchema = baseListingSchema.superRefine((val, ctx) => {
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
exports.PatchPropertySchema = baseListingSchema.deepPartial();
exports.SubmitPropertySchema = baseListingSchema.superRefine((val, ctx) => {
    if (val.mode === "independent") {
        requireField(!!val.location?.citySlug, ctx, "citySlug is required", ["location", "citySlug"]);
        requireField(!!val.location?.locality, ctx, "locality is required", ["location", "locality"]);
        requireField(!!val.contact?.phone, ctx, "contact phone is required", ["contact", "phone"]);
        const descriptionMin = 30;
        const resolveDescriptionText = (input) => {
            if (!input)
                return "";
            if (typeof input === "string")
                return input;
            if (typeof input === "object") {
                const active = input.active;
                if (active === "ai" && typeof input.ai === "string")
                    return input.ai;
                if (active === "user" && typeof input.user === "string")
                    return input.user;
                if (typeof input.user === "string")
                    return input.user;
                if (typeof input.ai === "string")
                    return input.ai;
            }
            return "";
        };
        const descriptionText = resolveDescriptionText(val.description);
        const hasDescription = descriptionText.trim().length >= descriptionMin;
        requireField(hasDescription, ctx, `description must be at least ${descriptionMin} characters`, ["description"]);
        const hasHero = Boolean(val.media?.hero?.objectPath);
        const galleryCount = val.media?.gallery?.length ?? 0;
        requireField(hasHero || galleryCount >= 1, ctx, "at least one photo is required", hasHero ? ["media", "hero"] : ["media", "gallery"]);
        if (val.propertyType === "land" || val.propertyType === "plot") {
            requireField(!!val.area?.value, ctx, "area value is required for land/plot listings", ["area", "value"]);
            requireField(!!val.area?.unit, ctx, "area unit is required for land/plot listings", ["area", "unit"]);
        }
        if (val.propertyType === "land") {
            requireField(!!val.landRecord?.mouza, ctx, "mouza is required for land listings", ["landRecord", "mouza"]);
            requireField(!!val.landRecord?.surveyOrGatNo, ctx, "surveyOrGatNo is required for land listings", ["landRecord", "surveyOrGatNo"]);
            requireField(!!val.landRecord?.taluka, ctx, "taluka is required for land listings", ["landRecord", "taluka"]);
            requireField(!!val.landRecord?.district, ctx, "district is required for land listings", ["landRecord", "district"]);
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
exports.ApprovePropertySchema = zod_1.z.object({
    remarks: zod_1.z.string().optional()
});
exports.RejectPropertySchema = zod_1.z.object({
    reason: zod_1.z.string().min(3)
});
exports.SetVisibilitySchema = zod_1.z.object({
    visibility: zod_1.z.enum(["draft", "published"])
});
exports.FeaturePropertySchema = zod_1.z.object({
    featured: zod_1.z.boolean()
});
exports.PublicListQuerySchema = zod_1.z.object({
    citySlug: zod_1.z.string().optional(),
    propertyType: zod_1.z.enum(propertyEnums_1.PROPERTY_TYPE).optional(),
    type: zod_1.z.enum(propertyEnums_1.LISTING_DEAL_TYPE).optional(),
    mode: zod_1.z.enum(propertyEnums_1.LISTING_MODE).optional(),
    projectId: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20)
});
exports.ListPropertiesQuerySchema = zod_1.z.object({
    mine: zod_1.z.enum(["1", "true"]).optional()
});
