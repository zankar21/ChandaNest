"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandateRevokeSchema = exports.MandateRejectSchema = exports.MandateApproveSchema = exports.MandateRequestSchema = exports.MandatePermissionsSchema = exports.MandateTypeSchema = exports.MandateStatusSchema = exports.MandateOrgTypeSchema = void 0;
const zod_1 = require("zod");
exports.MandateOrgTypeSchema = zod_1.z.enum(["agent", "agency"]);
exports.MandateStatusSchema = zod_1.z.enum(["pending", "active", "rejected", "expired", "revoked"]);
exports.MandateTypeSchema = zod_1.z.enum(["exclusive", "non_exclusive"]);
exports.MandatePermissionsSchema = zod_1.z.object({
    canPublish: zod_1.z.boolean().optional(),
    canEditPrice: zod_1.z.boolean().optional(),
    canEditMedia: zod_1.z.boolean().optional()
});
exports.MandateRequestSchema = zod_1.z.object({
    orgType: exports.MandateOrgTypeSchema,
    orgId: zod_1.z.string().min(1),
    ownerUid: zod_1.z.string().min(1),
    ownerListingId: zod_1.z.string().min(1),
    mandateType: exports.MandateTypeSchema.default("non_exclusive"),
    validTo: zod_1.z.string().min(4).optional(),
    permissions: exports.MandatePermissionsSchema.optional()
});
exports.MandateApproveSchema = zod_1.z.object({
    validFrom: zod_1.z.string().min(4).optional(),
    validTo: zod_1.z.string().min(4).optional()
});
exports.MandateRejectSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3)
});
exports.MandateRevokeSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).optional()
});
