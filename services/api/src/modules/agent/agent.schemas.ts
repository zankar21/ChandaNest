import { z } from "zod";

export const AgentStatusSchema = z.enum(["PENDING", "ACTIVE", "REJECTED"]);

export const AgentOnboardingCompleteSchema = z.object({
  status: AgentStatusSchema.optional()
});

export const AgentOnboardingSubmitSchema = z.object({
  plan: z.enum(["independent", "professional", "enterprise"]),
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  city: z.string().min(1),
  reraId: z.string().optional()
});

export const AgentSubscriptionStartSchema = z.object({
  planCode: z.enum(["independent", "professional"])
});

export const AgentSubscriptionVerifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});
