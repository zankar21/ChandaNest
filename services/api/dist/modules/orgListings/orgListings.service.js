"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionValidator = void 0;
exports.createOrgListing = createOrgListing;
exports.listOrgListings = listOrgListings;
exports.getOrgListing = getOrgListing;
exports.updateOrgListing = updateOrgListing;
exports.transitionOrgListing = transitionOrgListing;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const mandates_service_1 = require("../mandates/mandates.service");
const memberships_service_1 = require("../memberships/memberships.service");
const requirePlan_1 = require("../../middleware/requirePlan");
const billing_1 = require("../billing");
const orgListings_permissions_1 = require("./orgListings.permissions");
const orgListings_schemas_1 = require("./orgListings.schemas");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function orgListingsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("orgListings");
}
function isTenantAdmin(user) {
    return user.role === "tenant_admin" || user.role === "platform_admin";
}
async function assertCanAccessPrincipal(input) {
    const { tenantId, user, principalType, principalId, permission } = input;
    if (principalType === "agent") {
        if (principalId !== user.uid) {
            throw new Error("Forbidden");
        }
        return;
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId,
        userId: user.uid,
        orgType: principalType,
        orgId: principalId
    });
    if (memberships.length === 0) {
        throw new Error("Forbidden");
    }
    const membership = memberships[0];
    if (!(0, orgListings_permissions_1.hasOrgListingPermission)(membership.role, permission)) {
        throw new Error("Forbidden");
    }
}
async function logEvent(input) {
    const ref = orgListingsCollection(input.tenantId)
        .doc(input.orgListingId)
        .collection("events")
        .doc();
    await ref.set(stripUndefined({
        action: input.action,
        note: input.note,
        by: input.by,
        fromState: input.fromState,
        toState: input.toState,
        at: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    }));
}
async function createOrgListing(input) {
    const payload = orgListings_schemas_1.OrgListingCreateSchema.parse(input.body);
    await assertCanAccessPrincipal({
        tenantId: input.tenantId,
        user: input.user,
        principalType: payload.principalType,
        principalId: payload.principalId,
        permission: "orgListing.create"
    });
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = orgListingsCollection(input.tenantId).doc();
    const doc = {
        tenantId: input.tenantId,
        principalType: payload.principalType,
        principalId: payload.principalId,
        createdBy: input.user.uid,
        createdAt: now,
        updatedAt: now,
        updatedBy: input.user.uid,
        lifecycleState: "draft",
        visibility: "private",
        title: payload.title,
        propertyType: payload.propertyType,
        listingType: payload.listingType,
        location: payload.location,
        pricing: payload.pricing,
        media: payload.media,
        description: payload.description,
        attributes: payload.attributes,
        enterpriseProjectId: payload.enterpriseProjectId,
        inventoryItemId: payload.inventoryItemId,
        ownerUid: payload.ownerUid,
        ownerListingId: payload.ownerListingId,
        mandateId: payload.mandateId
    };
    await (0, requirePlan_1.requireOnboardingIfPremier)(input.tenantId, input.user);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const tenantSnap = await tx.get(firebase_1.firestore.collection("tenants").doc(input.tenantId));
        const tenantType = tenantSnap.data()?.type;
        const enforce = (0, requirePlan_1.shouldEnforce)(input.user, tenantType);
        if (enforce) {
            const subscription = await (0, billing_1.getOrCreateSubscriptionInTransaction)(tx, input.tenantId, input.user);
            const active = subscription.status === "active" || subscription.status === "trialing";
            if (!active || subscription.validTill.toDate().getTime() < Date.now()) {
                throw (0, requirePlan_1.buildBillingError)("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
            }
            const counterRef = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("counters").doc("listings");
            const counterSnap = await tx.get(counterRef);
            const current = counterSnap.data()?.count ?? 0;
            const limit = subscription.limits.listingLimit;
            if (limit !== null && current + 1 > limit) {
                throw (0, requirePlan_1.buildBillingError)("Listing limit reached", "LIMIT_REACHED", 409);
            }
            tx.set(counterRef, { count: current + 1, updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        tx.create(ref, stripUndefined(doc));
    });
    return { id: ref.id };
}
async function listOrgListings(input) {
    const queryParsed = orgListings_schemas_1.OrgListingQuerySchema.parse(input.query);
    if (isTenantAdmin(input.user)) {
        let ref = orgListingsCollection(input.tenantId);
        if (queryParsed.principalType) {
            ref = ref.where("principalType", "==", queryParsed.principalType);
        }
        if (queryParsed.principalId) {
            ref = ref.where("principalId", "==", queryParsed.principalId);
        }
        if (queryParsed.lifecycleState) {
            ref = ref.where("lifecycleState", "==", queryParsed.lifecycleState);
        }
        const snap = await ref.get();
        return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    const results = [];
    const fetches = [];
    const pushListing = (doc) => {
        results.push({ id: doc.id, ...doc.data() });
    };
    if (!queryParsed.principalType || queryParsed.principalType === "agent") {
        let agentRef = orgListingsCollection(input.tenantId)
            .where("principalType", "==", "agent")
            .where("principalId", "==", input.user.uid);
        if (queryParsed.lifecycleState) {
            agentRef = agentRef.where("lifecycleState", "==", queryParsed.lifecycleState);
        }
        fetches.push(agentRef.get().then((snap) => snap.docs.forEach(pushListing)));
    }
    const agencyIds = memberships.filter((m) => m.orgType === "agency").map((m) => m.orgId);
    const enterpriseIds = memberships.filter((m) => m.orgType === "enterprise").map((m) => m.orgId);
    const orgEntries = [
        { type: "agency", ids: agencyIds },
        { type: "enterprise", ids: enterpriseIds }
    ];
    for (const entry of orgEntries) {
        for (const id of entry.ids) {
            let ref = orgListingsCollection(input.tenantId)
                .where("principalType", "==", entry.type)
                .where("principalId", "==", id);
            if (queryParsed.lifecycleState) {
                ref = ref.where("lifecycleState", "==", queryParsed.lifecycleState);
            }
            fetches.push(ref.get().then((snap) => snap.docs.forEach(pushListing)));
        }
    }
    await Promise.all(fetches);
    return { items: results };
}
async function getOrgListing(input) {
    const snap = await orgListingsCollection(input.tenantId).doc(input.id).get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    await assertCanAccessPrincipal({
        tenantId: input.tenantId,
        user: input.user,
        principalType: data.principalType,
        principalId: data.principalId,
        permission: "orgListing.read"
    });
    return { id: snap.id, ...data };
}
async function updateOrgListing(input) {
    const payload = orgListings_schemas_1.OrgListingPatchSchema.parse(input.body);
    const ref = orgListingsCollection(input.tenantId).doc(input.id);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const existing = snap.data();
    if (existing.lifecycleState === "published") {
        throw new Error("Published listings cannot be edited");
    }
    await assertCanAccessPrincipal({
        tenantId: input.tenantId,
        user: input.user,
        principalType: existing.principalType,
        principalId: existing.principalId,
        permission: "orgListing.edit"
    });
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        ...payload,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    return { id: input.id };
}
function assertTransition(from, action) {
    if (action === "submit" && from !== "draft")
        return false;
    if (action === "approve" && from !== "review")
        return false;
    if (action === "publish" && !(from === "approved" || from === "unpublished"))
        return false;
    if (action === "unpublish" && from !== "published")
        return false;
    if (action === "archive" && !["draft", "review", "approved", "unpublished"].includes(from))
        return false;
    return true;
}
function nextState(from, action) {
    if (action === "submit")
        return "review";
    if (action === "approve")
        return "approved";
    if (action === "publish")
        return "published";
    if (action === "unpublish")
        return "unpublished";
    return "archived";
}
const actionPermission = {
    submit: "orgListing.submit",
    approve: "orgListing.approve",
    publish: "orgListing.publish",
    unpublish: "orgListing.unpublish",
    archive: "orgListing.archive"
};
async function transitionOrgListing(input) {
    const payload = orgListings_schemas_1.TransitionRequestSchema.parse(input.body);
    const ref = orgListingsCollection(input.tenantId).doc(input.id);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const existing = snap.data();
    const fromState = existing.lifecycleState;
    if (!assertTransition(fromState, payload.action)) {
        throw new Error(`Invalid transition from ${fromState}`);
    }
    const permission = actionPermission[payload.action];
    await assertCanAccessPrincipal({
        tenantId: input.tenantId,
        user: input.user,
        principalType: existing.principalType,
        principalId: existing.principalId,
        permission
    });
    const toState = nextState(fromState, payload.action);
    const visibility = payload.action === "publish" ? "public" : payload.action === "unpublish" ? "private" : existing.visibility;
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    let mandateId;
    if (payload.action === "publish") {
        await (0, requirePlan_1.requireCapability)(input.tenantId, input.user, "PUBLISH");
        const mandate = await (0, mandates_service_1.validateMandateForPublish)({
            tenantId: input.tenantId,
            principalType: existing.principalType,
            principalId: existing.principalId,
            ownerUid: existing.ownerUid,
            ownerListingId: existing.ownerListingId,
            mandateId: existing.mandateId
        });
        if (mandate && !existing.mandateId) {
            mandateId = mandate.id;
        }
    }
    await ref.set(stripUndefined({
        lifecycleState: toState,
        visibility,
        mandateId: mandateId ?? existing.mandateId,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    await logEvent({
        tenantId: input.tenantId,
        orgListingId: input.id,
        action: payload.action,
        note: payload.note,
        by: input.user.uid,
        fromState,
        toState
    });
    return { id: input.id, lifecycleState: toState, visibility };
}
exports.transitionValidator = {
    assertTransition,
    nextState
};
