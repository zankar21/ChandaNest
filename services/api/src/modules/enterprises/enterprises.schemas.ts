import { z } from "zod";
import { EnterpriseRoleSchema, MembershipStatusSchema } from "../memberships/memberships.schemas";

export const EnterpriseCreateSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().min(2).optional(),
  reraId: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional(),
  city: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional()
});

export const EnterpriseMemberCreateSchema = z.object({
  userId: z.string().min(1),
  role: EnterpriseRoleSchema,
  status: MembershipStatusSchema.optional().default("active")
});

export const EnterpriseMemberUpdateSchema = z.object({
  role: EnterpriseRoleSchema.optional(),
  status: MembershipStatusSchema.optional()
});
