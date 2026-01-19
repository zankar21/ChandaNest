import { z } from "zod";

export const TeamRoleSchema = z.enum(["tenant_manager", "tenant_agent", "tenant_viewer"]);

export const TeamInviteCreateSchema = z.object({
  email: z.string().email(),
  role: TeamRoleSchema,
  displayName: z.string().min(1).max(120).optional()
});

export const TeamInviteListQuerySchema = z.object({
  status: z.enum(["active", "used", "revoked", "expired"]).optional(),
  tenantId: z.string().min(1).optional()
});

export const TeamTenantQuerySchema = z.object({
  tenantId: z.string().min(1).optional()
});

export const TeamRevokeInviteSchema = z.object({
  inviteId: z.string().min(1)
});

export const TeamUserActionSchema = z.object({
  uid: z.string().min(1)
});
