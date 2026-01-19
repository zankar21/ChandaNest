import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { listMembershipsByUser } from "../memberships/memberships.service";
import { hasPermission } from "../memberships/permissions";
import { OrgVerificationDecideSchema } from "./orgVerification.schemas";

type Membership = {
  orgType?: "agency" | "enterprise";
  orgId?: string;
  role?: string;
  status?: "active" | "suspended";
};

type Checklist = {
  rera?: boolean;
  firmRegistration?: boolean;
  addressProof?: boolean;
  gst?: boolean;
  pan?: boolean;
  authorizationLetter?: boolean;
};

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function isTenantAdmin(user: AuthUser) {
  return user.role === "tenant_admin" || user.role === "platform_admin";
}

function findActiveMembership(memberships: Membership[], orgType: "agency" | "enterprise", orgId: string) {
  return memberships.find((m) => m.orgType === orgType && m.orgId === orgId && m.status === "active");
}

function canReadVerification(input: {
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
  memberships: Membership[];
}) {
  if (isTenantAdmin(input.user)) return true;
  const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
  if (!member) return false;
  return (
    hasPermission(member.role, "orgVerification.read") ||
    hasPermission(member.role, "orgVerification.decide")
  );
}

function canDecideVerification(input: {
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
  memberships: Membership[];
}) {
  if (isTenantAdmin(input.user)) return true;
  const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
  if (!member) return false;
  return hasPermission(member.role, "orgVerification.decide");
}

function verificationCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("orgVerification");
}

function orgDocsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("orgDocs");
}

function caseDocId(orgType: "agency" | "enterprise", orgId: string) {
  return `${orgType}_${orgId}`;
}

function mergeChecklist(existing?: Checklist, inferred?: Checklist) {
  if (!existing) return inferred;
  if (!inferred) return existing;
  const merged: Checklist = { ...existing };
  (["rera", "firmRegistration", "addressProof", "gst", "pan", "authorizationLetter"] as const).forEach(
    (key) => {
      if (merged[key] === undefined && inferred[key] !== undefined) {
        merged[key] = inferred[key];
      }
    }
  );
  return merged;
}

function inferChecklistFromDocs(docs: any[]): Checklist {
  const inferred: Checklist = {};
  docs.forEach((doc) => {
    const category = doc?.category;
    if (category === "rera") inferred.rera = true;
    if (category === "firm_registration") inferred.firmRegistration = true;
    if (category === "address_proof") inferred.addressProof = true;
    if (category === "gst") inferred.gst = true;
    if (category === "pan") inferred.pan = true;
    if (category === "authorization_letter") inferred.authorizationLetter = true;
  });
  return inferred;
}

async function getChecklistFromDocs(input: { tenantId: string; orgType: "agency" | "enterprise"; orgId: string }) {
  const snap = await orgDocsCollection(input.tenantId)
    .where("orgType", "==", input.orgType)
    .where("orgId", "==", input.orgId)
    .where("status", "==", "active")
    .get();
  const docs = snap.docs.map((doc) => doc.data());
  return inferChecklistFromDocs(docs);
}

export function buildDecisionUpdate(input: {
  status: "verified" | "rejected";
  checklist?: Checklist;
  notes?: string;
  reason?: string;
  userId: string;
  now: any;
}) {
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

export async function getVerificationCase(input: {
  tenantId: string;
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
}) {
  const memberships = await listMembershipsByUser({
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
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(
      stripUndefined({
        tenantId: input.tenantId,
        orgType: input.orgType,
        orgId: input.orgId,
        status: "pending",
        checklist: inferredChecklist,
        createdAt: now,
        createdBy: input.user.uid,
        updatedAt: now,
        updatedBy: input.user.uid
      })
    );
    return {
      id: ref.id,
      tenantId: input.tenantId,
      orgType: input.orgType,
      orgId: input.orgId,
      status: "pending",
      checklist: inferredChecklist
    };
  }
  const data = snap.data() as any;
  return {
    id: snap.id,
    ...data,
    checklist: mergeChecklist(data.checklist, inferredChecklist)
  };
}

export async function initVerificationCase(input: {
  tenantId: string;
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
}) {
  return getVerificationCase(input);
}

export async function decideVerification(input: {
  tenantId: string;
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
  body: unknown;
}) {
  const payload = OrgVerificationDecideSchema.parse(input.body);
  const memberships = await listMembershipsByUser({
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
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = verificationCollection(input.tenantId).doc(caseDocId(input.orgType, input.orgId));
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      stripUndefined({
        tenantId: input.tenantId,
        orgType: input.orgType,
        orgId: input.orgId,
        status: "pending",
        createdAt: now,
        createdBy: input.user.uid
      }),
      { merge: true }
    );
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

export const orgVerificationAccess = {
  canReadVerification,
  canDecideVerification
};
