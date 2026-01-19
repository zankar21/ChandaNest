import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { MembershipUpdateSchema } from "./memberships.schemas";

type MembershipDoc = {
  id: string;
  tenantId: string;
  orgType: "agency" | "enterprise";
  orgId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdBy: string;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedBy: string;
};

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function membershipsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("memberships");
}

export async function createMembership(input: {
  tenantId: string;
  orgType: "agency" | "enterprise";
  orgId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
  actor: AuthUser;
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const membershipId = `${input.orgType}_${input.orgId}_${input.userId}`;
  const ref = membershipsCollection(input.tenantId).doc(membershipId);
  const doc: MembershipDoc = {
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

export async function updateMembership(input: {
  tenantId: string;
  membershipId: string;
  role?: string;
  status?: "active" | "suspended";
  actor: AuthUser;
  orgType?: "agency" | "enterprise";
  orgId?: string;
}) {
  const payload = MembershipUpdateSchema.parse({
    role: input.role,
    status: input.status
  });
  const ref = membershipsCollection(input.tenantId).doc(input.membershipId);
  if (input.orgType && input.orgId) {
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error("Not found");
    }
    const data = snap.data() as MembershipDoc;
    if (data.orgType !== input.orgType || data.orgId !== input.orgId) {
      throw new Error("Forbidden");
    }
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      ...payload,
      updatedAt: now,
      updatedBy: input.actor.uid
    }),
    { merge: true }
  );
  return { membershipId: input.membershipId };
}

export async function listMembershipsByOrg(input: {
  tenantId: string;
  orgType: "agency" | "enterprise";
  orgId: string;
}): Promise<MembershipDoc[]> {
  const snap = await membershipsCollection(input.tenantId)
    .where("orgType", "==", input.orgType)
    .where("orgId", "==", input.orgId)
    .get();
  return snap.docs.map((doc) => ({ ...(doc.data() as MembershipDoc), id: doc.id }));
}

export async function listMembershipsByUser(input: {
  tenantId: string;
  userId: string;
  orgType?: "agency" | "enterprise";
  orgId?: string;
}): Promise<MembershipDoc[]> {
  let ref: FirebaseFirestore.Query = membershipsCollection(input.tenantId)
    .where("userId", "==", input.userId)
    .where("status", "==", "active");
  if (input.orgType) {
    ref = ref.where("orgType", "==", input.orgType);
  }
  if (input.orgId) {
    ref = ref.where("orgId", "==", input.orgId);
  }
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ ...(doc.data() as MembershipDoc), id: doc.id }));
}

export type { MembershipDoc };
