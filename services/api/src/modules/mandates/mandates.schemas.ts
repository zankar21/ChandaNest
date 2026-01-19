import { z } from "zod";

export const MandateOrgTypeSchema = z.enum(["agent", "agency"]);
export const MandateStatusSchema = z.enum(["pending", "active", "rejected", "expired", "revoked"]);
export const MandateTypeSchema = z.enum(["exclusive", "non_exclusive"]);

export const MandatePermissionsSchema = z.object({
  canPublish: z.boolean().optional(),
  canEditPrice: z.boolean().optional(),
  canEditMedia: z.boolean().optional()
});

export const MandateRequestSchema = z.object({
  orgType: MandateOrgTypeSchema,
  orgId: z.string().min(1),
  ownerUid: z.string().min(1),
  ownerListingId: z.string().min(1),
  mandateType: MandateTypeSchema.default("non_exclusive"),
  validTo: z.string().min(4).optional(),
  permissions: MandatePermissionsSchema.optional()
});

export const MandateApproveSchema = z.object({
  validFrom: z.string().min(4).optional(),
  validTo: z.string().min(4).optional()
});

export const MandateRejectSchema = z.object({
  reason: z.string().min(3)
});

export const MandateRevokeSchema = z.object({
  reason: z.string().min(3).optional()
});
