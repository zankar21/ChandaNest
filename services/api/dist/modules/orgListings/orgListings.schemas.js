"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitionRequestSchema = exports.TransitionActionSchema = exports.OrgListingQuerySchema = exports.OrgListingPatchSchema = exports.OrgListingCreateSchema = exports.MediaItemSchema = exports.PricingSchema = exports.LocationSchema = exports.ListingTypeSchema = exports.VisibilitySchema = exports.LifecycleStateSchema = exports.PrincipalTypeSchema = void 0;
const zod_1 = require("zod");
exports.PrincipalTypeSchema = zod_1.z.enum(["agent", "agency", "enterprise"]);
exports.LifecycleStateSchema = zod_1.z.enum([
    "draft",
    "review",
    "approved",
    "published",
    "unpublished",
    "archived"
]);
exports.VisibilitySchema = zod_1.z.enum(["public", "private"]);
exports.ListingTypeSchema = zod_1.z.enum(["sale", "rent"]);
exports.LocationSchema = zod_1.z.object({
    city: zod_1.z.string().min(2),
    area: zod_1.z.string().min(2).optional(),
    addressLine: zod_1.z.string().min(2).optional(),
    lat: zod_1.z.number().finite().optional(),
    lng: zod_1.z.number().finite().optional()
});
exports.PricingSchema = zod_1.z.object({
    totalPrice: zod_1.z.number().positive().optional(),
    price: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().min(1).optional()
});
exports.MediaItemSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5),
    label: zod_1.z.string().min(1).optional()
});
exports.OrgListingCreateSchema = zod_1.z.object({
    principalType: exports.PrincipalTypeSchema,
    principalId: zod_1.z.string().min(1),
    title: zod_1.z.string().min(3),
    propertyType: zod_1.z.string().min(2),
    listingType: exports.ListingTypeSchema,
    location: exports.LocationSchema,
    pricing: exports.PricingSchema.optional(),
    media: zod_1.z
        .object({
        gallery: zod_1.z.array(exports.MediaItemSchema).optional()
    })
        .optional(),
    description: zod_1.z.string().min(10).optional(),
    attributes: zod_1.z.record(zod_1.z.any()).optional(),
    enterpriseProjectId: zod_1.z.string().min(1).optional(),
    inventoryItemId: zod_1.z.string().min(1).optional(),
    ownerUid: zod_1.z.string().min(1).optional(),
    ownerListingId: zod_1.z.string().min(1).optional(),
    mandateId: zod_1.z.string().min(1).optional()
});
exports.OrgListingPatchSchema = exports.OrgListingCreateSchema.partial().extend({
    principalType: zod_1.z.undefined().optional(),
    principalId: zod_1.z.undefined().optional()
});
exports.OrgListingQuerySchema = zod_1.z.object({
    principalType: exports.PrincipalTypeSchema.optional(),
    principalId: zod_1.z.string().min(1).optional(),
    lifecycleState: exports.LifecycleStateSchema.optional()
});
exports.TransitionActionSchema = zod_1.z.enum([
    "submit",
    "approve",
    "publish",
    "unpublish",
    "archive"
]);
exports.TransitionRequestSchema = zod_1.z.object({
    action: exports.TransitionActionSchema,
    note: zod_1.z.string().min(3).optional()
});
