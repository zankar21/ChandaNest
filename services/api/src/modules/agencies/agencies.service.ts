import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { AgencyCreateSchema } from "./agencies.schemas";
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

function agenciesCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("agencies");
}

function isTenantAdmin(user: AuthUser) {
  return user.role === "tenant_admin" || user.role === "platform_admin";
}

export async function createAgency(input: { tenantId: string; user: AuthUser; body: unknown }) {
  const payload = AgencyCreateSchema.parse(input.body);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = agenciesCollection(input.tenantId).doc();
  const agencyId = ref.id;
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
    orgType: "agency",
    orgId: agencyId,
    userId: input.user.uid,
    role: "agency_admin",
    status: "active",
    actor: input.user
  });
  return { agencyId };
}

async function fetchAgenciesByIds(tenantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }
  const results: any[] = [];
  for (const chunk of chunks) {
    const snap = await agenciesCollection(tenantId).where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
    results.push(...snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  }
  return results;
}

export async function listAgencies(input: { tenantId: string; user: AuthUser }) {
  if (isTenantAdmin(input.user)) {
    const snap = await agenciesCollection(input.tenantId).get();
    return { agencies: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  }
  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid,
    orgType: "agency"
  });
  const ids = memberships.map((m) => m.orgId).filter(Boolean);
  const agencies = await fetchAgenciesByIds(input.tenantId, ids);
  return { agencies };
}

export async function getAgency(input: { tenantId: string; agencyId: string; user: AuthUser }) {
  if (!isTenantAdmin(input.user)) {
    const membership = await listMembershipsByUser({
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
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

export async function addAgencyMember(input: {
  tenantId: string;
  agencyId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
  actor: AuthUser;
}) {
  return createMembership({
    tenantId: input.tenantId,
    orgType: "agency",
    orgId: input.agencyId,
    userId: input.userId,
    role: input.role,
    status: input.status,
    actor: input.actor
  });
}

export async function updateAgencyMember(input: {
  tenantId: string;
  agencyId: string;
  membershipId: string;
  role?: string;
  status?: "active" | "suspended";
  actor: AuthUser;
}) {
  return updateMembership({
    tenantId: input.tenantId,
    membershipId: input.membershipId,
    orgType: "agency",
    orgId: input.agencyId,
    role: input.role,
    status: input.status,
    actor: input.actor
  });
}

export async function listAgencyMembers(input: { tenantId: string; agencyId: string }) {
  const members = await listMembershipsByOrg({
    tenantId: input.tenantId,
    orgType: "agency",
    orgId: input.agencyId
  });
  return { members };
}
