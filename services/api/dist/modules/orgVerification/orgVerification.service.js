"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgVerificationAccess = void 0;
exports.buildDecisionUpdate = buildDecisionUpdate;
exports.getVerificationCase = getVerificationCase;
exports.initVerificationCase = initVerificationCase;
exports.decideVerification = decideVerification;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const memberships_service_1 = require("../memberships/memberships.service");
const permissions_1 = require("../memberships/permissions");
const orgVerification_schemas_1 = require("./orgVerification.schemas");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function isTenantAdmin(user) {
    return user.role === "tenant_admin" || user.role === "platform_admin";
}
function findActiveMembership(memberships, orgType, orgId) {
    return memberships.find((m) => m.orgType === orgType && m.orgId === orgId && m.status === "active");
}
function canReadVerification(input) {
    if (isTenantAdmin(input.user))
        return true;
    const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
    if (!member)
        return false;
    return ((0, permissions_1.hasPermission)(member.role, "orgVerification.read") ||
        (0, permissions_1.hasPermission)(member.role, "orgVerification.decide"));
}
function canDecideVerification(input) {
    if (isTenantAdmin(input.user))
        return true;
    const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
    if (!member)
        return false;
    return (0, permissions_1.hasPermission)(member.role, "orgVerification.decide");
}
function verificationCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("orgVerification");
}
function orgDocsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("orgDocs");
}
function caseDocId(orgType, orgId) {
    return `${orgType}_${orgId}`;
}
function mergeChecklist(existing, inferred) {
    if (!existing)
        return inferred;
    if (!inferred)
        return existing;
    const merged = { ...existing };
    ["rera", "firmRegistration", "addressProof", "gst", "pan", "authorizationLetter"].forEach((key) => {
        if (merged[key] === undefined && inferred[key] !== undefined) {
            merged[key] = inferred[key];
        }
    });
    return merged;
}
function inferChecklistFromDocs(docs) {
    const inferred = {};
    docs.forEach((doc) => {
        const category = doc?.category;
        if (category === "rera")
            inferred.rera = true;
        if (category === "firm_registration")
            inferred.firmRegistration = true;
        if (category === "address_proof")
            inferred.addressProof = true;
        if (category === "gst")
            inferred.gst = true;
        if (category === "pan")
            inferred.pan = true;
        if (category === "authorization_letter")
            inferred.authorizationLetter = true;
    });
    return inferred;
}
async function getChecklistFromDocs(input) {
    const snap = await orgDocsCollection(input.tenantId)
        .where("orgType", "==", input.orgType)
        .where("orgId", "==", input.orgId)
        .where("status", "==", "active")
        .get();
    const docs = snap.docs.map((doc) => doc.data());
    return inferChecklistFromDocs(docs);
}
function buildDecisionUpdate(input) {
    return stripUndefined({
        status: input.status,
        checklist: input.checklist,
        notes: input.notes,
        decidedBy: {
            uid: input.userId,
            at: input.now,
            reason: input.reason
        },
        updatedAt: input.now,
        updatedBy: input.userId
    });
}
async function getVerificationCase(input) {
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: input.orgType,
        orgId: input.orgId
    });
    if (!canReadVerification({
        user: input.user,
        orgType: input.orgType,
        orgId: input.orgId,
        memberships
    })) {
        throw new Error("Forbidden");
    }
    const ref = verificationCollection(input.tenantId).doc(caseDocId(input.orgType, input.orgId));
    const snap = await ref.get();
    const inferredChecklist = await getChecklistFromDocs(input);
    if (!snap.exists) {
        const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
        await ref.set(stripUndefined({
            tenantId: input.tenantId,
            orgType: input.orgType,
            orgId: input.orgId,
            status: "pending",
            checklist: inferredChecklist,
            createdAt: now,
            createdBy: input.user.uid,
            updatedAt: now,
            updatedBy: input.user.uid
        }));
        return {
            id: ref.id,
            tenantId: input.tenantId,
            orgType: input.orgType,
            orgId: input.orgId,
            status: "pending",
            checklist: inferredChecklist
        };
    }
    const data = snap.data();
    return {
        id: snap.id,
        ...data,
        checklist: mergeChecklist(data.checklist, inferredChecklist)
    };
}
async function initVerificationCase(input) {
    return getVerificationCase(input);
}
async function decideVerification(input) {
    const payload = orgVerification_schemas_1.OrgVerificationDecideSchema.parse(input.body);
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: input.orgType,
        orgId: input.orgId
    });
    if (!canDecideVerification({
        user: input.user,
        orgType: input.orgType,
        orgId: input.orgId,
        memberships
    })) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = verificationCollection(input.tenantId).doc(caseDocId(input.orgType, input.orgId));
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set(stripUndefined({
            tenantId: input.tenantId,
            orgType: input.orgType,
            orgId: input.orgId,
            status: "pending",
            createdAt: now,
            createdBy: input.user.uid
        }), { merge: true });
    }
    const update = buildDecisionUpdate({
        status: payload.status,
        checklist: payload.checklist,
        notes: payload.notes,
        reason: payload.reason,
        userId: input.user.uid,
        now
    });
    await ref.set(update, { merge: true });
    return { caseId: ref.id, status: payload.status };
}
exports.orgVerificationAccess = {
    canReadVerification,
    canDecideVerification
};
