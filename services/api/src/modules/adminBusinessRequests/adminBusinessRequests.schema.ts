import { z } from "zod";

export const BusinessRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const ListBusinessRequestsQuerySchema = z.object({
  status: BusinessRequestStatusSchema.optional().default("pending"),
  q: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().optional()
});

export const ApproveBusinessRequestSchema = z.object({
  tenantType: z.enum(["agency", "enterprise", "builder"]).optional(),
  tenantSlug: z.string().trim().min(2).max(60).optional(),
  plan: z.enum(["trial", "starter", "pro", "enterprise"]).optional().default("trial")
});

export const RejectBusinessRequestSchema = z.object({
  reason: z.string().trim().min(5).max(400)
});

export type ListBusinessRequestsQuery = z.infer<typeof ListBusinessRequestsQuerySchema>;
export type ApproveBusinessRequestInput = z.infer<typeof ApproveBusinessRequestSchema>;
export type RejectBusinessRequestInput = z.infer<typeof RejectBusinessRequestSchema>;
