"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnterprise = createEnterprise;
exports.listEnterprises = listEnterprises;
exports.getEnterprise = getEnterprise;
exports.addEnterpriseMember = addEnterpriseMember;
exports.updateEnterpriseMember = updateEnterpriseMember;
exports.listEnterpriseMembers = listEnterpriseMembers;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const enterprises_schemas_1 = require("./enterprises.schemas");
const memberships_service_1 = require("../memberships/memberships.service");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function enterprisesCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("enterprises");
}
function isTenantAdmin(user) {
    return user.role === "tenant_admin" || user.role === "platform_admin";
}
async function createEnterprise(input) {
    const payload = enterprises_schemas_1.EnterpriseCreateSchema.parse(input.body);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = enterprisesCollection(input.tenantId).doc();
    const enterpriseId = ref.id;
    await ref.set(stripUndefined({
        ...payload,
        tenantId: input.tenantId,
        createdAt: now,
        createdBy: input.user.uid,
        updatedAt: now,
        updatedBy: input.user.uid
    }));
    await (0, memberships_service_1.createMembership)({
        tenantId: input.tenantId,
        orgType: "enterprise",
        orgId: enterpriseId,
        userId: input.user.uid,
        role: "enterprise_admin",
        status: "active",
        actor: input.user
    });
    return { enterpriseId };
}
async function fetchEnterprisesByIds(tenantId, ids) {
    if (ids.length === 0)
        return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
    }
    const results = [];
    for (const chunk of chunks) {
        const snap = await enterprisesCollection(tenantId)
            .where(firebase_admin_1.default.firestore.FieldPath.documentId(), "in", chunk)
            .get();
        results.push(...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    return results;
}
async function listEnterprises(input) {
    if (isTenantAdmin(input.user)) {
        const snap = await enterprisesCollection(input.tenantId).get();
        return { enterprises: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: "enterprise"
    });
    const ids = memberships.map((m) => m.orgId).filter(Boolean);
    const enterprises = await fetchEnterprisesByIds(input.tenantId, ids);
    return { enterprises };
}
async function getEnterprise(input) {
    if (!isTenantAdmin(input.user)) {
        const membership = await (0, memberships_service_1.listMembershipsByUser)({
            tenantId: input.tenantId,
            userId: input.user.uid,
            orgType: "enterprise",
            orgId: input.enterpriseId
        });
        if (membership.length === 0) {
            throw new Error("Forbidden");
        }
    }
    const snap = await enterprisesCollection(input.tenantId).doc(input.enterpriseId).get();
    if (!snap.exists)
        throw new Error("Not found");
    return { id: snap.id, ...snap.data() };
}
async function addEnterpriseMember(input) {
    return (0, memberships_service_1.createMembership)({
        tenantId: input.tenantId,
        orgType: "enterprise",
        orgId: input.enterpriseId,
        userId: input.userId,
        role: input.role,
        status: input.status,
        actor: input.actor
    });
}
async function updateEnterpriseMember(input) {
    return (0, memberships_service_1.updateMembership)({
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        orgType: "enterprise",
        orgId: input.enterpriseId,
        role: input.role,
        status: input.status,
        actor: input.actor
    });
}
async function listEnterpriseMembers(input) {
    const members = await (0, memberships_service_1.listMembershipsByOrg)({
        tenantId: input.tenantId,
        orgType: "enterprise",
        orgId: input.enterpriseId
    });
    return { members };
}
