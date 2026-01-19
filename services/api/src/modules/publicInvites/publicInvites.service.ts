import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { hashToken } from "../../utils/token";
import { getOrCreateSubscriptionInTransaction } from "../billing/billing.service";
import { countActiveUsers } from "../team/team.service";
import { hashIp, isRateLimited } from "../../utils/rateLimit";
import { AcceptInviteInput } from "./publicInvites.schema";

type InviteDoc = {
  tenantId: string;
  email: string;
  role: string;
  status: "active" | "used";
  tokenHash: string;
  expiresAt?: FirebaseFirestore.Timestamp;
  displayName?: string;
};

export async function acceptInvite(input: AcceptInviteInput, meta: { ip?: string }) {
  const ipHash = meta.ip ? hashIp(meta.ip, env.ipHashSalt) : undefined;
  if (ipHash && isRateLimited(ipHash, 10, 60 * 1000)) {
    throw new Error("RATE_LIMITED");
  }

  const tokenHash = hashToken(input.token, env.inviteTokenSalt);
  const inviteSnap = await firestore
    .collection("tenant_invites")
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();

  if (inviteSnap.empty) {
    throw new Error("INVALID_INVITE");
  }

  const inviteDoc = inviteSnap.docs[0];
  const invite = inviteDoc.data() as InviteDoc;
  const expiresAt = invite.expiresAt?.toDate();
  if (invite.status !== "active" || (expiresAt && expiresAt.getTime() < Date.now())) {
    if (invite.status === "used") {
      throw new Error("INVITE_USED");
    }
    throw new Error("INVALID_INVITE");
  }

  const userRecord = await admin.auth().getUser(input.uid);
  const inviteEmail = invite.email.toLowerCase();
  const userEmail = (userRecord.email || "").toLowerCase();
  if (!userEmail || userEmail !== inviteEmail) {
    throw new Error("EMAIL_MISMATCH");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const userRef = firestore.collection("tenants").doc(invite.tenantId).collection("users").doc(input.uid);
  const seatsRef = firestore.collection("tenants").doc(invite.tenantId).collection("counters").doc("seats");
  const fallbackSeats = await countActiveUsers(invite.tenantId);

  await firestore.runTransaction(async (tx) => {
    const fresh = await tx.get(inviteDoc.ref);
    const data = fresh.data() as InviteDoc | undefined;
    if (!data) throw new Error("INVALID_INVITE");
    if (data.status !== "active") throw new Error("INVITE_USED");

    const subscription = await getOrCreateSubscriptionInTransaction(tx, invite.tenantId);
    const seatLimit = subscription.limits.agentSeats ?? 0;

    const seatsSnap = await tx.get(seatsRef);
    const currentSeats = seatsSnap.exists ? (seatsSnap.data() as any)?.used ?? 0 : fallbackSeats;
    if (!seatsSnap.exists) {
      tx.set(seatsRef, { used: currentSeats, updatedAt: now }, { merge: true });
    }
    if (currentSeats + 1 > seatLimit) {
      throw new Error("SEAT_LIMIT_REACHED");
    }

    tx.set(
      userRef,
      {
        uid: input.uid,
        tenantId: invite.tenantId,
        role: invite.role,
        email: invite.email,
        displayName: invite.displayName ?? userRecord.displayName ?? null,
        status: "active",
        createdAt: now,
        updatedAt: now,
        createdFrom: { inviteId: inviteDoc.id }
      },
      { merge: true }
    );
    tx.set(
      inviteDoc.ref,
      {
        status: "used",
        usedAt: now,
        usedByUid: input.uid
      },
      { merge: true }
    );
    tx.set(seatsRef, { used: currentSeats + 1, updatedAt: now }, { merge: true });
    tx.set(firestore.collection("audit_logs").doc(), {
      tenantId: invite.tenantId,
      actorUid: input.uid,
      actorRole: invite.role,
      action: "INVITE_ACCEPT",
      entityType: "tenant_invite",
      entityId: inviteDoc.id,
      metadata: { tenantId: invite.tenantId },
      createdAt: now
    });
  });

  const currentClaims = userRecord.customClaims || {};
  await admin.auth().setCustomUserClaims(input.uid, {
    ...currentClaims,
    tenantId: invite.tenantId,
    role: invite.role
  });

  return { tenantId: invite.tenantId, role: invite.role };
}
