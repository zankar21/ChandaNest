"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicProjectListQuerySchema = exports.ProjectListQuerySchema = exports.UnitUpdateSchema = exports.UnitCreateSchema = exports.UnitAvailabilitySchema = exports.ProjectUpdateSchema = exports.ProjectCreateSchema = exports.VisibilityStateSchema = exports.ProjectStatusSchema = exports.ProjectTypeSchema = void 0;
const zod_1 = require("zod");
exports.ProjectTypeSchema = zod_1.z.enum(["apartment", "plot", "commercial", "mixed"]);
exports.ProjectStatusSchema = zod_1.z.enum(["planning", "under_construction", "ready"]);
exports.VisibilityStateSchema = zod_1.z.enum(["draft", "published"]);
const mediaItemSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5)
});
const mediaSchema = zod_1.z
    .object({
    cover: mediaItemSchema.optional(),
    gallery: zod_1.z.array(mediaItemSchema).optional(),
    brochure: mediaItemSchema.optional()
})
    .optional();
const reraSchema = zod_1.z
    .object({
    number: zod_1.z.string().min(3).optional(),
    authority: zod_1.z.string().min(2).optional()
})
    .optional();
const locationSchema = zod_1.z.object({
    city: zod_1.z.string().min(2),
    area: zod_1.z.string().optional(),
    addressLine: zod_1.z.string().optional(),
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional()
});
const priceRangeSchema = zod_1.z
    .object({
    min: zod_1.z.number().nonnegative().optional(),
    max: zod_1.z.number().nonnegative().optional(),
    currency: zod_1.z.literal("INR").optional()
})
    .optional();
exports.ProjectCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    slug: zod_1.z.string().min(2).optional(),
    enterpriseId: zod_1.z.string().optional(),
    type: exports.ProjectTypeSchema,
    status: exports.ProjectStatusSchema,
    rera: reraSchema,
    location: locationSchema,
    priceRange: priceRangeSchema,
    possessionDate: zod_1.z.string().optional(),
    amenities: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    highlights: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    media: mediaSchema
});
exports.ProjectUpdateSchema = exports.ProjectCreateSchema.partial();
exports.UnitAvailabilitySchema = zod_1.z.enum(["available", "blocked", "sold"]);
const unitMediaSchema = zod_1.z
    .object({
    floorPlan: mediaItemSchema.optional()
})
    .optional();
exports.UnitCreateSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    availability: exports.UnitAvailabilitySchema,
    areaSqFt: zod_1.z.number().nonnegative().optional(),
    carpetSqFt: zod_1.z.number().nonnegative().optional(),
    builtUpSqFt: zod_1.z.number().nonnegative().optional(),
    price: zod_1.z.number().nonnegative().optional(),
    floor: zod_1.z.number().optional(),
    facing: zod_1.z.string().optional(),
    media: unitMediaSchema
});
exports.UnitUpdateSchema = exports.UnitCreateSchema.partial();
exports.ProjectListQuerySchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    visibility: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    cursor: zod_1.z.string().optional()
});
exports.PublicProjectListQuerySchema = zod_1.z.object({
    city: zod_1.z.string().optional(),
    q: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    minPrice: zod_1.z.string().optional(),
    maxPrice: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
    cursor: zod_1.z.string().optional()
});
