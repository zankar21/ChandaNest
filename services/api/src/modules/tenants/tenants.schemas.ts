import { z } from "zod";

export const EmptyBodySchema = z.object({}).strict();

export const OwnerOnboardSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    ownerType: z.enum(["individual", "company", "family_joint"]),
    city: z.string().min(2).max(80),
    contactPreference: z.enum(["call", "whatsapp"]),
    bestTimeToContact: z.enum(["morning", "afternoon", "evening"]),
    alternatePhone: z.string().min(8).max(20).optional(),
    email: z.string().email().optional(),
    consentOwner: z.literal(true),
    consentTerms: z.literal(true),
    consentContact: z.literal(true)
  })
  .strict();
