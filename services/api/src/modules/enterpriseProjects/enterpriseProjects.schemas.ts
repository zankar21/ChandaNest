import { z } from "zod";

export const ProjectStatusSchema = z.enum(["active", "inactive"]);

export const ProjectCreateSchema = z.object({
  name: z.string().min(2),
  reraId: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional(),
  propertyTypesSupported: z.array(z.string().min(2)).optional(),
  status: ProjectStatusSchema.default("active"),
  amenities: z.array(z.string().min(1)).optional(),
  possessionDate: z.string().min(4).optional()
});

export const ProjectPatchSchema = ProjectCreateSchema.partial();
