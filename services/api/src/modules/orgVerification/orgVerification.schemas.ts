import { z } from "zod";

export const OrgTypeSchema = z.enum(["agency", "enterprise"]);

export const OrgVerificationStatusSchema = z.enum(["pending", "verified", "rejected"]);

export const ChecklistSchema = z.object({
  rera: z.boolean().optional(),
  firmRegistration: z.boolean().optional(),
  addressProof: z.boolean().optional(),
  gst: z.boolean().optional(),
  pan: z.boolean().optional(),
  authorizationLetter: z.boolean().optional()
});

export const OrgVerificationDecideSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  checklist: ChecklistSchema.optional(),
  notes: z.string().min(1).optional(),
  reason: z.string().min(1).optional()
});
