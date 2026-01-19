import { z } from "zod";

export const PublicNearbyParamsSchema = z.object({
  propertyId: z.string().min(4).max(128).regex(/^[A-Za-z0-9_-]+$/)
});

export type PublicNearbyParams = z.infer<typeof PublicNearbyParamsSchema>;
