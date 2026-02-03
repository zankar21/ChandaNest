"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMembership = createMembership;
exports.updateMembership = updateMembership;
exports.listMembershipsByOrg = listMembershipsByOrg;
exports.listMembershipsByUser = listMembershipsByUser;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const memberships_schemas_1 = require("./memberships.schemas");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function membershipsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("memberships");
}
async function createMembership(input) {
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const membershipId = `${input.orgType}_${input.orgId}_${input.userId}`;
    const ref = membershipsCollection(input.tenantId).doc(membershipId);
    const doc = {
        id: membershipId,
        tenantId: input.tenantId,
        orgType: input.orgType,
        orgId: input.orgId,
        userId: input.userId,
        role: input.role,
        status: input.status,
        createdAt: now,
        createdBy: input.actor.uid,
        updatedAt: now,
        updatedBy: input.actor.uid
    };
    await ref.set(stripUndefined(doc));
    return { membershipId };
}
async function updateMembership(input) {
    const payload = memberships_schemas_1.MembershipUpdateSchema.parse({
        role: input.role,
        status: input.status
    });
    const ref = membershipsCollection(input.tenantId).doc(input.membershipId);
    if (input.orgType && input.orgId) {
        const snap = await ref.get();
        if (!snap.exists) {
            throw new Error("Not found");
        }
        const data = snap.data();
        if (data.orgType !== input.orgType || data.orgId !== input.orgId) {
            throw new Error("Forbidden");
        }
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        ...payload,
        updatedAt: now,
        updatedBy: input.actor.uid
    }), { merge: true });
    return { membershipId: input.membershipId };
}
async function listMembershipsByOrg(input) {
    const snap = await membershipsCollection(input.tenantId)
        .where("orgType", "==", input.orgType)
        .where("orgId", "==", input.orgId)
        .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}
async function listMembershipsByUser(input) {
    let ref = membershipsCollection(input.tenantId)
        .where("userId", "==", input.userId)
        .where("status", "==", "active");
    if (input.orgType) {
        ref = ref.where("orgType", "==", input.orgType);
    }
    if (input.orgId) {
        ref = ref.where("orgId", "==", input.orgId);
    }
    const snap = await ref.get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}
