"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgency = createAgency;
exports.listAgencies = listAgencies;
exports.getAgency = getAgency;
exports.addAgencyMember = addAgencyMember;
exports.updateAgencyMember = updateAgencyMember;
exports.listAgencyMembers = listAgencyMembers;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const agencies_schemas_1 = require("./agencies.schemas");
const memberships_service_1 = require("../memberships/memberships.service");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function agenciesCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("agencies");
}
function isTenantAdmin(user) {
    return user.role === "tenant_admin" || user.role === "platform_admin";
}
async function createAgency(input) {
    const payload = agencies_schemas_1.AgencyCreateSchema.parse(input.body);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = agenciesCollection(input.tenantId).doc();
    const agencyId = ref.id;
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
        orgType: "agency",
        orgId: agencyId,
        userId: input.user.uid,
        role: "agency_admin",
        status: "active",
        actor: input.user
    });
    return { agencyId };
}
async function fetchAgenciesByIds(tenantId, ids) {
    if (ids.length === 0)
        return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
    }
    const results = [];
    for (const chunk of chunks) {
        const snap = await agenciesCollection(tenantId).where(firebase_admin_1.default.firestore.FieldPath.documentId(), "in", chunk).get();
        results.push(...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
    return results;
}
async function listAgencies(input) {
    if (isTenantAdmin(input.user)) {
        const snap = await agenciesCollection(input.tenantId).get();
        return { agencies: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid,
        orgType: "agency"
    });
    const ids = memberships.map((m) => m.orgId).filter(Boolean);
    const agencies = await fetchAgenciesByIds(input.tenantId, ids);
    return { agencies };
}
async function getAgency(input) {
    if (!isTenantAdmin(input.user)) {
        const membership = await (0, memberships_service_1.listMembershipsByUser)({
            tenantId: input.tenantId,
            userId: input.user.uid,
            orgType: "agency",
            orgId: input.agencyId
        });
        if (membership.length === 0) {
            throw new Error("Forbidden");
        }
    }
    const snap = await agenciesCollection(input.tenantId).doc(input.agencyId).get();
    if (!snap.exists)
        throw new Error("Not found");
    return { id: snap.id, ...snap.data() };
}
async function addAgencyMember(input) {
    return (0, memberships_service_1.createMembership)({
        tenantId: input.tenantId,
        orgType: "agency",
        orgId: input.agencyId,
        userId: input.userId,
        role: input.role,
        status: input.status,
        actor: input.actor
    });
}
async function updateAgencyMember(input) {
    return (0, memberships_service_1.updateMembership)({
        tenantId: input.tenantId,
        membershipId: input.membershipId,
        orgType: "agency",
        orgId: input.agencyId,
        role: input.role,
        status: input.status,
        actor: input.actor
    });
}
async function listAgencyMembers(input) {
    const members = await (0, memberships_service_1.listMembershipsByOrg)({
        tenantId: input.tenantId,
        orgType: "agency",
        orgId: input.agencyId
    });
    return { members };
}
