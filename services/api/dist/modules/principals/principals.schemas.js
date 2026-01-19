"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrincipalScopeResponseSchema = exports.PrincipalScopeItemSchema = exports.PrincipalRefSchema = exports.PrincipalTypeSchema = void 0;
const zod_1 = require("zod");
exports.PrincipalTypeSchema = zod_1.z.enum(["owner", "agent", "agency", "enterprise"]);
exports.PrincipalRefSchema = zod_1.z.object({
    type: exports.PrincipalTypeSchema,
    id: zod_1.z.string().min(1)
});
exports.PrincipalScopeItemSchema = zod_1.z.object({
    type: exports.PrincipalTypeSchema,
    id: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    role: zod_1.z.string().optional(),
    orgType: zod_1.z.enum(["agency", "enterprise"]).optional(),
    orgId: zod_1.z.string().optional()
});
exports.PrincipalScopeResponseSchema = zod_1.z.object({
    ok: zod_1.z.literal(true),
    tenantId: zod_1.z.string().min(1),
    principals: zod_1.z.array(exports.PrincipalScopeItemSchema)
});
