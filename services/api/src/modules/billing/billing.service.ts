import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { AuthUser } from "../../types";
import { defaultPlanForTenantType, getPlan, PlanId } from "./plans";

type SubscriptionDoc = {
  tenantId: string;
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled" | "expired";
  validFrom: FirebaseFirestore.Timestamp;
  validTill: FirebaseFirestore.Timestamp;
  cancelAt?: FirebaseFirestore.Timestamp;
  usage: {
    listingsCreated: number;
    featuredListings: number;
    agentSeatsUsed: number;
  };
  limits: {
    listingLimit: number | null;
    agentSeats: number;
    featuredAllowed: boolean;
    featuredLimit: number | null;
    publishAllowed: boolean;
  };
  billing: {
    provider?: "manual" | "razorpay" | "stripe";
    customerId?: string;
    subscriptionId?: string;
    lastPaymentAt?: FirebaseFirestore.Timestamp;
  };
  updatedAt: FirebaseFirestore.FieldValue;
  updatedByUid?: string;
};

function subscriptionsCollection() {
  return firestore.collection("subscriptions");
}

function tenantRef(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId);
}

function listingCounterRef(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("counters").doc("listings");
}

function featuredCounterRef(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("counters").doc("featuredListings");
}

export function isPlatformAdmin(user: AuthUser) {
  if (user.role === "platform_admin") return true;
  return env.platformAdminUids.includes(user.uid);
}

async function getTenantType(tenantId: string, tx?: FirebaseFirestore.Transaction) {
  const ref = tenantRef(tenantId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) throw new Error("TENANT_NOT_FOUND");
  const data = snap.data() as any;
  return data?.type as string | undefined;
}

export function buildDefaultSubscription(tenantId: string, planId: PlanId) {
  const plan = getPlan(planId);
  const now = new Date();
  const trialDays = env.trialDays;
  const expiresInDays = plan.expiresInDays ?? (planId === "trial" ? trialDays : 365);
  const validTill = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const status = planId === "trial" ? "trialing" : "active";
  return {
    tenantId,
    planId,
    status,
    validFrom: admin.firestore.Timestamp.fromDate(now),
    validTill: admin.firestore.Timestamp.fromDate(validTill),
    usage: {
      listingsCreated: 0,
      featuredListings: 0,
      agentSeatsUsed: 0
    },
    limits: {
      listingLimit: plan.listingLimit,
      agentSeats: plan.agentSeats,
      featuredAllowed: plan.featuredAllowed,
      featuredLimit: plan.featuredLimit,
      publishAllowed: plan.publishAllowed
    },
    billing: {
      provider: env.billingProvider
    }
  };
}

export async function getOrCreateSubscription(tenantId: string, user?: AuthUser) {
  const ref = subscriptionsCollection().doc(tenantId);
  const result = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      return snap.data() as SubscriptionDoc;
    }
    const tenantType = await getTenantType(tenantId, tx);
    const planId = defaultPlanForTenantType(tenantType);
    const doc = buildDefaultSubscription(tenantId, planId);
    tx.set(ref, {
      ...doc,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedByUid: user?.uid
    });
    return doc as SubscriptionDoc;
  });
  return result;
}

export async function getOrCreateSubscriptionInTransaction(
  tx: FirebaseFirestore.Transaction,
  tenantId: string,
  user?: AuthUser
) {
  const ref = subscriptionsCollection().doc(tenantId);
  const snap = await tx.get(ref);
  if (snap.exists) {
    return snap.data() as SubscriptionDoc;
  }
  const tenantType = await getTenantType(tenantId, tx);
  const planId = defaultPlanForTenantType(tenantType);
  const doc = buildDefaultSubscription(tenantId, planId);
  tx.set(ref, {
    ...doc,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUid: user?.uid
  });
  return doc as SubscriptionDoc;
}

export async function getSubscription(tenantId: string) {
  const snap = await subscriptionsCollection().doc(tenantId).get();
  if (!snap.exists) return null;
  return snap.data() as SubscriptionDoc;
}

