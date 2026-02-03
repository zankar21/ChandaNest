import admin from "firebase-admin";
import crypto from "crypto";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";
import { logger } from "../../utils/logger";

export type AgentPlanCode = "trial" | "independent" | "professional" | "enterprise";
export type AgentSubscriptionStatus = "pending" | "active" | "past_due" | "halted" | "cancelled";

type AgentSubscriptionDoc = {
  planCode: AgentPlanCode;
  status: AgentSubscriptionStatus;
  provider: "razorpay";
  razorpay: {
    subscriptionId: string;
    planId: string;
    paymentId?: string | null;
  };
  startedAt?: FirebaseFirestore.Timestamp | null;
  currentPeriodEnd?: FirebaseFirestore.Timestamp | null;
  lastEventType?: string | null;
  lastEventAt?: FirebaseFirestore.Timestamp | null;
  createdAt?: FirebaseFirestore.FieldValue;
  updatedAt?: FirebaseFirestore.FieldValue;
};

function agentSubscriptionRef(tenantId: string, uid: string) {
  return firestore.collection("tenants").doc(tenantId).collection("agents").doc(uid).collection("subscription").doc("current");
}

function razorpaySubscriptionIndexRef(subscriptionId: string) {
  return firestore.collection("razorpay_subscriptions").doc(subscriptionId);
}

function requireRazorpayConfig(planCode: "independent" | "professional") {
  const missing: string[] = [];
  if (env.billingProvider !== "razorpay") {
    logger.warn("Razorpay billing provider not enabled", {
      billingProvider: env.billingProvider,
      nodeEnv: env.nodeEnv
    });
  }
  if (!env.razorpayKeyId) missing.push("RAZORPAY_KEY_ID");
  if (!env.razorpayKeySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    if (missing.length > 0) {
      logger.warn("Razorpay config missing env vars", { missing, nodeEnv: env.nodeEnv });
    }
    throw new Error(`Razorpay config missing: ${missing.join(", ")}`);
  }
  const planId =
    planCode === "independent" ? env.razorpayPlanAgentMonthly : env.razorpayPlanProfessionalMonthly;
  if (!planId) {
    const planMissing =
      planCode === "independent" ? ["RAZORPAY_PLAN_AGENT_MONTHLY"] : ["RAZORPAY_PLAN_PROFESSIONAL_MONTHLY"];
    logger.warn("Razorpay plan ID missing", { missing: planMissing, nodeEnv: env.nodeEnv });
    throw new Error(`Razorpay config missing: ${planMissing.join(", ")}`);
  }
  return planId;
}

function buildRazorpayAuthHeader() {
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  return `Basic ${auth}`;
}

async function razorpayRequest<T>(path: string, options: RequestInit) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: buildRazorpayAuthHeader(),
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error?.description || json?.error?.message || "Razorpay request failed";
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = json?.error?.code;
    err.status = res.status;
    throw err;
  }
  return json as T;
}

function mapRazorpayStatus(status?: string): AgentSubscriptionStatus {
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  if (normalized === "active" || normalized === "authenticated") return "active";
  if (normalized === "halted") return "halted";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "pending" || normalized === "created") return "pending";
  if (normalized === "completed") return "cancelled";
  return "pending";
}

export async function fetchAgentSubscription(tenantId: string, uid: string) {
  const snap = await agentSubscriptionRef(tenantId, uid).get();
  if (!snap.exists) return null;
  return snap.data() as AgentSubscriptionDoc;
}

export async function upsertAgentSubscription(tenantId: string, uid: string, data: Partial<AgentSubscriptionDoc>) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload = {
    ...data,
    updatedAt: now,
    ...(data.createdAt ? {} : {})
  } as AgentSubscriptionDoc;
  await agentSubscriptionRef(tenantId, uid).set(payload, { merge: true });
  return payload;
}

export async function upsertRazorpaySubscriptionIndex(
  subscriptionId: string,
  data: { tenantId: string; uid: string; planCode?: AgentPlanCode; status?: AgentSubscriptionStatus }
) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await razorpaySubscriptionIndexRef(subscriptionId).set(
    {
      subscriptionId,
      tenantId: data.tenantId,
      uid: data.uid,
      planCode: data.planCode || null,
      status: data.status || null,
      provider: "razorpay",
      updatedAt: now,
      createdAt: now
    },
    { merge: true }
  );
}

