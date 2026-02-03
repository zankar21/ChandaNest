"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSeatLimit = getSeatLimit;
exports.countActiveUsers = countActiveUsers;
exports.getSeatsUsed = getSeatsUsed;
exports.ensureSeatAvailable = ensureSeatAvailable;
exports.getTeamMe = getTeamMe;
exports.listTeamUsers = listTeamUsers;
exports.listTeamInvites = listTeamInvites;
exports.createTeamInvite = createTeamInvite;
exports.revokeTeamInvite = revokeTeamInvite;
exports.disableTeamUser = disableTeamUser;
exports.enableTeamUser = enableTeamUser;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const token_1 = require("../../utils/token");
const billing_service_1 = require("../billing/billing.service");
const allowedRoles = new Set(["tenant_manager", "tenant_agent", "tenant_viewer"]);
function seatsCounterRef(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("counters").doc("seats");
}
function usersCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("users");
}
function invitesCollection() {
    return firebase_1.firestore.collection("tenant_invites");
}
function maskEmail(email) {
    const [name, domain] = email.split("@");
    if (!domain)
        return "***";
    const prefix = name.slice(0, 2);
    return `${prefix}***@${domain}`;
}
function resolveTenantId(user, queryTenantId) {
    if ((0, billing_service_1.isPlatformAdmin)(user)) {
        if (!queryTenantId)
            throw new Error("TENANT_ID_REQUIRED");
        return queryTenantId;
    }
    return user.tenantId;
}
async function getSeatLimit(tenantId, user) {
    const subscription = await (0, billing_service_1.getOrCreateSubscription)(tenantId, user);
    return subscription.limits.agentSeats ?? 0;
}
async function countActiveUsers(tenantId) {
    const snap = await usersCollection(tenantId).where("status", "==", "active").get();
    return snap.size;
}
async function getSeatsUsed(tenantId) {
    const ref = seatsCounterRef(tenantId);
    const snap = await ref.get();
    if (snap.exists) {
        const data = snap.data();
        return data?.used ?? 0;
    }
    const used = await countActiveUsers(tenantId);
    await ref.set({
        used,
        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return used;
}
async function updateSeatsInTransaction(tx, tenantId, nextUsed) {
    const ref = seatsCounterRef(tenantId);
    tx.set(ref, {
        used: Math.max(0, nextUsed),
        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}
async function ensureSeatAvailable(tenantId, user, increment = 1) {
    const limit = await getSeatLimit(tenantId, user);
    const used = await getSeatsUsed(tenantId);
    if (used + increment > limit) {
        throw new Error("SEAT_LIMIT_REACHED");
    }
    return { limit, used };
}
async function getTeamMe(user, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    const subscription = await (0, billing_service_1.getOrCreateSubscription)(tenantId, user);
    const seatsUsed = await getSeatsUsed(tenantId);
    return {
        tenantId,
        role: user.role,
        seatLimit: subscription.limits.agentSeats ?? 0,
        seatsUsed,
        planId: subscription.planId,
        status: subscription.status
    };
}
async function listTeamUsers(user, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    const snap = await usersCollection(tenantId).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function listTeamInvites(user, queryTenantId, status) {
    const tenantId = resolveTenantId(user, queryTenantId);
    let ref = invitesCollection().where("tenantId", "==", tenantId);
    if (status) {
        ref = ref.where("status", "==", status);
    }
    ref = ref.orderBy("createdAt", "desc");
    const snap = await ref.get();
    return snap.docs.map((doc) => {
        const data = doc.data();
        return {
            inviteId: doc.id,
            email: data.email,
            role: data.role,
            status: data.status,
            expiresAt: data.expiresAt,
            createdAt: data.createdAt,
            usedAt: data.usedAt
        };
    });
}
async function createTeamInvite(user, input, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    if (!(0, billing_service_1.isPlatformAdmin)(user) && user.role !== "tenant_admin")
        throw new Error("FORBIDDEN");
    if (!allowedRoles.has(input.role))
        throw new Error("INVALID_ROLE");
    const email = input.email.trim().toLowerCase();
    const usersRef = usersCollection(tenantId);
    const existingSnap = await usersRef.where("email", "==", email).where("status", "==", "active").limit(1).get();
    if (!existingSnap.empty) {
        throw new Error("ALREADY_MEMBER");
    }
    const token = (0, token_1.generateToken)(32);
    const tokenHash = (0, token_1.hashToken)(token, env_1.env.inviteTokenSalt);
    const inviteRef = invitesCollection().doc();
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const expiresAt = firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    await inviteRef.set({
        tenantId,
        email,
        role: input.role,
        displayName: input.displayName ?? null,
        status: "active",
        tokenHash,
        expiresAt,
        createdAt: now,
        createdByUid: user.uid
    });
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "TEAM_INVITE_CREATE",
        entityType: "tenant_invite",
        entityId: inviteRef.id,
        metadata: { email: maskEmail(email), role: input.role },
        createdAt: now
    });
    return { inviteId: inviteRef.id, inviteToken: token };
}
async function revokeTeamInvite(user, inviteId, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    if (!(0, billing_service_1.isPlatformAdmin)(user) && user.role !== "tenant_admin")
        throw new Error("FORBIDDEN");
    const ref = invitesCollection().doc(inviteId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("NOT_FOUND");
    const invite = snap.data();
    if (invite.tenantId !== tenantId)
        throw new Error("FORBIDDEN");
    if (invite.status !== "active")
        return { ok: true };
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set({
        status: "revoked",
        revokedAt: now,
        revokedByUid: user.uid
    }, { merge: true });
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "TEAM_INVITE_REVOKE",
        entityType: "tenant_invite",
        entityId: inviteId,
        metadata: { email: maskEmail(invite.email) },
        createdAt: now
    });
    return { ok: true };
}
async function disableTeamUser(user, uid, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    if (!(0, billing_service_1.isPlatformAdmin)(user) && user.role !== "tenant_admin")
        throw new Error("FORBIDDEN");
    const userRef = usersCollection(tenantId).doc(uid);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists)
            throw new Error("NOT_FOUND");
        const data = snap.data();
        if (data.status === "disabled")
            return;
        tx.set(userRef, { status: "disabled", updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }, { merge: true });
        const counterRef = seatsCounterRef(tenantId);
        const counterSnap = await tx.get(counterRef);
        const current = counterSnap.exists ? counterSnap.data().used ?? 0 : await countActiveUsers(tenantId);
        await updateSeatsInTransaction(tx, tenantId, Math.max(0, current - 1));
    });
    await firebase_admin_1.default.auth().setCustomUserClaims(uid, { role: "disabled" });
    await firebase_admin_1.default.auth().revokeRefreshTokens(uid);
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "TEAM_USER_DISABLE",
        entityType: "user",
        entityId: uid,
        metadata: {},
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}
async function enableTeamUser(user, uid, queryTenantId) {
    const tenantId = resolveTenantId(user, queryTenantId);
    if (!(0, billing_service_1.isPlatformAdmin)(user) && user.role !== "tenant_admin")
        throw new Error("FORBIDDEN");
    const userRef = usersCollection(tenantId).doc(uid);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists)
            throw new Error("NOT_FOUND");
        const data = snap.data();
        if (data.status === "active")
            return;
        const subscription = await (0, billing_service_1.getOrCreateSubscriptionInTransaction)(tx, tenantId, user);
        const seatLimit = subscription.limits.agentSeats ?? 0;
        const counterRef = seatsCounterRef(tenantId);
        const counterSnap = await tx.get(counterRef);
        const current = counterSnap.exists ? counterSnap.data().used ?? 0 : await countActiveUsers(tenantId);
        if (current + 1 > seatLimit) {
            throw new Error("SEAT_LIMIT_REACHED");
        }
        await updateSeatsInTransaction(tx, tenantId, current + 1);
        tx.set(userRef, { status: "active", updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    const userSnap = await userRef.get();
    const data = userSnap.data();
    if (data) {
        await firebase_admin_1.default.auth().setCustomUserClaims(uid, { tenantId, role: data.role });
    }
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "TEAM_USER_ENABLE",
        entityType: "user",
        entityId: uid,
        metadata: {},
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}
