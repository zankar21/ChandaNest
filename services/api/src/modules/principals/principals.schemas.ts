import { z } from "zod";

export const PrincipalTypeSchema = z.enum(["owner", "agent", "agency", "enterprise"]);

export const PrincipalRefSchema = z.object({
  type: PrincipalTypeSchema,
  id: z.string().min(1)
});

export const PrincipalScopeItemSchema = z.object({
  type: PrincipalTypeSchema,
  id: z.string().min(1),
  label: z.string().min(1),
  role: z.string().optional(),
  orgType: z.enum(["agency", "enterprise"]).optional(),
  orgId: z.string().optional()
});

export const PrincipalScopeResponseSchema = z.object({
  ok: z.literal(true),
  tenantId: z.string().min(1),
  principals: z.array(PrincipalScopeItemSchema)
});

export type PrincipalType = z.infer<typeof PrincipalTypeSchema>;
export type PrincipalScopeItem = z.infer<typeof PrincipalScopeItemSchema>;
