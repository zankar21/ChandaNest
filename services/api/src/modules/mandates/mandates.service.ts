import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { listMembershipsByUser } from "../memberships/memberships.service";
import { hasPermission } from "../memberships/permissions";
import {
  MandateApproveSchema,
  MandateRejectSchema,
  MandateRequestSchema,
  MandateRevokeSchema
} from "./mandates.schemas";

type MandateDoc = {
  tenantId: string;
  ownerUid: string;
  orgType: "agent" | "agency";
  orgId: string;
  ownerListingId: string;
  mandateType: "exclusive" | "non_exclusive";
  permissions: {
    canPublish: boolean;
    canEditPrice: boolean;
    canEditMedia: boolean;
  };
  status: "pending" | "active" | "rejected" | "expired" | "revoked";
  requestedBy: { uid: string; at: FirebaseFirestore.FieldValue };
  decidedBy?: { uid: string; at: FirebaseFirestore.FieldValue; reason?: string };
  validFrom?: string;
  validTo?: string;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
};

type MandateDeps = {
  fetchMandate: (tenantId: string, mandateId: string) => Promise<MandateDoc | null>;
};

const defaultDeps: MandateDeps = {
  async fetchMandate(tenantId, mandateId) {
    const snap = await firestore.collection("tenants").doc(tenantId).collection("mandates").doc(mandateId).get();
    if (!snap.exists) return null;
    return snap.data() as MandateDoc;
  }
};

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function mandatesCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("mandates");
}

function canRequestMandate(user: AuthUser, orgType: "agent" | "agency", orgId: string, memberships: any[]) {
  if (user.role === "tenant_admin" || user.role === "platform_admin") {
    return true;
  }
  if (orgType === "agent") {
    return orgId === user.uid;
  }
  const member = memberships.find((m) => m.orgType === "agency" && m.orgId === orgId);
  if (!member) return false;
  return hasPermission(member.role, "mandates.request");
}

function canDecideMandate(user: AuthUser, ownerUid: string) {
  if (user.uid === ownerUid) return true;
  return user.role === "tenant_admin" || user.role === "platform_admin";
}

export async function requestMandate(input: { tenantId: string; user: AuthUser; body: unknown }) {
  const payload = MandateRequestSchema.parse(input.body);
  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid
  });
  if (!canRequestMandate(input.user, payload.orgType, payload.orgId, memberships)) {
    throw new Error("Forbidden");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = mandatesCollection(input.tenantId).doc();
  const doc: MandateDoc = {
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

export async function listMandates(input: { tenantId: string; user: AuthUser }) {
  if (input.user.role === "tenant_admin" || input.user.role === "platform_admin") {
    const snap = await mandatesCollection(input.tenantId).orderBy("createdAt", "desc").get();
    return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  }
  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid
  });
  const allowedAgencyIds = memberships
    .filter((m) => m.orgType === "agency" && hasPermission(m.role, "mandates.read"))
    .map((m) => m.orgId);
  const items: any[] = [];
  const seen = new Set<string>();
  const add = (snap: FirebaseFirestore.QuerySnapshot) => {
    snap.docs.forEach((doc) => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);
      items.push({ id: doc.id, ...doc.data() });
    });
  };
  const fetches: Promise<void>[] = [];
  fetches.push(
    mandatesCollection(input.tenantId).where("ownerUid", "==", input.user.uid).get().then(add)
  );
  fetches.push(
    mandatesCollection(input.tenantId).where("orgType", "==", "agent").where("orgId", "==", input.user.uid).get().then(add)
  );
  allowedAgencyIds.forEach((agencyId) => {
    fetches.push(
      mandatesCollection(input.tenantId).where("orgType", "==", "agency").where("orgId", "==", agencyId).get().then(add)
    );
  });
  await Promise.all(fetches);
  return { items };
}

export async function getMandate(input: { tenantId: string; user: AuthUser; mandateId: string }) {
  const snap = await mandatesCollection(input.tenantId).doc(input.mandateId).get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as MandateDoc;
  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid
  });
  const canView =
    input.user.role === "tenant_admin" ||
    input.user.role === "platform_admin" ||
    data.ownerUid === input.user.uid ||
    (data.orgType === "agent" && data.orgId === input.user.uid) ||
    memberships.some((m) => m.orgType === "agency" && m.orgId === data.orgId && hasPermission(m.role, "mandates.read"));
  if (!canView) throw new Error("Forbidden");
  return { id: snap.id, ...data };
}

