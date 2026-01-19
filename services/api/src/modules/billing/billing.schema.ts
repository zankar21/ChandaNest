import { z } from "zod";
import { PlanId } from "./plans";

export const PlanIdSchema = z.enum(["trial", "starter", "pro", "enterprise"]);
export const SubscriptionStatusSchema = z.enum(["active", "trialing", "past_due", "canceled", "expired"]);

export const GetSubscriptionQuerySchema = z.object({
  tenantId: z.string().trim().min(1).optional()
});

export const SubscriptionOverrideSchema = z.object({
  tenantId: z.string().trim().min(1),
  planId: PlanIdSchema,
  status: SubscriptionStatusSchema,
  validTill: z.string().trim().optional()
});

export const SubscriptionCancelSchema = z.object({});

export const OnboardingOverrideSchema = z.object({
  tenantId: z.string().trim().min(1),
  status: z.enum(["paid", "waived", "pending"]),
  amount: z.coerce.number().int().nonnegative().optional()
});

export type PlanIdValue = PlanId;
export type GetSubscriptionQuery = z.infer<typeof GetSubscriptionQuerySchema>;
export type SubscriptionOverrideInput = z.infer<typeof SubscriptionOverrideSchema>;
export type OnboardingOverrideInput = z.infer<typeof OnboardingOverrideSchema>;
