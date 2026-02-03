"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlatformAdmin = isPlatformAdmin;
exports.buildDefaultSubscription = buildDefaultSubscription;
exports.getOrCreateSubscription = getOrCreateSubscription;
exports.getOrCreateSubscriptionInTransaction = getOrCreateSubscriptionInTransaction;
exports.getSubscription = getSubscription;
exports.getSubscriptionSummary = getSubscriptionSummary;
exports.overrideSubscription = overrideSubscription;
exports.cancelSubscription = cancelSubscription;
exports.overrideOnboarding = overrideOnboarding;
exports.getListingCount = getListingCount;
exports.incrementListingCount = incrementListingCount;
exports.getFeaturedCount = getFeaturedCount;
exports.incrementFeaturedCount = incrementFeaturedCount;
exports.decrementFeaturedCount = decrementFeaturedCount;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const plans_1 = require("./plans");
function subscriptionsCollection() {
    return firebase_1.firestore.collection("subscriptions");
}
function tenantRef(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId);
}
function listingCounterRef(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("counters").doc("listings");
}
function featuredCounterRef(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("counters").doc("featuredListings");
}
function isPlatformAdmin(user) {
    if (user.role === "platform_admin")
        return true;
    return env_1.env.platformAdminUids.includes(user.uid);
}
async function getTenantType(tenantId, tx) {
    const ref = tenantRef(tenantId);
    const snap = tx ? await tx.get(ref) : await ref.get();
    if (!snap.exists)
        throw new Error("TENANT_NOT_FOUND");
    const data = snap.data();
    return data?.type;
}
function buildDefaultSubscription(tenantId, planId) {
    const plan = (0, plans_1.getPlan)(planId);
    const now = new Date();
    const trialDays = env_1.env.trialDays;
    const expiresInDays = plan.expiresInDays ?? (planId === "trial" ? trialDays : 365);
    const validTill = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    const status = planId === "trial" ? "trialing" : "active";
    return {
        tenantId,
        planId,
        status,
        validFrom: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
        validTill: firebase_admin_1.default.firestore.Timestamp.fromDate(validTill),
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
            provider: env_1.env.billingProvider
        }
    };
}
async function getOrCreateSubscription(tenantId, user) {
    const ref = subscriptionsCollection().doc(tenantId);
    const result = await firebase_1.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
            return snap.data();
        }
        const tenantType = await getTenantType(tenantId, tx);
        const planId = (0, plans_1.defaultPlanForTenantType)(tenantType);
        const doc = buildDefaultSubscription(tenantId, planId);
        tx.set(ref, {
            ...doc,
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            updatedByUid: user?.uid
        });
        return doc;
    });
    return result;
}
async function getOrCreateSubscriptionInTransaction(tx, tenantId, user) {
    const ref = subscriptionsCollection().doc(tenantId);
    const snap = await tx.get(ref);
    if (snap.exists) {
        return snap.data();
    }
    const tenantType = await getTenantType(tenantId, tx);
    const planId = (0, plans_1.defaultPlanForTenantType)(tenantType);
    const doc = buildDefaultSubscription(tenantId, planId);
    tx.set(ref, {
        ...doc,
        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        updatedByUid: user?.uid
    });
    return doc;
}
async function getSubscription(tenantId) {
    const snap = await subscriptionsCollection().doc(tenantId).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
async function getSubscriptionSummary(tenantId, user) {
    const subscription = await getOrCreateSubscription(tenantId, user);
    const tenantSnap = await tenantRef(tenantId).get();
    if (!tenantSnap.exists)
        throw new Error("TENANT_NOT_FOUND");
    const tenant = tenantSnap.data();
    let onboarding;
    if (tenant?.type === "enterprise" && tenant?.enterpriseTier === "premier") {
        const onboardingSnap = await firebase_1.firestore.collection("enterprise_onboarding").doc(tenantId).get();
        if (!onboardingSnap.exists) {
            onboarding = {
                required: true,
                amount: 250000,
                status: "pending"
            };
        }
        else {
            const data = onboardingSnap.data();
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
async function overrideSubscription(user, input) {
    if (!isPlatformAdmin(user))
        throw new Error("Forbidden");
    const plan = (0, plans_1.getPlan)(input.planId);
    const now = new Date();
    const validTill = input.validTill ? new Date(input.validTill) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const update = {
        planId: input.planId,
        status: input.status,
        validFrom: firebase_admin_1.default.firestore.Timestamp.fromDate(now),
        validTill: firebase_admin_1.default.firestore.Timestamp.fromDate(validTill),
        limits: {
            listingLimit: plan.listingLimit,
            agentSeats: plan.agentSeats,
            featuredAllowed: plan.featuredAllowed,
            featuredLimit: plan.featuredLimit,
            publishAllowed: plan.publishAllowed
        },
        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        updatedByUid: user.uid
    };
    await subscriptionsCollection().doc(input.tenantId).set(update, { merge: true });
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId: input.tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "BILLING_OVERRIDE",
        entityType: "subscription",
        entityId: input.tenantId,
        metadata: { planId: input.planId, status: input.status },
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}
async function cancelSubscription(user, tenantId) {
    if (user.role !== "tenant_admin" && !isPlatformAdmin(user)) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await subscriptionsCollection().doc(tenantId).set({
        status: "canceled",
        cancelAt: now,
        updatedAt: now,
        updatedByUid: user.uid
    }, { merge: true });
    await firebase_1.firestore.collection("audit_logs").doc().set({
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
async function overrideOnboarding(user, input) {
    if (!isPlatformAdmin(user))
        throw new Error("Forbidden");
    const ref = firebase_1.firestore.collection("enterprise_onboarding").doc(input.tenantId);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set({
        tenantId: input.tenantId,
        required: true,
        amount: input.amount ?? 250000,
        status: input.status,
        updatedAt: now,
        updatedByUid: user.uid
    }, { merge: true });
    await firebase_1.firestore.collection("audit_logs").doc().set({
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
async function getListingCount(tenantId) {
    const snap = await listingCounterRef(tenantId).get();
    const data = snap.data();
    return typeof data?.count === "number" ? data.count : 0;
}
async function incrementListingCount(tenantId, by = 1) {
    await listingCounterRef(tenantId).set({ count: firebase_admin_1.default.firestore.FieldValue.increment(by) }, { merge: true });
}
async function getFeaturedCount(tenantId) {
    const snap = await featuredCounterRef(tenantId).get();
    const data = snap.data();
    return typeof data?.count === "number" ? data.count : 0;
}
async function incrementFeaturedCount(tenantId, by = 1) {
    await featuredCounterRef(tenantId).set({ count: firebase_admin_1.default.firestore.FieldValue.increment(by), updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
async function decrementFeaturedCount(tenantId, by = 1) {
    await featuredCounterRef(tenantId).set({ count: firebase_admin_1.default.firestore.FieldValue.increment(-by), updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }, { merge: true });
}
