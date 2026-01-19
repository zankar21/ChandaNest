"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyMemberUpdateSchema = exports.AgencyMemberCreateSchema = exports.AgencyCreateSchema = void 0;
const zod_1 = require("zod");
const memberships_schemas_1 = require("../memberships/memberships.schemas");
exports.AgencyCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    legalName: zod_1.z.string().min(2).optional(),
    reraId: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().min(5).optional(),
    email: zod_1.z.string().email().optional(),
    city: zod_1.z.string().min(2).optional(),
    addressLine: zod_1.z.string().min(2).optional()
});
exports.AgencyMemberCreateSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    role: memberships_schemas_1.AgencyRoleSchema,
    status: memberships_schemas_1.MembershipStatusSchema.optional().default("active")
});
exports.AgencyMemberUpdateSchema = zod_1.z.object({
    role: memberships_schemas_1.AgencyRoleSchema.optional(),
    status: memberships_schemas_1.MembershipStatusSchema.optional()
});
