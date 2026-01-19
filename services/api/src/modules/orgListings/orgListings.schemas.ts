import { z } from "zod";

export const PrincipalTypeSchema = z.enum(["agent", "agency", "enterprise"]);

export const LifecycleStateSchema = z.enum([
  "draft",
  "review",
  "approved",
  "published",
  "unpublished",
  "archived"
]);

export const VisibilitySchema = z.enum(["public", "private"]);

export const ListingTypeSchema = z.enum(["sale", "rent"]);

export const LocationSchema = z.object({
  city: z.string().min(2),
  area: z.string().min(2).optional(),
  addressLine: z.string().min(2).optional(),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional()
});

export const PricingSchema = z.object({
  totalPrice: z.number().positive().optional(),
  price: z.number().positive().optional(),
  currency: z.string().min(1).optional()
});

export const MediaItemSchema = z.object({
  objectPath: z.string().min(5),
  label: z.string().min(1).optional()
});

export const OrgListingCreateSchema = z.object({
  principalType: PrincipalTypeSchema,
  principalId: z.string().min(1),
  title: z.string().min(3),
  propertyType: z.string().min(2),
  listingType: ListingTypeSchema,
  location: LocationSchema,
  pricing: PricingSchema.optional(),
  media: z
    .object({
      gallery: z.array(MediaItemSchema).optional()
    })
    .optional(),
  description: z.string().min(10).optional(),
  attributes: z.record(z.any()).optional(),
  enterpriseProjectId: z.string().min(1).optional(),
  inventoryItemId: z.string().min(1).optional(),
  ownerUid: z.string().min(1).optional(),
  ownerListingId: z.string().min(1).optional(),
  mandateId: z.string().min(1).optional()
});

export const OrgListingPatchSchema = OrgListingCreateSchema.partial().extend({
  principalType: z.undefined().optional(),
  principalId: z.undefined().optional()
});

export const OrgListingQuerySchema = z.object({
  principalType: PrincipalTypeSchema.optional(),
  principalId: z.string().min(1).optional(),
  lifecycleState: LifecycleStateSchema.optional()
});

export const TransitionActionSchema = z.enum([
  "submit",
  "approve",
  "publish",
  "unpublish",
  "archive"
]);

export const TransitionRequestSchema = z.object({
  action: TransitionActionSchema,
  note: z.string().min(3).optional()
});
