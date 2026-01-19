"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBillingError = buildBillingError;
exports.shouldEnforce = shouldEnforce;
exports.requireOnboardingIfPremier = requireOnboardingIfPremier;
exports.requireActiveSubscription = requireActiveSubscription;
exports.requireCapability = requireCapability;
exports.requireListingQuota = requireListingQuota;
exports.requireFeaturedQuota = requireFeaturedQuota;
exports.incrementListingUsageIfEnforced = incrementListingUsageIfEnforced;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const billing_1 = require("../modules/billing");
function buildBillingError(message, code, status) {
    const err = new Error(message);
    err.code = code;
    err.status = status;
    return err;
}
async function getTenantType(tenantId) {
    const snap = await firebase_1.firestore.collection("tenants").doc(tenantId).get();
    const data = snap.data();
    return data?.type;
}
function shouldEnforce(user, tenantType) {
    if (user.role === "owner")
        return false;
    if ((0, billing_1.isPlatformAdmin)(user))
        return false;
    if (!tenantType)
        return false;
    return tenantType === "agency" || tenantType === "enterprise" || tenantType === "builder";
}
function isActiveStatus(status) {
    return status === "active" || status === "trialing";
}
function isExpired(validTill) {
    return validTill.toDate().getTime() < Date.now();
}
async function logGateBlocked(tenantId, user, reason, capability) {
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "BILLING_GATE_BLOCKED",
        entityType: "subscription",
        entityId: tenantId,
        metadata: { reason, capability },
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
}
async function requireOnboardingIfPremier(tenantId, user) {
    if ((0, billing_1.isPlatformAdmin)(user) || user.role === "owner")
        return;
    const tenantSnap = await firebase_1.firestore.collection("tenants").doc(tenantId).get();
    const tenant = tenantSnap.data();
    if (!tenant || tenant.type !== "enterprise" || tenant.enterpriseTier !== "premier")
        return;
    const ref = firebase_1.firestore.collection("enterprise_onboarding").doc(tenantId);
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            tenantId,
            required: true,
            amount: 250000,
            status: "pending",
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
        });
        await logGateBlocked(tenantId, user, "ONBOARDING_PENDING");
        throw buildBillingError("Enterprise onboarding fee required", "ONBOARDING_FEE_REQUIRED", 402);
    }
    const data = snap.data();
    if (data.status !== "paid" && data.status !== "waived") {
        await logGateBlocked(tenantId, user, "ONBOARDING_PENDING");
        throw buildBillingError("Enterprise onboarding fee required", "ONBOARDING_FEE_REQUIRED", 402);
    }
}
async function requireActiveSubscription(tenantId, user) {
    const tenantType = await getTenantType(tenantId);
    if (!shouldEnforce(user, tenantType))
        return null;
    await requireOnboardingIfPremier(tenantId, user);
    const subscription = await (0, billing_1.getOrCreateSubscription)(tenantId, user);
    if (!isActiveStatus(subscription.status) || isExpired(subscription.validTill)) {
        await logGateBlocked(tenantId, user, "SUBSCRIPTION_INACTIVE");
        throw buildBillingError("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
    }
    return subscription;
}
async function requireCapability(tenantId, user, capability) {
    const subscription = await requireActiveSubscription(tenantId, user);
    if (!subscription)
        return null;
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
async function requireListingQuota(tenantId, user, increment = 1) {
    const subscription = await requireActiveSubscription(tenantId, user);
    if (!subscription)
        return null;
    if (subscription.limits.listingLimit === null)
        return subscription;
    const current = await (0, billing_1.getListingCount)(tenantId);
    if (current + increment > subscription.limits.listingLimit) {
        await logGateBlocked(tenantId, user, "LISTING_LIMIT_REACHED");
        throw buildBillingError("Listing limit reached", "LIMIT_REACHED", 409);
    }
    return subscription;
}
async function requireFeaturedQuota(tenantId, user, increment = 1) {
    const subscription = await requireActiveSubscription(tenantId, user);
    if (!subscription)
        return null;
    if (!subscription.limits.featuredAllowed) {
        await logGateBlocked(tenantId, user, "FEATURE_NOT_ALLOWED");
        throw buildBillingError("Featured listings not allowed for current plan", "FEATURE_NOT_ALLOWED", 403);
    }
    if (subscription.limits.featuredLimit === null)
        return subscription;
    const current = await (0, billing_1.getFeaturedCount)(tenantId);
    if (current + increment > subscription.limits.featuredLimit) {
        await logGateBlocked(tenantId, user, "FEATURE_LIMIT_REACHED");
        throw buildBillingError("Featured listing limit reached", "LIMIT_REACHED", 409);
    }
    return subscription;
}
async function incrementListingUsageIfEnforced(tenantId, user, increment = 1) {
    const tenantType = await getTenantType(tenantId);
    if (!shouldEnforce(user, tenantType))
        return;
    await (0, billing_1.incrementListingCount)(tenantId, increment);
}
