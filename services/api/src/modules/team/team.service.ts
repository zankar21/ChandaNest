import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { AuthUser } from "../../types";
import { generateToken, hashToken } from "../../utils/token";
import { getOrCreateSubscription, getOrCreateSubscriptionInTransaction, isPlatformAdmin } from "../billing/billing.service";

type SeatCounterDoc = {
  used: number;
  updatedAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

type InviteDoc = {
  tenantId: string;
  email: string;
  role: string;
  displayName?: string;
  status: "active" | "used" | "revoked" | "expired";
  tokenHash: string;
  expiresAt?: FirebaseFirestore.Timestamp;
  createdAt?: FirebaseFirestore.Timestamp;
  createdByUid?: string;
  usedAt?: FirebaseFirestore.Timestamp;
  usedByUid?: string;
  revokedAt?: FirebaseFirestore.Timestamp;
  revokedByUid?: string;
};

type UserDoc = {
  uid: string;
  tenantId: string;
  role: string;
  email: string;
  displayName?: string | null;
  status: "active" | "disabled";
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};

const allowedRoles = new Set(["tenant_manager", "tenant_agent", "tenant_viewer"]);

function seatsCounterRef(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("counters").doc("seats");
}

function usersCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("users");
}

function invitesCollection() {
  return firestore.collection("tenant_invites");
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const prefix = name.slice(0, 2);
  return `${prefix}***@${domain}`;
}

function resolveTenantId(user: AuthUser, queryTenantId?: string) {
  if (isPlatformAdmin(user)) {
    if (!queryTenantId) throw new Error("TENANT_ID_REQUIRED");
    return queryTenantId;
  }
  return user.tenantId;
}

export async function getSeatLimit(tenantId: string, user: AuthUser) {
  const subscription = await getOrCreateSubscription(tenantId, user);
  return subscription.limits.agentSeats ?? 0;
}

export async function countActiveUsers(tenantId: string) {
  const snap = await usersCollection(tenantId).where("status", "==", "active").get();
  return snap.size;
}

export async function getSeatsUsed(tenantId: string) {
  const ref = seatsCounterRef(tenantId);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data() as SeatCounterDoc;
    return data?.used ?? 0;
  }
  const used = await countActiveUsers(tenantId);
  await ref.set(
    {
      used,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return used;
}

async function updateSeatsInTransaction(
  tx: FirebaseFirestore.Transaction,
  tenantId: string,
  nextUsed: number
) {
  const ref = seatsCounterRef(tenantId);
  tx.set(
    ref,
    {
      used: Math.max(0, nextUsed),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

export async function ensureSeatAvailable(tenantId: string, user: AuthUser, increment = 1) {
  const limit = await getSeatLimit(tenantId, user);
  const used = await getSeatsUsed(tenantId);
  if (used + increment > limit) {
    throw new Error("SEAT_LIMIT_REACHED");
  }
  return { limit, used };
}

export async function getTeamMe(user: AuthUser, queryTenantId?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  const subscription = await getOrCreateSubscription(tenantId, user);
  const seatsUsed = await getSeatsUsed(tenantId);
  return {
    tenantId,
    role: user.role,
    seatLimit: subscription.limits.agentSeats ?? 0,
    seatsUsed,
    planId: subscription.planId,
    status: subscription.status
  };
}

export async function listTeamUsers(user: AuthUser, queryTenantId?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  const snap = await usersCollection(tenantId).orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as UserDoc) }));
}

export async function listTeamInvites(user: AuthUser, queryTenantId?: string, status?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  let ref: FirebaseFirestore.Query = invitesCollection().where("tenantId", "==", tenantId);
  if (status) {
    ref = ref.where("status", "==", status);
  }
  ref = ref.orderBy("createdAt", "desc");
  const snap = await ref.get();
  return snap.docs.map((doc) => {
    const data = doc.data() as InviteDoc;
    return {
      inviteId: doc.id,
      email: data.email,
      role: data.role,
      status: data.status,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
      usedAt: data.usedAt
    };
  });
}

