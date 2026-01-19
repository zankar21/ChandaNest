import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { listMembershipsByUser } from "../memberships/memberships.service";
import { hasPermission } from "../memberships/permissions";
import { OrgDocCreateSchema, OrgDocListQuerySchema, OrgDocPatchSchema } from "./orgDocs.schemas";

type Membership = {
  orgType?: "agency" | "enterprise";
  orgId?: string;
  role?: string;
  status?: "active" | "suspended";
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

function canAccessOrgDocs(input: {
  user: AuthUser;
  orgType: "agency" | "enterprise";
  orgId: string;
  memberships: Membership[];
  permission: "orgDocs.read" | "orgDocs.manage";
}) {
  if (isTenantAdmin(input.user)) return true;
  const member = findActiveMembership(input.memberships, input.orgType, input.orgId);
  if (!member) return false;
  return hasPermission(member.role, input.permission);
}

function orgDocsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("orgDocs");
}

export async function createOrgDoc(input: { tenantId: string; user: AuthUser; body: unknown }) {
  const payload = OrgDocCreateSchema.parse(input.body);
  const memberships = await listMembershipsByUser({
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
  const now = admin.firestore.FieldValue.serverTimestamp();
  const uploadedAt = new Date().toISOString();
  await ref.set(
    stripUndefined({
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
    })
  );
  return { docId: ref.id };
}

export async function listOrgDocs(input: { tenantId: string; user: AuthUser; query: unknown }) {
  const queryParsed = OrgDocListQuerySchema.parse(input.query);
  const memberships = await listMembershipsByUser({
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
  let ref: FirebaseFirestore.Query = orgDocsCollection(input.tenantId)
    .where("orgType", "==", queryParsed.orgType)
    .where("orgId", "==", queryParsed.orgId)
    .where("status", "==", "active");
  if (queryParsed.category) {
    ref = ref.where("category", "==", queryParsed.category);
  }
  const snap = await ref.get();
  return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}

export async function updateOrgDoc(input: {
  tenantId: string;
  user: AuthUser;
  docId: string;
  body: unknown;
}) {
  const payload = OrgDocPatchSchema.parse(input.body);
  const ref = orgDocsCollection(input.tenantId).doc(input.docId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as { orgType: "agency" | "enterprise"; orgId: string };
  const memberships = await listMembershipsByUser({
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
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      status: payload.status,
      title: payload.title,
      updatedAt: now,
      updatedBy: input.user.uid
    }),
    { merge: true }
  );
  return { docId: input.docId };
}

export const orgDocsAccess = {
  canAccessOrgDocs
};
