import { z } from "zod";

export const OrgTypeSchema = z.enum(["agency", "enterprise"]);

export const DocCategorySchema = z.enum([
  "rera",
  "gst",
  "pan",
  "address_proof",
  "firm_registration",
  "authorization_letter",
  "brochure",
  "layout_plan",
  "other"
]);

export const DocStatusSchema = z.enum(["active", "archived"]);

export const OrgDocCreateSchema = z.object({
  orgType: OrgTypeSchema,
  orgId: z.string().min(1),
  category: DocCategorySchema,
  objectPath: z.string().min(5),
  contentType: z.string().min(1).optional(),
  sizeBytes: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional()
});

export const OrgDocListQuerySchema = z.object({
  orgType: OrgTypeSchema,
  orgId: z.string().min(1),
  category: DocCategorySchema.optional()
});

export const OrgDocPatchSchema = z
  .object({
    status: DocStatusSchema.optional(),
    title: z.string().min(1).optional()
  })
  .refine((val) => val.status || val.title, { message: "No updates provided" });
