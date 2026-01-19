"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusinessRequests = listBusinessRequests;
exports.approveBusinessRequest = approveBusinessRequest;
exports.rejectBusinessRequest = rejectBusinessRequest;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const slugify_1 = require("../../utils/slugify");
const token_1 = require("../../utils/token");
function isPlatformAdmin(user) {
    if (user.role === "platform_admin")
        return true;
    return env_1.env.platformAdminUids.includes(user.uid);
}
function normalize(value) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}
function parseCursor(cursor) {
    if (!cursor)
        return null;
    const [ms, id] = cursor.split(":");
    const parsed = Number(ms);
    if (!Number.isFinite(parsed) || !id)
        return null;
    return { submittedAt: firebase_admin_1.default.firestore.Timestamp.fromMillis(parsed), id };
}
async function listBusinessRequests(user, query) {
    if (!isPlatformAdmin(user))
        throw new Error("Forbidden");
    let ref = firebase_1.firestore
        .collection("business_requests")
        .where("status", "==", query.status)
        .orderBy("submittedAt", "desc")
        .orderBy(firebase_admin_1.default.firestore.FieldPath.documentId(), "desc");
    const cursor = parseCursor(query.cursor);
    if (cursor) {
        ref = ref.startAfter(cursor.submittedAt, cursor.id);
    }
    ref = ref.limit(query.limit);
    const snap = await ref.get();
    let items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (query.q) {
        const needle = normalize(query.q);
        items = items.filter((item) => {
            const hay = [
                item.organizationName,
                item.email,
                item.phone,
                item.city,
                item.contactPerson
            ]
                .filter(Boolean)
                .join(" ");
            return normalize(hay).includes(needle);
        });
    }
    let nextCursor;
    if (!query.q && snap.docs.length === query.limit) {
        const last = snap.docs[snap.docs.length - 1];
        const submittedAt = last.data().submittedAt;
        if (submittedAt) {
            nextCursor = `${submittedAt.toMillis()}:${last.id}`;
        }
    }
    return { items, nextCursor };
}
async function buildUniqueTenantId(base, tx) {
    let candidate = base;
    for (let i = 0; i < 20; i += 1) {
        const ref = firebase_1.firestore.collection("tenants").doc(candidate);
        const snap = await tx.get(ref);
        if (!snap.exists)
            return candidate;
        candidate = `${base}-${i + 2}`;
    }
    throw new Error("TENANT_ID_CONFLICT");
}
async function approveBusinessRequest(user, requestId, body) {
    if (!isPlatformAdmin(user))
        throw new Error("Forbidden");
    const requestRef = firebase_1.firestore.collection("business_requests").doc(requestId);
    const tenantRef = firebase_1.firestore.collection("tenants");
    const inviteRef = firebase_1.firestore.collection("tenant_invites");
    const auditRef = firebase_1.firestore.collection("audit_logs");
    const token = (0, token_1.generateToken)(32);
    const tokenHash = (0, token_1.hashToken)(token, env_1.env.inviteTokenSalt);
    const inviteId = inviteRef.doc().id;
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const expiresAt = firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const result = await firebase_1.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(requestRef);
        if (!snap.exists)
            throw new Error("Not found");
        const request = snap.data();
        if (request.status !== "pending")
            throw new Error("ALREADY_REVIEWED");
        const type = body.tenantType ?? request.businessType;
        const baseSlugInput = body.tenantSlug ?? `${request.organizationName}-${request.city}`;
        const baseSlug = (0, slugify_1.slugify)(baseSlugInput);
        if (!baseSlug)
            throw new Error("INVALID_TENANT_SLUG");
        const tenantId = await buildUniqueTenantId(baseSlug, tx);
        tx.set(tenantRef.doc(tenantId), {
            tenantId,
            type,
            name: request.organizationName,
            city: request.city,
            status: "active",
            plan: body.plan ?? "trial",
            createdAt: now,
            createdFrom: { requestId }
        });
        tx.set(inviteRef.doc(inviteId), {
            tenantId,
            email: request.email,
            role: "tenant_admin",
            displayName: request.contactPerson,
            status: "active",
            tokenHash,
            expiresAt,
            createdAt: now,
            createdByUid: user.uid,
            source: "business_request",
            requestId
        });
        tx.set(requestRef, {
            status: "approved",
            reviewedAt: now,
            reviewedByUid: user.uid,
            reviewedByEmail: user.email || null,
            tenantId,
            inviteId
        }, { merge: true });
        tx.set(auditRef.doc(), {
            tenantId: "__platform__",
            actorUid: user.uid,
            actorRole: user.role,
            action: "BUSINESS_REQUEST_APPROVE",
            entityType: "business_request",
            entityId: requestId,
            metadata: { tenantId, inviteId },
            createdAt: now
        });
        return { tenantId, inviteId };
    });
    return { ...result, inviteToken: token };
}
async function rejectBusinessRequest(user, requestId, body) {
    if (!isPlatformAdmin(user))
        throw new Error("Forbidden");
    const requestRef = firebase_1.firestore.collection("business_requests").doc(requestId);
    const auditRef = firebase_1.firestore.collection("audit_logs");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await firebase_1.firestore.runTransaction(async (tx) => {
        const snap = await tx.get(requestRef);
        if (!snap.exists)
            throw new Error("Not found");
        const request = snap.data();
        if (request.status !== "pending")
            throw new Error("ALREADY_REVIEWED");
        tx.set(requestRef, {
            status: "rejected",
            rejectionReason: body.reason,
            reviewedAt: now,
            reviewedByUid: user.uid,
            reviewedByEmail: user.email || null
        }, { merge: true });
        tx.set(auditRef.doc(), {
            tenantId: "__platform__",
            actorUid: user.uid,
            actorRole: user.role,
            action: "BUSINESS_REQUEST_REJECT",
            entityType: "business_request",
            entityId: requestId,
            metadata: { reason: body.reason },
            createdAt: now
        });
    });
    return { ok: true };
}
