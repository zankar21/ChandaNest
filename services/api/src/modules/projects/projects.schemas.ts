import { z } from "zod";

export const ProjectTypeSchema = z.enum(["apartment", "plot", "commercial", "mixed"]);
export const ProjectStatusSchema = z.enum(["planning", "under_construction", "ready"]);
export const VisibilityStateSchema = z.enum(["draft", "published"]);

const mediaItemSchema = z.object({
  objectPath: z.string().min(5)
});

const mediaSchema = z
  .object({
    cover: mediaItemSchema.optional(),
    gallery: z.array(mediaItemSchema).optional(),
    brochure: mediaItemSchema.optional()
  })
  .optional();

const reraSchema = z
  .object({
    number: z.string().min(3).optional(),
    authority: z.string().min(2).optional()
  })
  .optional();

const locationSchema = z.object({
  city: z.string().min(2),
  area: z.string().optional(),
  addressLine: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

const priceRangeSchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.literal("INR").optional()
  })
  .optional();

export const ProjectCreateSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(2).optional(),
  enterpriseId: z.string().optional(),
  type: ProjectTypeSchema,
  status: ProjectStatusSchema,
  rera: reraSchema,
  location: locationSchema,
  priceRange: priceRangeSchema,
  possessionDate: z.string().optional(),
  amenities: z.array(z.string().min(1)).optional(),
  highlights: z.array(z.string().min(1)).optional(),
  media: mediaSchema
});

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = ProjectCreateSchema.partial();
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

export const UnitAvailabilitySchema = z.enum(["available", "blocked", "sold"]);

const unitMediaSchema = z
  .object({
    floorPlan: mediaItemSchema.optional()
  })
  .optional();

export const UnitCreateSchema = z.object({
  type: z.string().min(1),
  availability: UnitAvailabilitySchema,
  areaSqFt: z.number().nonnegative().optional(),
  carpetSqFt: z.number().nonnegative().optional(),
  builtUpSqFt: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  floor: z.number().optional(),
  facing: z.string().optional(),
  media: unitMediaSchema
});

export type UnitCreateInput = z.infer<typeof UnitCreateSchema>;

export const UnitUpdateSchema = UnitCreateSchema.partial();
export type UnitUpdateInput = z.infer<typeof UnitUpdateSchema>;

export const ProjectListQuerySchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional()
});

export const PublicProjectListQuerySchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional()
});
