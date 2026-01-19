import admin from "firebase-admin";
import { firestore } from "../config/firebase";
import { AuthUser } from "../types";
import {
  getOrCreateSubscription,
  getListingCount,
  getFeaturedCount,
  incrementListingCount,
  isPlatformAdmin
} from "../modules/billing";

type Capability = "PUBLISH" | "FEATURED";

type BillingError = Error & { code?: string; status?: number };

export function buildBillingError(message: string, code: string, status: number): BillingError {
  const err = new Error(message) as BillingError;
  err.code = code;
  err.status = status;
  return err;
}

async function getTenantType(tenantId: string) {
  const snap = await firestore.collection("tenants").doc(tenantId).get();
  const data = snap.data() as any;
  return data?.type as string | undefined;
}

export function shouldEnforce(user: AuthUser, tenantType?: string) {
  if (user.role === "owner") return false;
  if (isPlatformAdmin(user)) return false;
  if (!tenantType) return false;
  return tenantType === "agency" || tenantType === "enterprise" || tenantType === "builder";
}

function isActiveStatus(status: string) {
  return status === "active" || status === "trialing";
}

function isExpired(validTill: FirebaseFirestore.Timestamp) {
  return validTill.toDate().getTime() < Date.now();
}

async function logGateBlocked(tenantId: string, user: AuthUser, reason: string, capability?: string) {
  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "BILLING_GATE_BLOCKED",
    entityType: "subscription",
    entityId: tenantId,
    metadata: { reason, capability },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

export async function requireOnboardingIfPremier(tenantId: string, user: AuthUser) {
  if (isPlatformAdmin(user) || user.role === "owner") return;
  const tenantSnap = await firestore.collection("tenants").doc(tenantId).get();
  const tenant = tenantSnap.data() as any;
  if (!tenant || tenant.type !== "enterprise" || tenant.enterpriseTier !== "premier") return;

  const ref = firestore.collection("enterprise_onboarding").doc(tenantId);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      tenantId,
      required: true,
      amount: 250000,
      status: "pending",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await logGateBlocked(tenantId, user, "ONBOARDING_PENDING");
    throw buildBillingError("Enterprise onboarding fee required", "ONBOARDING_FEE_REQUIRED", 402);
  }
  const data = snap.data() as any;
  if (data.status !== "paid" && data.status !== "waived") {
    await logGateBlocked(tenantId, user, "ONBOARDING_PENDING");
    throw buildBillingError("Enterprise onboarding fee required", "ONBOARDING_FEE_REQUIRED", 402);
  }
}

export async function requireActiveSubscription(tenantId: string, user: AuthUser) {
  const tenantType = await getTenantType(tenantId);
  if (!shouldEnforce(user, tenantType)) return null;
  await requireOnboardingIfPremier(tenantId, user);
  const subscription = await getOrCreateSubscription(tenantId, user);
  if (!isActiveStatus(subscription.status) || isExpired(subscription.validTill)) {
    await logGateBlocked(tenantId, user, "SUBSCRIPTION_INACTIVE");
    throw buildBillingError("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
  }
  return subscription;
}

export async function requireCapability(tenantId: string, user: AuthUser, capability: Capability) {
  const subscription = await requireActiveSubscription(tenantId, user);
  if (!subscription) return null;
  if (capability === "PUBLISH" && !subscription.limits.publishAllowed) {
    await logGateBlocked(tenantId, user, "PUBLISH_NOT_ALLOWED", capability);
    throw buildBillingError("Publish not allowed for current plan", "FORBIDDEN", 403);
  }
  if (capability === "FEATURED" && !subscription.limits.featuredAllowed) {
    await logGateBlocked(tenantId, user, "FEATURE_NOT_ALLOWED", capability);
    throw buildBillingError("Featured listings not allowed for current plan", "FEATURE_NOT_ALLOWED", 403);
  }
  return subscription;
}

export async function requireListingQuota(tenantId: string, user: AuthUser, increment = 1) {
  const subscription = await requireActiveSubscription(tenantId, user);
  if (!subscription) return null;
  if (subscription.limits.listingLimit === null) return subscription;
  const current = await getListingCount(tenantId);
  if (current + increment > subscription.limits.listingLimit) {
    await logGateBlocked(tenantId, user, "LISTING_LIMIT_REACHED");
    throw buildBillingError("Listing limit reached", "LIMIT_REACHED", 409);
  }
  return subscription;
}

export async function requireFeaturedQuota(tenantId: string, user: AuthUser, increment = 1) {
  const subscription = await requireActiveSubscription(tenantId, user);
  if (!subscription) return null;
  if (!subscription.limits.featuredAllowed) {
    await logGateBlocked(tenantId, user, "FEATURE_NOT_ALLOWED");
    throw buildBillingError("Featured listings not allowed for current plan", "FEATURE_NOT_ALLOWED", 403);
  }
  if (subscription.limits.featuredLimit === null) return subscription;
  const current = await getFeaturedCount(tenantId);
  if (current + increment > subscription.limits.featuredLimit) {
    await logGateBlocked(tenantId, user, "FEATURE_LIMIT_REACHED");
    throw buildBillingError("Featured listing limit reached", "LIMIT_REACHED", 409);
  }
  return subscription;
}

export async function incrementListingUsageIfEnforced(tenantId: string, user: AuthUser, increment = 1) {
  const tenantType = await getTenantType(tenantId);
  if (!shouldEnforce(user, tenantType)) return;
  await incrementListingCount(tenantId, increment);
}
