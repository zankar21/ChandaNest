import { z } from "zod";

const LatLngSchema = z.object({
  lat: z.number().finite(),
  lng: z.number().finite()
});

const DestinationSchema = LatLngSchema.extend({
  label: z.string().min(1).max(120).optional(),
  type: z.string().min(1).max(60).optional()
});

export const DistanceMatrixRequestSchema = z.object({
  origin: LatLngSchema,
  destinations: z.array(DestinationSchema).min(1).max(20),
  mode: z.enum(["driving", "walking"]).default("driving")
});

export type DistanceMatrixRequest = z.infer<typeof DistanceMatrixRequestSchema>;
