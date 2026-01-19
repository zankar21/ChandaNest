import { z } from "zod";
import { AgencyRoles, EnterpriseRoles } from "./permissions";

export const MembershipStatusSchema = z.enum(["active", "suspended"]);

export const AgencyRoleSchema = z.enum([...AgencyRoles]);
export const EnterpriseRoleSchema = z.enum([...EnterpriseRoles]);

export const MembershipUpdateSchema = z.object({
  role: z.union([AgencyRoleSchema, EnterpriseRoleSchema]).optional(),
  status: MembershipStatusSchema.optional()
});
