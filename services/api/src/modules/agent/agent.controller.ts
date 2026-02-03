import { Request, Response } from "express";
import {
  AgentOnboardingCompleteSchema,
  AgentOnboardingSubmitSchema,
  AgentSubscriptionStartSchema,
  AgentSubscriptionVerifySchema
} from "./agent.schemas";
import { env } from "../../config/env";
import { fetchAgentProfile, submitAgentOnboarding, upsertAgentProfile } from "./agent.service";
import { countPublishedListingsForUser, listProperties } from "../properties/properties.service";
import { TRIAL_PUBLISH_LIMIT } from "../billing/plans";
import {
  activateAgentSubscription,
  createRazorpayAgentSubscription,
  fetchAgentSubscription,
  fetchRazorpaySubscription,
  resolveSubscriptionIndex,
  verifyRazorpaySubscriptionSignature
} from "./agent.subscription.service";

function mapAgentStatus(status?: string | null) {
  const normalized = typeof status === "string" ? status.toUpperCase() : "NONE";
  if (normalized === "ACTIVE") return "approved";
  if (normalized === "PENDING") return "pending";
  if (normalized === "REJECTED") return "rejected";
  return "none";
}

function getRazorpayMissingVars() {
  const missing: string[] = [];
  if (!env.razorpayKeyId) missing.push("RAZORPAY_KEY_ID");
  if (!env.razorpayKeySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (!env.razorpayPlanAgentMonthly) missing.push("RAZORPAY_PLAN_AGENT_MONTHLY");
  if (!env.razorpayPlanProfessionalMonthly) missing.push("RAZORPAY_PLAN_PROFESSIONAL_MONTHLY");
  return missing;
}

export async function completeAgentOnboardingHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  const parsed = AgentOnboardingCompleteSchema.parse(req.body || {});
  const status = parsed.status || "PENDING";
  const tenantId = user.tenantId;
  const profile = await upsertAgentProfile({
    tenantId,
    user,
    status,
    displayName: user.email || "Agent"
  });
  return res.json({ ok: true, isAgent: true, tenantId, status, profile });
}

export async function submitAgentOnboardingHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  const parsed = AgentOnboardingSubmitSchema.parse(req.body || {});
  const tenantId = user.tenantId;
  const status = env.nodeEnv === "development" ? "ACTIVE" : "PENDING";
  const profile = await submitAgentOnboarding({
    tenantId,
    user,
    status,
    plan: parsed.plan,
    fullName: parsed.fullName,
    businessName: parsed.businessName,
    city: parsed.city,
    reraId: parsed.reraId || null
  });
  const responseStatus = status === "ACTIVE" ? "approved" : "pending";
  return res.json({
    ok: true,
    data: { submitted: true, status: responseStatus, isAgent: status === "ACTIVE", agent: profile }
  });
}

export async function getAgentMeHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  let tenantId = user.tenantId || "";
  if (!tenantId) {
    if (env.nodeEnv === "development") {
      tenantId = env.defaultTenantId || "powerpulsetech";
    } else {
      return res.json({ ok: true, data: { isAgent: false, status: "none", agent: null, tenantId: null } });
    }
  }
  const agentDoc = await fetchAgentProfile(tenantId, user.uid);
  const rawStatus = typeof agentDoc?.status === "string" ? String(agentDoc.status) : "NONE";
  const status = rawStatus.toUpperCase();
  const isActive = status === "ACTIVE";
  const agentSubscription = await fetchAgentSubscription(tenantId, user.uid);
  const subscriptionStatus = agentSubscription?.status || "trial";
  const planCode = agentSubscription?.planCode || "trial";
  const subscriptionActive = subscriptionStatus === "active";
  const isTrial = !subscriptionActive || planCode === "trial";
  let publishLimit: number | null = null;
  let publishRemaining: number | null = null;
  if (isTrial) {
    const publishedCount = await countPublishedListingsForUser(tenantId, user.uid);
    publishLimit = TRIAL_PUBLISH_LIMIT;
    publishRemaining = Math.max(0, publishLimit - publishedCount);
  }
  const canPublish = isActive && (!isTrial || (typeof publishRemaining === "number" && publishRemaining > 0));
  if (!agentDoc) {
    return res.json({
      ok: true,
      data: {
        isAgent: false,
        status: "none",
        agent: null,
        tenantId,
        planCode,
        subscriptionStatus,
        isTrial,
        canPublish: false,
        publishLimit,
        publishRemaining
      }
    });
  }
  if (!isActive) {
    const responseStatus = mapAgentStatus(status);
    return res.json({
      ok: true,
      data: {
        isAgent: false,
        status: responseStatus,
        agent: null,
        tenantId,
        planCode,
        subscriptionStatus,
        isTrial,
        canPublish: false,
        publishLimit,
        publishRemaining
      }
    });
  }
  return res.json({
    ok: true,
    data: {
      isAgent: true,
      status: "approved",
      planCode,
      subscriptionStatus,
      isTrial,
      canPublish,
      publishLimit,
      publishRemaining,
      agent: {
        uid: user.uid,
        tenantId,
        status,
        phone: user.phoneNumber || null,
        plan: agentDoc?.plan || null,
        fullName: agentDoc?.fullName || null,
        businessName: agentDoc?.businessName || null,
        city: agentDoc?.city || null,
        reraId: agentDoc?.reraId || null
      }
    }
  });
}