export async function approveMandate(input: {
  tenantId: string;
  user: AuthUser;
  mandateId: string;
  body: unknown;
}) {
  const payload = MandateApproveSchema.parse(input.body);
  const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as MandateDoc;
  if (data.status !== "pending") throw new Error("Invalid status");
  if (!canDecideMandate(input.user, data.ownerUid)) throw new Error("Forbidden");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      status: "active",
      decidedBy: { uid: input.user.uid, at: now },
      validFrom: payload.validFrom ?? new Date().toISOString(),
      validTo: payload.validTo ?? data.validTo,
      updatedAt: now
    }),
    { merge: true }
  );
  return { mandateId: input.mandateId };
}

export async function rejectMandate(input: {
  tenantId: string;
  user: AuthUser;
  mandateId: string;
  body: unknown;
}) {
  const payload = MandateRejectSchema.parse(input.body);
  const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as MandateDoc;
  if (data.status !== "pending") throw new Error("Invalid status");
  if (!canDecideMandate(input.user, data.ownerUid)) throw new Error("Forbidden");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      status: "rejected",
      decidedBy: { uid: input.user.uid, at: now, reason: payload.reason },
      updatedAt: now
    }),
    { merge: true }
  );
  return { mandateId: input.mandateId };
}

export async function revokeMandate(input: {
  tenantId: string;
  user: AuthUser;
  mandateId: string;
  body: unknown;
}) {
  const payload = MandateRevokeSchema.parse(input.body);
  const ref = mandatesCollection(input.tenantId).doc(input.mandateId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as MandateDoc;
  if (data.status !== "active") throw new Error("Invalid status");
  if (!canDecideMandate(input.user, data.ownerUid)) throw new Error("Forbidden");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      status: "revoked",
      decidedBy: { uid: input.user.uid, at: now, reason: payload.reason },
      updatedAt: now
    }),
    { merge: true }
  );
  return { mandateId: input.mandateId };
}

export async function findActiveMandate(input: {
  tenantId: string;
  ownerUid: string;
  orgType: "agent" | "agency";
  orgId: string;
  ownerListingId: string;
  mandateId?: string;
}) {
  if (input.mandateId) {
    const doc = await defaultDeps.fetchMandate(input.tenantId, input.mandateId);
    if (!doc) return null;
    if (
      doc.ownerUid !== input.ownerUid ||
      doc.orgType !== input.orgType ||
      doc.orgId !== input.orgId ||
      doc.ownerListingId !== input.ownerListingId
    ) {
      return null;
    }
    if (doc.status !== "active") return null;
    if (doc.validTo && new Date(doc.validTo) < new Date()) return null;
    return { id: input.mandateId, ...doc };
  }
  let ref: FirebaseFirestore.Query = mandatesCollection(input.tenantId)
    .where("ownerUid", "==", input.ownerUid)
    .where("orgType", "==", input.orgType)
    .where("orgId", "==", input.orgId)
    .where("ownerListingId", "==", input.ownerListingId)
    .where("status", "==", "active");
  const snap = await ref.get();
  const items = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as MandateDoc) }));
  const valid = items.find((item) => !item.validTo || new Date(item.validTo) >= new Date());
  return valid || null;
}

export async function validateMandateForPublish(
  input: {
    tenantId: string;
    principalType: "agent" | "agency" | "enterprise";
    principalId: string;
    ownerUid?: string;
    ownerListingId?: string;
    mandateId?: string;
  },
  deps?: { findActive?: typeof findActiveMandate }
) {
  if (!input.ownerListingId) return null;
  if (input.principalType === "enterprise") return null;
  if (!input.ownerUid) {
    const err = new Error("Mandate required");
    (err as any).code = "MANDATE_REQUIRED";
    (err as any).status = 403;
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
    (err as any).code = "MANDATE_REQUIRED";
    (err as any).status = 403;
    throw err;
  }
  return mandate;
}

export const mandateAccessHelpers = {
  canRequestMandate,
  canDecideMandate
};
