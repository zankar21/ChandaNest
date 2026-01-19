"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingOverrideSchema = exports.SubscriptionCancelSchema = exports.SubscriptionOverrideSchema = exports.GetSubscriptionQuerySchema = exports.SubscriptionStatusSchema = exports.PlanIdSchema = void 0;
const zod_1 = require("zod");
exports.PlanIdSchema = zod_1.z.enum(["trial", "starter", "pro", "enterprise"]);
exports.SubscriptionStatusSchema = zod_1.z.enum(["active", "trialing", "past_due", "canceled", "expired"]);
exports.GetSubscriptionQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().trim().min(1).optional()
});
exports.SubscriptionOverrideSchema = zod_1.z.object({
    tenantId: zod_1.z.string().trim().min(1),
    planId: exports.PlanIdSchema,
    status: exports.SubscriptionStatusSchema,
    validTill: zod_1.z.string().trim().optional()
});
exports.SubscriptionCancelSchema = zod_1.z.object({});
exports.OnboardingOverrideSchema = zod_1.z.object({
    tenantId: zod_1.z.string().trim().min(1),
    status: zod_1.z.enum(["paid", "waived", "pending"]),
    amount: zod_1.z.coerce.number().int().nonnegative().optional()
});