export async function listAgentListingsHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  const tenantId = user.tenantId;
  const agentDoc = await fetchAgentProfile(tenantId, user.uid);
  const status = mapAgentStatus(agentDoc?.status);
  if (!agentDoc) {
    return res.status(403).json({ ok: false, error: { message: "Agent access not found", code: "NOT_AGENT" } });
  }
  if (status !== "approved") {
    return res.status(403).json({
      ok: false,
      error: { message: "Agent access pending approval", code: "AGENT_PENDING_APPROVAL" }
    });
  }
  const mine = String(req.query?.mine || "1") === "1";
  const data = await listProperties(tenantId, user, { mine });
  return res.json({ ok: true, data });
}

export async function startAgentSubscriptionHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  if (env.billingProvider !== "razorpay") {
    return res.status(400).json({
      ok: false,
      error: { message: "Billing provider disabled for this environment", code: "BILLING_DISABLED" }
    });
  }
  const missing = getRazorpayMissingVars();
  if (missing.length > 0) {
    return res.status(400).json({
      ok: false,
      error: { message: `Razorpay config missing: ${missing.join(", ")}`, code: "BILLING_NOT_CONFIGURED" }
    });
  }
  const parsed = AgentSubscriptionStartSchema.parse(req.body || {});
  const tenantId = user.tenantId;
  try {
    const result = await createRazorpayAgentSubscription({
      tenantId,
      uid: user.uid,
      planCode: parsed.planCode
    });
    return res.json({
      ok: true,
      data: {
        subscriptionId: result.subscriptionId,
        keyId: env.razorpayKeyId,
        planCode: parsed.planCode
      }
    });
  } catch (err: any) {
    const message = err?.message || "Razorpay config error";
    if (message.includes("Razorpay config missing")) {
      return res.status(400).json({ ok: false, error: { message, code: "BILLING_NOT_CONFIGURED" } });
    }
    return res.status(500).json({ ok: false, error: { message, code: "CONFIG" } });
  }
}

export async function verifyAgentSubscriptionHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  if (env.billingProvider !== "razorpay") {
    return res.status(400).json({
      ok: false,
      error: { message: "Billing provider disabled for this environment", code: "BILLING_DISABLED" }
    });
  }
  const missing = getRazorpayMissingVars();
  if (missing.length > 0) {
    return res.status(400).json({
      ok: false,
      error: { message: `Razorpay config missing: ${missing.join(", ")}`, code: "BILLING_NOT_CONFIGURED" }
    });
  }
  const parsed = AgentSubscriptionVerifySchema.parse(req.body || {});
  const valid = verifyRazorpaySubscriptionSignature(
    parsed.razorpay_payment_id,
    parsed.razorpay_subscription_id,
    parsed.razorpay_signature
  );
  if (!valid) {
    return res.status(400).json({ ok: false, error: { message: "Invalid signature", code: "BAD_SIGNATURE" } });
  }
  const subscriptionData = await fetchRazorpaySubscription(parsed.razorpay_subscription_id);
  const existing = await fetchAgentSubscription(user.tenantId, user.uid);
  const planCode =
    existing?.planCode ||
    subscriptionData?.notes?.planCode ||
    (await resolveSubscriptionIndex(parsed.razorpay_subscription_id))?.planCode ||
    "independent";
  const status = await activateAgentSubscription({
    tenantId: user.tenantId,
    uid: user.uid,
    planCode,
    subscriptionId: parsed.razorpay_subscription_id,
    paymentId: parsed.razorpay_payment_id,
    subscriptionData
  });
  return res.json({ ok: true, data: { status, isActive: status === "active" } });
}
