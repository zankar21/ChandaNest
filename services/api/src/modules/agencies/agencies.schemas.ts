import { z } from "zod";
import { AgencyRoleSchema, MembershipStatusSchema } from "../memberships/memberships.schemas";

export const AgencyCreateSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().min(2).optional(),
  reraId: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional(),
  city: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional()
});

export const AgencyMemberCreateSchema = z.object({
  userId: z.string().min(1),
  role: AgencyRoleSchema,
  status: MembershipStatusSchema.optional().default("active")
});

export const AgencyMemberUpdateSchema = z.object({
  role: AgencyRoleSchema.optional(),
  status: MembershipStatusSchema.optional()
});
