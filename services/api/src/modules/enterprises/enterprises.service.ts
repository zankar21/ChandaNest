import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { EnterpriseCreateSchema } from "./enterprises.schemas";
import {
  createMembership,
  listMembershipsByOrg,
  listMembershipsByUser,
  updateMembership
} from "../memberships/memberships.service";

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function enterprisesCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("enterprises");
}

function isTenantAdmin(user: AuthUser) {
  return user.role === "tenant_admin" || user.role === "platform_admin";
}

export async function createEnterprise(input: { tenantId: string; user: AuthUser; body: unknown }) {
  const payload = EnterpriseCreateSchema.parse(input.body);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = enterprisesCollection(input.tenantId).doc();
  const enterpriseId = ref.id;
  await ref.set(
    stripUndefined({
      ...payload,
      tenantId: input.tenantId,
      createdAt: now,
      createdBy: input.user.uid,
      updatedAt: now,
      updatedBy: input.user.uid
    })
  );
  await createMembership({
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

async function fetchEnterprisesByIds(tenantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }
  const results: any[] = [];
  for (const chunk of chunks) {
    const snap = await enterprisesCollection(tenantId)
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();
    results.push(...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }
  return results;
}

export async function listEnterprises(input: { tenantId: string; user: AuthUser }) {
  if (isTenantAdmin(input.user)) {
    const snap = await enterprisesCollection(input.tenantId).get();
    return { enterprises: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  }
  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid,
    orgType: "enterprise"
  });
  const ids = memberships.map((m) => m.orgId).filter(Boolean);
  const enterprises = await fetchEnterprisesByIds(input.tenantId, ids);
  return { enterprises };
}

export async function getEnterprise(input: { tenantId: string; enterpriseId: string; user: AuthUser }) {
  if (!isTenantAdmin(input.user)) {
    const membership = await listMembershipsByUser({
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
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

export async function addEnterpriseMember(input: {
  tenantId: string;
  enterpriseId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
  actor: AuthUser;
}) {
  return createMembership({
    tenantId: input.tenantId,
    orgType: "enterprise",
    orgId: input.enterpriseId,
    userId: input.userId,
    role: input.role,
    status: input.status,
    actor: input.actor
  });
}

export async function updateEnterpriseMember(input: {
  tenantId: string;
  enterpriseId: string;
  membershipId: string;
  role?: string;
  status?: "active" | "suspended";
  actor: AuthUser;
}) {
  return updateMembership({
    tenantId: input.tenantId,
    membershipId: input.membershipId,
    orgType: "enterprise",
    orgId: input.enterpriseId,
    role: input.role,
    status: input.status,
    actor: input.actor
  });
}

export async function listEnterpriseMembers(input: { tenantId: string; enterpriseId: string }) {
  const members = await listMembershipsByOrg({
    tenantId: input.tenantId,
    orgType: "enterprise",
    orgId: input.enterpriseId
  });
  return { members };
}