export async function resolveSubscriptionIndex(subscriptionId: string) {
  const snap = await razorpaySubscriptionIndexRef(subscriptionId).get();
  if (!snap.exists) return null;
  return snap.data() as { tenantId?: string; uid?: string; planCode?: AgentPlanCode };
}

export async function createRazorpayAgentSubscription(input: {
  tenantId: string;
  uid: string;
  planCode: "independent" | "professional";
}) {
  const planId = requireRazorpayConfig(input.planCode);
  const subscription = await razorpayRequest<{ id: string; plan_id: string }>(`/subscriptions`, {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      customer_notify: 1,
      notes: {
        tenantId: input.tenantId,
        uid: input.uid,
        planCode: input.planCode
      }
    })
  });

  const now = admin.firestore.FieldValue.serverTimestamp();
  await upsertAgentSubscription(input.tenantId, input.uid, {
    planCode: input.planCode,
    status: "pending",
    provider: "razorpay",
    razorpay: {
      subscriptionId: subscription.id,
      planId: subscription.plan_id
    },
    createdAt: now
  });
  await upsertRazorpaySubscriptionIndex(subscription.id, {
    tenantId: input.tenantId,
    uid: input.uid,
    planCode: input.planCode,
    status: "pending"
  });

  return { subscriptionId: subscription.id, planId: subscription.plan_id };
}

export function verifyRazorpaySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
) {
  const expected = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export async function fetchRazorpaySubscription(subscriptionId: string) {
  return razorpayRequest<any>(`/subscriptions/${subscriptionId}`, { method: "GET" });
}

export async function activateAgentSubscription(input: {
  tenantId: string;
  uid: string;
  planCode: AgentPlanCode;
  subscriptionId: string;
  paymentId?: string | null;
  subscriptionData?: any;
}) {
  const status = mapRazorpayStatus(input.subscriptionData?.status);
  const currentEnd = input.subscriptionData?.current_end;
  const currentPeriodEnd =
    typeof currentEnd === "number"
      ? admin.firestore.Timestamp.fromMillis(currentEnd * 1000)
      : null;
  const now = admin.firestore.FieldValue.serverTimestamp();
  await upsertAgentSubscription(input.tenantId, input.uid, {
    planCode: input.planCode,
    status,
    provider: "razorpay",
    razorpay: {
      subscriptionId: input.subscriptionId,
      planId: input.subscriptionData?.plan_id || "",
      paymentId: input.paymentId || null
    },
    startedAt: status === "active" ? admin.firestore.Timestamp.now() : null,
    currentPeriodEnd,
    lastEventType: "verify",
    lastEventAt: now
  });
  await upsertRazorpaySubscriptionIndex(input.subscriptionId, {
    tenantId: input.tenantId,
    uid: input.uid,
    planCode: input.planCode,
    status
  });
  return status;
}

export async function updateAgentSubscriptionFromWebhook(input: {
  subscriptionId: string;
  tenantId: string;
  uid: string;
  planCode?: AgentPlanCode;
  status?: string;
  paymentId?: string | null;
  currentPeriodEnd?: number | null;
  eventType: string;
}) {
  const mappedStatus = mapRazorpayStatus(input.status);
  const currentPeriodEnd =
    typeof input.currentPeriodEnd === "number"
      ? admin.firestore.Timestamp.fromMillis(input.currentPeriodEnd * 1000)
      : null;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload: Partial<AgentSubscriptionDoc> = {
    status: mappedStatus,
    provider: "razorpay",
    razorpay: {
      subscriptionId: input.subscriptionId,
      planId: "",
      paymentId: input.paymentId || null
    },
    currentPeriodEnd,
    lastEventType: input.eventType,
    lastEventAt: now
  };
  if (input.planCode) {
    payload.planCode = input.planCode;
  }
  await upsertAgentSubscription(input.tenantId, input.uid, {
    ...payload
  });
  await upsertRazorpaySubscriptionIndex(input.subscriptionId, {
    tenantId: input.tenantId,
    uid: input.uid,
    planCode: input.planCode,
    status: mappedStatus
  });
  logger.info("Razorpay subscription updated", {
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
    uid: input.uid,
    status: mappedStatus,
    eventType: input.eventType
  });
}
