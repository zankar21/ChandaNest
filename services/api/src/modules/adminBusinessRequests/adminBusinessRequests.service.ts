import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { AuthUser } from "../../types";
import { slugify } from "../../utils/slugify";
import { generateToken, hashToken } from "../../utils/token";
import { ApproveBusinessRequestInput, ListBusinessRequestsQuery, RejectBusinessRequestInput } from "./adminBusinessRequests.schema";

type BusinessRequestDoc = {
  status: "pending" | "approved" | "rejected";
  businessType: "agency" | "enterprise" | "builder";
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  submittedAt?: FirebaseFirestore.Timestamp;
};

function isPlatformAdmin(user: AuthUser) {
  if (user.role === "platform_admin") return true;
  return env.platformAdminUids.includes(user.uid);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseCursor(cursor?: string) {
  if (!cursor) return null;
  const [ms, id] = cursor.split(":");
  const parsed = Number(ms);
  if (!Number.isFinite(parsed) || !id) return null;
  return { submittedAt: admin.firestore.Timestamp.fromMillis(parsed), id };
}

export async function listBusinessRequests(user: AuthUser, query: ListBusinessRequestsQuery) {
  if (!isPlatformAdmin(user)) throw new Error("Forbidden");

  let ref: FirebaseFirestore.Query = firestore
    .collection("business_requests")
    .where("status", "==", query.status)
    .orderBy("submittedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");

  const cursor = parseCursor(query.cursor);
  if (cursor) {
    ref = ref.startAfter(cursor.submittedAt, cursor.id);
  }

  ref = ref.limit(query.limit);
  const snap = await ref.get();
  let items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

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

  let nextCursor: string | undefined;
  if (!query.q && snap.docs.length === query.limit) {
    const last = snap.docs[snap.docs.length - 1];
    const submittedAt = (last.data() as any).submittedAt as FirebaseFirestore.Timestamp | undefined;
    if (submittedAt) {
      nextCursor = `${submittedAt.toMillis()}:${last.id}`;
    }
  }

  return { items, nextCursor };
}

async function buildUniqueTenantId(base: string, tx: FirebaseFirestore.Transaction) {
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const ref = firestore.collection("tenants").doc(candidate);
    const snap = await tx.get(ref);
    if (!snap.exists) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  throw new Error("TENANT_ID_CONFLICT");
}

export async function approveBusinessRequest(user: AuthUser, requestId: string, body: ApproveBusinessRequestInput) {
  if (!isPlatformAdmin(user)) throw new Error("Forbidden");

  const requestRef = firestore.collection("business_requests").doc(requestId);
  const tenantRef = firestore.collection("tenants");
  const inviteRef = firestore.collection("tenant_invites");
  const auditRef = firestore.collection("audit_logs");

  const token = generateToken(32);
  const tokenHash = hashToken(token, env.inviteTokenSalt);
  const inviteId = inviteRef.doc().id;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const result = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new Error("Not found");
    const request = snap.data() as BusinessRequestDoc;
    if (request.status !== "pending") throw new Error("ALREADY_REVIEWED");

    const type = body.tenantType ?? request.businessType;
    const baseSlugInput = body.tenantSlug ?? `${request.organizationName}-${request.city}`;
    const baseSlug = slugify(baseSlugInput);
    if (!baseSlug) throw new Error("INVALID_TENANT_SLUG");
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

    tx.set(
      requestRef,
      {
        status: "approved",
        reviewedAt: now,
        reviewedByUid: user.uid,
        reviewedByEmail: user.email || null,
        tenantId,
        inviteId
      },
      { merge: true }
    );

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

export async function rejectBusinessRequest(user: AuthUser, requestId: string, body: RejectBusinessRequestInput) {
  if (!isPlatformAdmin(user)) throw new Error("Forbidden");

  const requestRef = firestore.collection("business_requests").doc(requestId);
  const auditRef = firestore.collection("audit_logs");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new Error("Not found");
    const request = snap.data() as BusinessRequestDoc;
    if (request.status !== "pending") throw new Error("ALREADY_REVIEWED");

    tx.set(
      requestRef,
      {
        status: "rejected",
        rejectionReason: body.reason,
        reviewedAt: now,
        reviewedByUid: user.uid,
        reviewedByEmail: user.email || null
      },
      { merge: true }
    );

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
