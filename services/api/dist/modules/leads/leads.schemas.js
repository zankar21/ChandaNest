"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadQuerySchema = exports.LeadStatusUpdateSchema = exports.LeadActivityCreateSchema = exports.LeadActivityTypeSchema = exports.LeadAssignSchema = exports.PublicLeadCreateSchema = exports.LeadListingSourceSchema = exports.LeadStatusSchema = void 0;
const zod_1 = require("zod");
exports.LeadStatusSchema = zod_1.z.enum([
    "new",
    "contacted",
    "sitevisit",
    "negotiation",
    "closed",
    "lost"
]);
exports.LeadListingSourceSchema = zod_1.z.enum(["owner", "org"]);
exports.PublicLeadCreateSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    listingSource: exports.LeadListingSourceSchema,
    listingId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(2).max(80),
    phone: zod_1.z.string().min(10).max(15),
    email: zod_1.z.string().email().optional(),
    message: zod_1.z.string().max(1000).optional(),
    pageUrl: zod_1.z.string().min(5).optional()
});
exports.LeadAssignSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1)
});
exports.LeadActivityTypeSchema = zod_1.z.enum([
    "note",
    "call",
    "whatsapp",
    "email",
    "status_change",
    "assignment"
]);
exports.LeadActivityCreateSchema = zod_1.z.object({
    type: exports.LeadActivityTypeSchema,
    note: zod_1.z.string().min(1).max(1000).optional()
});
exports.LeadStatusUpdateSchema = zod_1.z.object({
    status: exports.LeadStatusSchema
});
exports.LeadQuerySchema = zod_1.z.object({
    status: exports.LeadStatusSchema.optional(),
    listingSource: exports.LeadListingSourceSchema.optional(),
    principalType: zod_1.z.enum(["owner", "agent", "agency", "enterprise"]).optional(),
    principalId: zod_1.z.string().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional()
});
