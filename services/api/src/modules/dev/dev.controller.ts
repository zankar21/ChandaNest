import { Request, Response } from "express";
import { env } from "../../config/env";
import { DevMakeAgentSchema } from "./dev.schemas";
import { upsertAgentProfile } from "../agent/agent.service";

export async function makeAgentDevHandler(req: Request, res: Response) {
  if (!env.allowDevAgentGrant) {
    return res.status(403).json({ ok: false, error: { message: "Dev agent grant disabled", code: "FORBIDDEN" } });
  }
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  const parsed = DevMakeAgentSchema.parse(req.body || {});
  const tenantId =
    parsed.tenantId ||
    user.tenantId ||
    env.publicMarketplaceTenantId ||
    env.platformTenantId ||
    "powerpulsetech";
  const profile = await upsertAgentProfile({
    tenantId,
    user,
    status: "active",
    displayName: parsed.displayName || user.email || "Agent"
  });
  return res.json({ ok: true, isAgent: true, tenantId, profile });
}

export async function billingStatusDevHandler(_req: Request, res: Response) {
  if (env.nodeEnv === "production") {
    return res.status(404).json({ ok: false, error: { message: "Not found", code: "NOT_FOUND" } });
  }
  const missing: string[] = [];
  if (!env.razorpayKeyId) missing.push("RAZORPAY_KEY_ID");
  if (!env.razorpayKeySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (!env.razorpayPlanAgentMonthly) missing.push("RAZORPAY_PLAN_AGENT_MONTHLY");
  if (!env.razorpayPlanProfessionalMonthly) missing.push("RAZORPAY_PLAN_PROFESSIONAL_MONTHLY");
  return res.json({
    ok: true,
    data: {
      billingProvider: env.billingProvider,
      razorpayConfigured: missing.length === 0,
      missing
    }
  });
}

export async function razorpayModeDevHandler(_req: Request, res: Response) {
  if (env.nodeEnv === "production") {
    return res.status(404).json({ ok: false, error: { message: "Not found", code: "NOT_FOUND" } });
  }
  const keyPrefix = env.razorpayKeyId.startsWith("rzp_live_")
    ? "rzp_live"
    : env.razorpayKeyId.startsWith("rzp_test_")
    ? "rzp_test"
    : "unknown";
  const planPrefixes = [
    env.razorpayPlanAgentMonthly ? env.razorpayPlanAgentMonthly.split("_")[0] : "missing",
    env.razorpayPlanProfessionalMonthly ? env.razorpayPlanProfessionalMonthly.split("_")[0] : "missing"
  ];
  return res.json({ ok: true, data: { keyPrefix, planPrefixes } });
}