export async function getSubscriptionSummary(tenantId: string, user?: AuthUser) {
  const subscription = await getOrCreateSubscription(tenantId, user);
  const tenantSnap = await tenantRef(tenantId).get();
  if (!tenantSnap.exists) throw new Error("TENANT_NOT_FOUND");
  const tenant = tenantSnap.data() as any;

  let onboarding: any | undefined;
  if (tenant?.type === "enterprise" && tenant?.enterpriseTier === "premier") {
    const onboardingSnap = await firestore.collection("enterprise_onboarding").doc(tenantId).get();
    if (!onboardingSnap.exists) {
      onboarding = {
        required: true,
        amount: 250000,
        status: "pending"
      };
    } else {
      const data = onboardingSnap.data() as any;
      onboarding = {
        required: data.required ?? true,
        amount: data.amount ?? 250000,
        status: data.status ?? "pending",
        paidAt: data.paidAt ?? null
      };
    }
  }

  return {
    subscription,
    tenant: {
      tenantId: tenant?.tenantId ?? tenantId,
      type: tenant?.type ?? null,
      enterpriseTier: tenant?.enterpriseTier ?? null
    },
    onboarding
  };
}

export async function overrideSubscription(user: AuthUser, input: { tenantId: string; planId: PlanId; status: SubscriptionDoc["status"]; validTill?: string }) {
  if (!isPlatformAdmin(user)) throw new Error("Forbidden");
  const plan = getPlan(input.planId);
  const now = new Date();
  const validTill = input.validTill ? new Date(input.validTill) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const update = {
    planId: input.planId,
    status: input.status,
    validFrom: admin.firestore.Timestamp.fromDate(now),
    validTill: admin.firestore.Timestamp.fromDate(validTill),
    limits: {
      listingLimit: plan.listingLimit,
      agentSeats: plan.agentSeats,
      featuredAllowed: plan.featuredAllowed,
      featuredLimit: plan.featuredLimit,
      publishAllowed: plan.publishAllowed
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedByUid: user.uid
  };
  await subscriptionsCollection().doc(input.tenantId).set(update, { merge: true });
  await firestore.collection("audit_logs").doc().set({
    tenantId: input.tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "BILLING_OVERRIDE",
    entityType: "subscription",
    entityId: input.tenantId,
    metadata: { planId: input.planId, status: input.status },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true };
}

export async function cancelSubscription(user: AuthUser, tenantId: string) {
  if (user.role !== "tenant_admin" && !isPlatformAdmin(user)) {
    throw new Error("Forbidden");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await subscriptionsCollection().doc(tenantId).set(
    {
      status: "canceled",
      cancelAt: now,
      updatedAt: now,
      updatedByUid: user.uid
    },
    { merge: true }
  );
  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "BILLING_CANCEL",
    entityType: "subscription",
    entityId: tenantId,
    metadata: {},
    createdAt: now
  });
  return { ok: true };
}

export async function overrideOnboarding(user: AuthUser, input: { tenantId: string; status: "paid" | "waived" | "pending"; amount?: number }) {
  if (!isPlatformAdmin(user)) throw new Error("Forbidden");
  const ref = firestore.collection("enterprise_onboarding").doc(input.tenantId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    {
      tenantId: input.tenantId,
      required: true,
      amount: input.amount ?? 250000,
      status: input.status,
      updatedAt: now,
      updatedByUid: user.uid
    },
    { merge: true }
  );
  await firestore.collection("audit_logs").doc().set({
    tenantId: input.tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "ONBOARDING_OVERRIDE",
    entityType: "enterprise_onboarding",
    entityId: input.tenantId,
    metadata: { status: input.status, amount: input.amount ?? 250000 },
    createdAt: now
  });
  return { ok: true };
}

export async function getListingCount(tenantId: string) {
  const snap = await listingCounterRef(tenantId).get();
  const data = snap.data() as any;
  return typeof data?.count === "number" ? data.count : 0;
}

export async function incrementListingCount(tenantId: string, by = 1) {
  await listingCounterRef(tenantId).set(
    { count: admin.firestore.FieldValue.increment(by) },
    { merge: true }
  );
}

export async function getFeaturedCount(tenantId: string) {
  const snap = await featuredCounterRef(tenantId).get();
  const data = snap.data() as any;
  return typeof data?.count === "number" ? data.count : 0;
}

export async function incrementFeaturedCount(tenantId: string, by = 1) {
  await featuredCounterRef(tenantId).set(
    { count: admin.firestore.FieldValue.increment(by), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function decrementFeaturedCount(tenantId: string, by = 1) {
  await featuredCounterRef(tenantId).set(
    { count: admin.firestore.FieldValue.increment(-by), updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}
