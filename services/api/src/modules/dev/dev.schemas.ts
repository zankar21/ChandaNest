import { z } from "zod";

export const DevMakeAgentSchema = z.object({
  tenantId: z.string().optional(),
  displayName: z.string().optional()
});
