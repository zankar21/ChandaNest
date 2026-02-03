"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = acceptInvite;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const token_1 = require("../../utils/token");
const billing_service_1 = require("../billing/billing.service");
const team_service_1 = require("../team/team.service");
const rateLimit_1 = require("../../utils/rateLimit");
async function acceptInvite(input, meta) {
    const ipHash = meta.ip ? (0, rateLimit_1.hashIp)(meta.ip, env_1.env.ipHashSalt) : undefined;
    if (ipHash && (0, rateLimit_1.isRateLimited)(ipHash, 10, 60 * 1000)) {
        throw new Error("RATE_LIMITED");
    }
    const tokenHash = (0, token_1.hashToken)(input.token, env_1.env.inviteTokenSalt);
    const inviteSnap = await firebase_1.firestore
        .collection("tenant_invites")
        .where("tokenHash", "==", tokenHash)
        .limit(1)
        .get();
    if (inviteSnap.empty) {
        throw new Error("INVALID_INVITE");
    }
    const inviteDoc = inviteSnap.docs[0];
    const invite = inviteDoc.data();
    const expiresAt = invite.expiresAt?.toDate();
    if (invite.status !== "active" || (expiresAt && expiresAt.getTime() < Date.now())) {
        if (invite.status === "used") {
            throw new Error("INVITE_USED");
        }
        throw new Error("INVALID_INVITE");
    }
    const userRecord = await firebase_admin_1.default.auth().getUser(input.uid);
    const inviteEmail = invite.email.toLowerCase();
    const userEmail = (userRecord.email || "").toLowerCase();
    if (!userEmail || userEmail !== inviteEmail) {
        throw new Error("EMAIL_MISMATCH");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const userRef = firebase_1.firestore.collection("tenants").doc(invite.tenantId).collection("users").doc(input.uid);
    const seatsRef = firebase_1.firestore.collection("tenants").doc(invite.tenantId).collection("counters").doc("seats");
    const fallbackSeats = await (0, team_service_1.countActiveUsers)(invite.tenantId);
    await firebase_1.firestore.runTransaction(async (tx) => {
        const fresh = await tx.get(inviteDoc.ref);
        const data = fresh.data();
        if (!data)
            throw new Error("INVALID_INVITE");
        if (data.status !== "active")
            throw new Error("INVITE_USED");
        const subscription = await (0, billing_service_1.getOrCreateSubscriptionInTransaction)(tx, invite.tenantId);
        const seatLimit = subscription.limits.agentSeats ?? 0;
        const seatsSnap = await tx.get(seatsRef);
        const currentSeats = seatsSnap.exists ? seatsSnap.data()?.used ?? 0 : fallbackSeats;
        if (!seatsSnap.exists) {
            tx.set(seatsRef, { used: currentSeats, updatedAt: now }, { merge: true });
        }
        if (currentSeats + 1 > seatLimit) {
            throw new Error("SEAT_LIMIT_REACHED");
        }
        tx.set(userRef, {
            uid: input.uid,
            tenantId: invite.tenantId,
            role: invite.role,
            email: invite.email,
            displayName: invite.displayName ?? userRecord.displayName ?? null,
            status: "active",
            createdAt: now,
            updatedAt: now,
            createdFrom: { inviteId: inviteDoc.id }
        }, { merge: true });
        tx.set(inviteDoc.ref, {
            status: "used",
            usedAt: now,
            usedByUid: input.uid
        }, { merge: true });
        tx.set(seatsRef, { used: currentSeats + 1, updatedAt: now }, { merge: true });
        tx.set(firebase_1.firestore.collection("audit_logs").doc(), {
            tenantId: invite.tenantId,
            actorUid: input.uid,
            actorRole: invite.role,
            action: "INVITE_ACCEPT",
            entityType: "tenant_invite",
            entityId: inviteDoc.id,
            metadata: { tenantId: invite.tenantId },
            createdAt: now
        });
    });
    const currentClaims = userRecord.customClaims || {};
    await firebase_admin_1.default.auth().setCustomUserClaims(input.uid, {
        ...currentClaims,
        tenantId: invite.tenantId,
        role: invite.role
    });
    return { tenantId: invite.tenantId, role: invite.role };
}
