import { z } from "zod";
import { TARGET_CITY_SLUGS, type TargetCitySlug, FIXED_PARTNER } from "../../constants/market";
import { LISTING_CATEGORY, LISTING_TYPE, DEFAULTS } from "../../constants/propertyEnums";

const statusEnum = z.enum(["created", "contacted", "closed"]);
const intentEnum = z.enum(["buy", "rent", "invest", "lease", "other"]);

const budgetSchema = z.object({
  currency: z.string().min(1),
  min: z.number(),
  max: z.number()
});

const consentSchema = z.object({
  granted: z.literal(true),
  at: z.union([z.date(), z.string(), z.number()]).optional(),
  partnerShare: z.boolean()
});

export const CreateBuyerRequestSchema = z.object({
  citySlug: z.enum(TARGET_CITY_SLUGS),
  intent: intentEnum,
  property: z.object({
    category: z.enum(LISTING_CATEGORY),
    type: z.enum(LISTING_TYPE).default(DEFAULTS.landType),
    bhk: z.number().optional()
  }),
  budget: budgetSchema,
  localityText: z.string().min(1),
  mustHaves: z.array(z.string()).default([]),
  dealBreakers: z.array(z.string()).default([]),
  consent: consentSchema,
  buyer: z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    preferredCallTime: z.string().optional().default("anytime")
  })
});

export type CreateBuyerRequestInput = z.infer<typeof CreateBuyerRequestSchema> & {
  tenantId?: string;
};

export const PatchBuyerRequestSchema = z.object({
  status: statusEnum.optional(),
  notes: z.string().optional()
});
export type PatchBuyerRequestInput = z.infer<typeof PatchBuyerRequestSchema>;

export const ListBuyerRequestQuerySchema = z.object({
  status: statusEnum.optional(),
  citySlug: z.enum(TARGET_CITY_SLUGS).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});
export type ListBuyerRequestQuery = z.infer<typeof ListBuyerRequestQuerySchema>;

export type BuyerRequestStatus = z.infer<typeof statusEnum>;
export type BuyerRequest = {
  tenantId: string;
  requestId: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  status: BuyerRequestStatus;
  partner: typeof FIXED_PARTNER;
  citySlug: TargetCitySlug;
  intent: z.infer<typeof intentEnum>;
  property: {
    category: z.infer<typeof CreateBuyerRequestSchema>["property"]["category"];
    type: z.infer<typeof CreateBuyerRequestSchema>["property"]["type"];
    bhk?: number;
  };
  budget: z.infer<typeof budgetSchema>;
  localityText: string;
  mustHaves: string[];
  dealBreakers: string[];
  consent: z.infer<typeof consentSchema>;
  buyer: {
    name: string;
    phone: string;
    preferredCallTime?: string;
  };
  notes?: string;
};
