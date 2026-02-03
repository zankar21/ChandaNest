"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListBuyerRequestQuerySchema = exports.PatchBuyerRequestSchema = exports.CreateBuyerRequestSchema = void 0;
const zod_1 = require("zod");
const market_1 = require("../../constants/market");
const propertyEnums_1 = require("../../constants/propertyEnums");
const statusEnum = zod_1.z.enum(["created", "contacted", "closed"]);
const intentEnum = zod_1.z.enum(["buy", "rent", "invest", "lease", "other"]);
const budgetSchema = zod_1.z.object({
    currency: zod_1.z.string().min(1),
    min: zod_1.z.number(),
    max: zod_1.z.number()
});
const consentSchema = zod_1.z.object({
    granted: zod_1.z.literal(true),
    at: zod_1.z.union([zod_1.z.date(), zod_1.z.string(), zod_1.z.number()]).optional(),
    partnerShare: zod_1.z.boolean()
});
exports.CreateBuyerRequestSchema = zod_1.z.object({
    citySlug: zod_1.z.enum(market_1.TARGET_CITY_SLUGS),
    intent: intentEnum,
    property: zod_1.z.object({
        category: zod_1.z.enum(propertyEnums_1.LISTING_CATEGORY),
        type: zod_1.z.enum(propertyEnums_1.LISTING_TYPE).default(propertyEnums_1.DEFAULTS.landType),
        bhk: zod_1.z.number().optional()
    }),
    budget: budgetSchema,
    localityText: zod_1.z.string().min(1),
    mustHaves: zod_1.z.array(zod_1.z.string()).default([]),
    dealBreakers: zod_1.z.array(zod_1.z.string()).default([]),
    consent: consentSchema,
    buyer: zod_1.z.object({
        name: zod_1.z.string().min(1),
        phone: zod_1.z.string().min(6),
        preferredCallTime: zod_1.z.string().optional().default("anytime")
    })
});
exports.PatchBuyerRequestSchema = zod_1.z.object({
    status: statusEnum.optional(),
    notes: zod_1.z.string().optional()
});
exports.ListBuyerRequestQuerySchema = zod_1.z.object({
    status: statusEnum.optional(),
    citySlug: zod_1.z.enum(market_1.TARGET_CITY_SLUGS).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(50)
});
