"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mandateAccessHelpers = void 0;
exports.requestMandate = requestMandate;
exports.listMandates = listMandates;
exports.getMandate = getMandate;
exports.approveMandate = approveMandate;
exports.rejectMandate = rejectMandate;
exports.revokeMandate = revokeMandate;
exports.findActiveMandate = findActiveMandate;
exports.validateMandateForPublish = validateMandateForPublish;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const memberships_service_1 = require("../memberships/memberships.service");
const permissions_1 = require("../memberships/permissions");
const mandates_schemas_1 = require("./mandates.schemas");
const defaultDeps = {
    async fetchMandate(tenantId, mandateId) {
        const snap = await firebase_1.firestore.collection("tenants").doc(tenantId).collection("mandates").doc(mandateId).get();
        if (!snap.exists)
            return null;
        return snap.data();
    }
};
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function mandatesCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("mandates");
}
function canRequestMandate(user, orgType, orgId, memberships) {
    if (user.role === "tenant_admin" || user.role === "platform_admin") {
        return true;
    }
    if (orgType === "agent") {
        return orgId === user.uid;
    }
    const member = memberships.find((m) => m.orgType === "agency" && m.orgId === orgId);
    if (!member)
        return false;
    return (0, permissions_1.hasPermission)(member.role, "mandates.request");
}
function canDecideMandate(user, ownerUid) {
    if (user.uid === ownerUid)
        return true;
    return user.role === "tenant_admin" || user.role === "platform_admin";
}
async function requestMandate(input) {
    const payload = mandates_schemas_1.MandateRequestSchema.parse(input.body);
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    if (!canRequestMandate(input.user, payload.orgType, payload.orgId, memberships)) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = mandatesCollection(input.tenantId).doc();
    const doc = {
        tenantId: input.tenantId,
        ownerUid: payload.ownerUid,
        orgType: payload.orgType,
        orgId: payload.orgId,
        ownerListingId: payload.ownerListingId,
        mandateType: payload.mandateType,
        permissions: {
            canPublish: payload.permissions?.canPublish ?? true,
            canEditPrice: payload.permissions?.canEditPrice ?? false,
            canEditMedia: payload.permissions?.canEditMedia ?? false
        },
        status: "pending",
        requestedBy: { uid: input.user.uid, at: now },
        validTo: payload.validTo,
        createdAt: now,
        updatedAt: now
    };
    await ref.set(stripUndefined(doc));
    return { mandateId: ref.id };
}
async function listMandates(input) {
    if (input.user.role === "tenant_admin" || input.user.role === "platform_admin") {
        const snap = await mandatesCollection(input.tenantId).orderBy("createdAt", "desc").get();
        return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    const allowedAgencyIds = memberships
        .filter((m) => m.orgType === "agency" && (0, permissions_1.hasPermission)(m.role, "mandates.read"))
        .map((m) => m.orgId);
    const items = [];
    const seen = new Set();
    const add = (snap) => {
        snap.docs.forEach((doc) => {
            if (seen.has(doc.id))
                return;
            seen.add(doc.id);
            items.push({ id: doc.id, ...doc.data() });
        });
    };
    const fetches = [];
    fetches.push(mandatesCollection(input.tenantId).where("ownerUid", "==", input.user.uid).get().then(add));
    fetches.push(mandatesCollection(input.tenantId).where("orgType", "==", "agent").where("orgId", "==", input.user.uid).get().then(add));
    allowedAgencyIds.forEach((agencyId) => {
        fetches.push(mandatesCollection(input.tenantId).where("orgType", "==", "agency").where("orgId", "==", agencyId).get().then(add));
    });
    await Promise.all(fetches);
    return { items };
}
async function getMandate(input) {
    const snap = await mandatesCollection(input.tenantId).doc(input.mandateId).get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    const canView = input.user.role === "tenant_admin" ||
        input.user.role === "platform_admin" ||
        data.ownerUid === input.user.uid ||
        (data.orgType === "agent" && data.orgId === input.user.uid) ||
        memberships.some((m) => m.orgType === "agency" && m.orgId === data.orgId && (0, permissions_1.hasPermission)(m.role, "mandates.read"));
    if (!canView)
        throw new Error("Forbidden");
    return { id: snap.id, ...data };
}
async function approveMandate(input) {
    const payload = mandates_schemas_1.MandateApproveSchema.parse(input.body);
    const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    if (data.status !== "pending")
        throw new Error("Invalid status");
    if (!canDecideMandate(input.user, data.ownerUid))
        throw new Error("Forbidden");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: "active",
        decidedBy: { uid: input.user.uid, at: now },
        validFrom: payload.validFrom ?? new Date().toISOString(),
        validTo: payload.validTo ?? data.validTo,
        updatedAt: now
    }), { merge: true });
    return { mandateId: input.mandateId };
}
async function rejectMandate(input) {
    const payload = mandates_schemas_1.MandateRejectSchema.parse(input.body);
    const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    if (data.status !== "pending")
        throw new Error("Invalid status");
    if (!canDecideMandate(input.user, data.ownerUid))
        throw new Error("Forbidden");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: "rejected",
        decidedBy: { uid: input.user.uid, at: now, reason: payload.reason },
        updatedAt: now
    }), { merge: true });
    return { mandateId: input.mandateId };
}
async function revokeMandate(input) {
    const payload = mandates_schemas_1.MandateRevokeSchema.parse(input.body);
    const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    if (data.status !== "active")
        throw new Error("Invalid status");
    if (!canDecideMandate(input.user, data.ownerUid))
        throw new Error("Forbidden");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: "revoked",
        decidedBy: { uid: input.user.uid, at: now, reason: payload.reason },
        updatedAt: now
    }), { merge: true });
    return { mandateId: input.mandateId };
}
async function findActiveMandate(input) {
    if (input.mandateId) {
        const doc = await defaultDeps.fetchMandate(input.tenantId, input.mandateId);
        if (!doc)
            return null;
        if (doc.ownerUid !== input.ownerUid ||
            doc.orgType !== input.orgType ||
            doc.orgId !== input.orgId ||
            doc.ownerListingId !== input.ownerListingId) {
            return null;
        }
        if (doc.status !== "active")
            return null;
        if (doc.validTo && new Date(doc.validTo) < new Date())
            return null;
        return { id: input.mandateId, ...doc };
    }
    let ref = mandatesCollection(input.tenantId)
        .where("ownerUid", "==", input.ownerUid)
        .where("orgType", "==", input.orgType)
        .where("orgId", "==", input.orgId)
        .where("ownerListingId", "==", input.ownerListingId)
        .where("status", "==", "active");
    const snap = await ref.get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const valid = items.find((item) => !item.validTo || new Date(item.validTo) >= new Date());
    return valid || null;
}
async function validateMandateForPublish(input, deps) {
    if (!input.ownerListingId)
        return null;
    if (input.principalType === "enterprise")
        return null;
    if (!input.ownerUid) {
        const err = new Error("Mandate required");
        err.code = "MANDATE_REQUIRED";
        err.status = 403;
        throw err;
    }
    const finder = deps?.findActive ?? findActiveMandate;
    const mandate = await finder({
        tenantId: input.tenantId,
        ownerUid: input.ownerUid,
        orgType: input.principalType,
        orgId: input.principalId,
        ownerListingId: input.ownerListingId,
        mandateId: input.mandateId
    });
    if (!mandate) {
        const err = new Error("Mandate required");
        err.code = "MANDATE_REQUIRED";
        err.status = 403;
        throw err;
    }
    return mandate;
}
exports.mandateAccessHelpers = {
    canRequestMandate,
    canDecideMandate
};
