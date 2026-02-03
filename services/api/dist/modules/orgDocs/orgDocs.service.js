"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgDocsAccess = void 0;
exports.createOrgDoc = createOrgDoc;
exports.listOrgDocs = listOrgDocs;
exports.updateOrgDoc = updateOrgDoc;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const memberships_service_1 = require("../memberships/memberships.service");
const permissions_1 = require("../memberships/permissions");
const orgDocs_schemas_1 = require("./orgDocs.schemas");
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
function canAccessOrgDocs(input) {
    if (isTenantAdmin(input.user))
        return true;
    const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
    if (!member)
        return false;
    return (0, permissions_1.hasPermission)(member.role, input.permission);
}
function orgDocsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("orgDocs");
}
async function createOrgDoc(input) {
    const payload = orgDocs_schemas_1.OrgDocCreateSchema.parse(input.body);
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: payload.orgType,
        orgId: payload.orgId
    });
    if (!canAccessOrgDocs({
        user: input.user,
        orgType: payload.orgType,
        orgId: payload.orgId,
        memberships,
        permission: "orgDocs.manage"
    })) {
        throw new Error("Forbidden");
    }
    const ref = orgDocsCollection(input.tenantId).doc();
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const uploadedAt = new Date().toISOString();
    await ref.set(stripUndefined({
        tenantId: input.tenantId,
        orgType: payload.orgType,
        orgId: payload.orgId,
        category: payload.category,
        objectPath: payload.objectPath,
        contentType: payload.contentType,
        sizeBytes: payload.sizeBytes,
        name: payload.name,
        title: payload.title,
        uploadedAt,
        uploadedBy: { uid: input.user.uid, email: input.user.email },
        status: "active",
        createdAt: now,
        createdBy: input.user.uid,
        updatedAt: now,
        updatedBy: input.user.uid
    }));
    return { docId: ref.id };
}
async function listOrgDocs(input) {
    const queryParsed = orgDocs_schemas_1.OrgDocListQuerySchema.parse(input.query);
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: queryParsed.orgType,
        orgId: queryParsed.orgId
    });
    if (!canAccessOrgDocs({
        user: input.user,
        orgType: queryParsed.orgType,
        orgId: queryParsed.orgId,
        memberships,
        permission: "orgDocs.read"
    })) {
        throw new Error("Forbidden");
    }
    let ref = orgDocsCollection(input.tenantId)
        .where("orgType", "==", queryParsed.orgType)
        .where("orgId", "==", queryParsed.orgId)
        .where("status", "==", "active");
    if (queryParsed.category) {
        ref = ref.where("category", "==", queryParsed.category);
    }
    const snap = await ref.get();
    return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}
async function updateOrgDoc(input) {
    const payload = orgDocs_schemas_1.OrgDocPatchSchema.parse(input.body);
    const ref = orgDocsCollection(input.tenantId).doc(input.docId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: data.orgType,
        orgId: data.orgId
    });
    if (!canAccessOrgDocs({
        user: input.user,
        orgType: data.orgType,
        orgId: data.orgId,
        memberships,
        permission: "orgDocs.manage"
    })) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: payload.status,
        title: payload.title,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    return { docId: input.docId };
}
exports.orgDocsAccess = {
    canAccessOrgDocs
};