export async function createTeamInvite(
  user: AuthUser,
  input: { email: string; role: string; displayName?: string },
  queryTenantId?: string
) {
  const tenantId = resolveTenantId(user, queryTenantId);
  if (!isPlatformAdmin(user) && user.role !== "tenant_admin") throw new Error("FORBIDDEN");
  if (!allowedRoles.has(input.role)) throw new Error("INVALID_ROLE");

  const email = input.email.trim().toLowerCase();
  const usersRef = usersCollection(tenantId);
  const existingSnap = await usersRef.where("email", "==", email).where("status", "==", "active").limit(1).get();
  if (!existingSnap.empty) {
    throw new Error("ALREADY_MEMBER");
  }

  const token = generateToken(32);
  const tokenHash = hashToken(token, env.inviteTokenSalt);
  const inviteRef = invitesCollection().doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await inviteRef.set({
    tenantId,
    email,
    role: input.role,
    displayName: input.displayName ?? null,
    status: "active",
    tokenHash,
    expiresAt,
    createdAt: now,
    createdByUid: user.uid
  });

  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "TEAM_INVITE_CREATE",
    entityType: "tenant_invite",
    entityId: inviteRef.id,
    metadata: { email: maskEmail(email), role: input.role },
    createdAt: now
  });

  return { inviteId: inviteRef.id, inviteToken: token };
}

export async function revokeTeamInvite(user: AuthUser, inviteId: string, queryTenantId?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  if (!isPlatformAdmin(user) && user.role !== "tenant_admin") throw new Error("FORBIDDEN");

  const ref = invitesCollection().doc(inviteId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const invite = snap.data() as InviteDoc;
  if (invite.tenantId !== tenantId) throw new Error("FORBIDDEN");
  if (invite.status !== "active") return { ok: true };

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    {
      status: "revoked",
      revokedAt: now,
      revokedByUid: user.uid
    },
    { merge: true }
  );
  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "TEAM_INVITE_REVOKE",
    entityType: "tenant_invite",
    entityId: inviteId,
    metadata: { email: maskEmail(invite.email) },
    createdAt: now
  });

  return { ok: true };
}

export async function disableTeamUser(user: AuthUser, uid: string, queryTenantId?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  if (!isPlatformAdmin(user) && user.role !== "tenant_admin") throw new Error("FORBIDDEN");

  const userRef = usersCollection(tenantId).doc(uid);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("NOT_FOUND");
    const data = snap.data() as UserDoc;
    if (data.status === "disabled") return;
    tx.set(
      userRef,
      { status: "disabled", updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    const counterRef = seatsCounterRef(tenantId);
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists ? (counterSnap.data() as SeatCounterDoc).used ?? 0 : await countActiveUsers(tenantId);
    await updateSeatsInTransaction(tx, tenantId, Math.max(0, current - 1));
  });

  await admin.auth().setCustomUserClaims(uid, { role: "disabled" });
  await admin.auth().revokeRefreshTokens(uid);

  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "TEAM_USER_DISABLE",
    entityType: "user",
    entityId: uid,
    metadata: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { ok: true };
}

export async function enableTeamUser(user: AuthUser, uid: string, queryTenantId?: string) {
  const tenantId = resolveTenantId(user, queryTenantId);
  if (!isPlatformAdmin(user) && user.role !== "tenant_admin") throw new Error("FORBIDDEN");

  const userRef = usersCollection(tenantId).doc(uid);
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("NOT_FOUND");
    const data = snap.data() as UserDoc;
    if (data.status === "active") return;

    const subscription = await getOrCreateSubscriptionInTransaction(tx, tenantId, user);
    const seatLimit = subscription.limits.agentSeats ?? 0;
    const counterRef = seatsCounterRef(tenantId);
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists ? (counterSnap.data() as SeatCounterDoc).used ?? 0 : await countActiveUsers(tenantId);
    if (current + 1 > seatLimit) {
      throw new Error("SEAT_LIMIT_REACHED");
    }
    await updateSeatsInTransaction(tx, tenantId, current + 1);
    tx.set(
      userRef,
      { status: "active", updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  const userSnap = await userRef.get();
  const data = userSnap.data() as UserDoc | undefined;
  if (data) {
    await admin.auth().setCustomUserClaims(uid, { tenantId, role: data.role });
  }

  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "TEAM_USER_ENABLE",
    entityType: "user",
    entityId: uid,
    metadata: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { ok: true };
}
