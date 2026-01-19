import { z } from "zod";

export const GenerateAiDescriptionSchema = z.object({
  setActive: z.boolean().optional(),
  force: z.boolean().optional()
});

export type GenerateAiDescriptionInput = z.infer<typeof GenerateAiDescriptionSchema>;
