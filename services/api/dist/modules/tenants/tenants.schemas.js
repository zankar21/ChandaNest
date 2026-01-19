"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnerOnboardSchema = exports.EmptyBodySchema = void 0;
const zod_1 = require("zod");
exports.EmptyBodySchema = zod_1.z.object({}).strict();
exports.OwnerOnboardSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(2).max(120),
    ownerType: zod_1.z.enum(["individual", "company", "family_joint"]),
    city: zod_1.z.string().min(2).max(80),
    contactPreference: zod_1.z.enum(["call", "whatsapp"]),
    bestTimeToContact: zod_1.z.enum(["morning", "afternoon", "evening"]),
    alternatePhone: zod_1.z.string().min(8).max(20).optional(),
    email: zod_1.z.string().email().optional(),
    consentOwner: zod_1.z.literal(true),
    consentTerms: zod_1.z.literal(true),
    consentContact: zod_1.z.literal(true)
})
    .strict();
