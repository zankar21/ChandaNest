"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicBusinessRequestInputSchema = exports.PublicBusinessRequestBodySchema = exports.BusinessTypeSchema = void 0;
const zod_1 = require("zod");
exports.BusinessTypeSchema = zod_1.z.enum(["agency", "enterprise", "builder"]);
const phoneRegex = /^(\+?\d{10,15})$/;
const gstRegex = /^[0-9A-Z]{15}$/;
exports.PublicBusinessRequestBodySchema = zod_1.z.object({
    businessType: exports.BusinessTypeSchema,
    organizationName: zod_1.z.string().trim().min(3).max(120),
    contactPerson: zod_1.z.string().trim().min(2).max(80),
    email: zod_1.z.string().trim().email(),
    phone: zod_1.z.string().trim().refine((value) => phoneRegex.test(value), {
        message: "phone must be 10-15 digits, optionally prefixed with +"
    }),
    city: zod_1.z.string().trim().min(2).max(80),
    gstNumber: zod_1.z
        .string()
        .trim()
        .transform((value) => value.toUpperCase())
        .refine((value) => gstRegex.test(value), { message: "gstNumber must be 15 alphanumeric characters" })
        .optional(),
    website: zod_1.z.string().trim().url().max(200).optional(),
    expectedListings: zod_1.z.coerce.number().int().min(0).max(100000).optional(),
    message: zod_1.z.string().trim().max(1000).optional(),
    hp: zod_1.z.string().optional()
});
exports.PublicBusinessRequestInputSchema = exports.PublicBusinessRequestBodySchema.omit({ hp: true });
