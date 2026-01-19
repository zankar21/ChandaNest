"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectBusinessRequestSchema = exports.ApproveBusinessRequestSchema = exports.ListBusinessRequestsQuerySchema = exports.BusinessRequestStatusSchema = void 0;
const zod_1 = require("zod");
exports.BusinessRequestStatusSchema = zod_1.z.enum(["pending", "approved", "rejected"]);
exports.ListBusinessRequestsQuerySchema = zod_1.z.object({
    status: exports.BusinessRequestStatusSchema.optional().default("pending"),
    q: zod_1.z.string().trim().min(1).max(120).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(50),
    cursor: zod_1.z.string().optional()
});
exports.ApproveBusinessRequestSchema = zod_1.z.object({
    tenantType: zod_1.z.enum(["agency", "enterprise", "builder"]).optional(),
    tenantSlug: zod_1.z.string().trim().min(2).max(60).optional(),
    plan: zod_1.z.enum(["trial", "starter", "pro", "enterprise"]).optional().default("trial")
});
exports.RejectBusinessRequestSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().min(5).max(400)
});
