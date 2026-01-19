import { z } from "zod";

export const BusinessTypeSchema = z.enum(["agency", "enterprise", "builder"]);

const phoneRegex = /^(\+?\d{10,15})$/;
const gstRegex = /^[0-9A-Z]{15}$/;

export const PublicBusinessRequestBodySchema = z.object({
  businessType: BusinessTypeSchema,
  organizationName: z.string().trim().min(3).max(120),
  contactPerson: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().refine((value) => phoneRegex.test(value), {
    message: "phone must be 10-15 digits, optionally prefixed with +"
  }),
  city: z.string().trim().min(2).max(80),
  gstNumber: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => gstRegex.test(value), { message: "gstNumber must be 15 alphanumeric characters" })
    .optional(),
  website: z.string().trim().url().max(200).optional(),
  expectedListings: z.coerce.number().int().min(0).max(100000).optional(),
  message: z.string().trim().max(1000).optional(),
  hp: z.string().optional()
});

export const PublicBusinessRequestInputSchema = PublicBusinessRequestBodySchema.omit({ hp: true });

export type PublicBusinessRequestBody = z.infer<typeof PublicBusinessRequestBodySchema>;
export type PublicBusinessRequestInput = z.infer<typeof PublicBusinessRequestInputSchema>;
