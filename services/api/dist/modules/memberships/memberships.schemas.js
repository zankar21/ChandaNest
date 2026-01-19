"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipUpdateSchema = exports.EnterpriseRoleSchema = exports.AgencyRoleSchema = exports.MembershipStatusSchema = void 0;
const zod_1 = require("zod");
const permissions_1 = require("./permissions");
exports.MembershipStatusSchema = zod_1.z.enum(["active", "suspended"]);
exports.AgencyRoleSchema = zod_1.z.enum([...permissions_1.AgencyRoles]);
exports.EnterpriseRoleSchema = zod_1.z.enum([...permissions_1.EnterpriseRoles]);
exports.MembershipUpdateSchema = zod_1.z.object({
    role: zod_1.z.union([exports.AgencyRoleSchema, exports.EnterpriseRoleSchema]).optional(),
    status: exports.MembershipStatusSchema.optional()
});
