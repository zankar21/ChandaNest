import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import type { AuthUser } from "../../types";

type AgentProfileInput = {
  tenantId: string;
  user: AuthUser;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  displayName?: string | null;
};

type AgentOnboardingInput = {
  tenantId: string;
  user: AuthUser;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  plan: "independent" | "professional" | "enterprise";
  fullName: string;
  businessName: string;
  city: string;
  reraId?: string | null;
};

export async function fetchAgentProfile(tenantId: string, userId: string) {
  const ref = firestore.collection("tenants").doc(tenantId).collection("agents").doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as Record<string, unknown>;
}

export async function submitAgentOnboarding(input: AgentOnboardingInput) {
  const { tenantId, user, status, plan, fullName, businessName, city, reraId } = input;
  const ref = firestore.collection("tenants").doc(tenantId).collection("agents").doc(user.uid);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload: Record<string, unknown> = {
    uid: user.uid,
    phone: user.phoneNumber || null,
    status,
    plan,
    fullName,
    businessName,
    city,
    reraId: reraId || null,
    updatedAt: now,
    isAgent: status === "ACTIVE"
  };
  if (!snap.exists) {
    payload.createdAt = now;
  }
  await ref.set(payload, { merge: true });
  return payload;
}

export async function upsertAgentProfile(input: AgentProfileInput) {
  const { tenantId, user, status, displayName } = input;
  const ref = firestore.collection("tenants").doc(tenantId).collection("agents").doc(user.uid);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payload: Record<string, unknown> = {
    uid: user.uid,
    phone: user.phoneNumber || null,
    status,
    updatedAt: now,
    isAgent: true,
    name: displayName || user.email || "Agent"
  };
  if (!snap.exists) {
    payload.createdAt = now;
  }
  await ref.set(payload, { merge: true });
  return payload;
}
