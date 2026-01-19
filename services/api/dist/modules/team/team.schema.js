"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamUserActionSchema = exports.TeamRevokeInviteSchema = exports.TeamTenantQuerySchema = exports.TeamInviteListQuerySchema = exports.TeamInviteCreateSchema = exports.TeamRoleSchema = void 0;
const zod_1 = require("zod");
exports.TeamRoleSchema = zod_1.z.enum(["tenant_manager", "tenant_agent", "tenant_viewer"]);
exports.TeamInviteCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: exports.TeamRoleSchema,
    displayName: zod_1.z.string().min(1).max(120).optional()
});
exports.TeamInviteListQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["active", "used", "revoked", "expired"]).optional(),
    tenantId: zod_1.z.string().min(1).optional()
});
exports.TeamTenantQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1).optional()
});
exports.TeamRevokeInviteSchema = zod_1.z.object({
    inviteId: zod_1.z.string().min(1)
});
exports.TeamUserActionSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1)
});
