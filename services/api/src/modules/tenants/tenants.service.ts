import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { logger } from "../../utils/logger";

function assertTenantAccess(user: AuthUser, tenantId: string) {
  if (user.tenantId !== tenantId && user.role !== "platform_admin") {
    throw new Error("Forbidden");
  }
}

export async function getTenantMe(input: { tenantId: string; user: AuthUser }) {
  const { tenantId, user } = input;
  assertTenantAccess(user, tenantId);
  const snap = await firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid).get();
  const data = (snap.data() as any) || {};
  return {
    uid: user.uid,
    email: data.email || user.email || null,
    tenantId: data.tenantId || user.tenantId || null,
    role: data.role || user.role || null,
    phoneNumber: user.phoneNumber ?? null,
    kycStatus: data.kycStatus || "none",
    fullName: data.fullName || null,
    ownerType: data.ownerType || null,
    city: data.city || null,
    contactPreference: data.contactPreference || null,
    bestTimeToContact: data.bestTimeToContact || null,
    alternatePhone: data.alternatePhone || null,
    onboardedAt: data.onboardedAt || null
  };
}

export async function completePhoneKyc(input: { tenantId: string; user: AuthUser }) {
  const { tenantId, user } = input;
  assertTenantAccess(user, tenantId);
  if (!user.phoneNumber) {
    throw new Error("Phone number not verified in Firebase");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      kycStatus: "phone_verified",
      updatedAt: now
    },
    { merge: true }
  );
  return { kycStatus: "phone_verified" };
}

export async function onboardOwner(input: {
  tenantId: string;
  user: AuthUser;
  fullName: string;
  ownerType: "individual" | "company" | "family_joint";
  city: string;
  contactPreference: "call" | "whatsapp";
  bestTimeToContact: "morning" | "afternoon" | "evening";
  alternatePhone?: string;
  email?: string;
}) {
  const {
    tenantId,
    user,
    fullName,
    ownerType,
    city,
    contactPreference,
    bestTimeToContact,
    alternatePhone,
    email
  } = input;
  if (tenantId !== "powerpulsetech") {
    throw new Error("Forbidden");
  }
  if (!user.phoneNumber) {
    logger.warn("Owner onboard missing phone_number", { uid: user.uid, tenantId, role: user.role });
    throw new Error("phone_required");
  }

  const userRef = firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const snap = await userRef.get();
  const existing = snap.data() as any | undefined;
  if (existing?.role && existing.role !== "owner") {
    throw new Error("Forbidden");
  }

  await userRef.set(
    {
      uid: user.uid,
      role: "owner",
      tenantId,
      fullName: fullName.trim(),
      ownerType,
      city: city.trim(),
      contactPreference,
      bestTimeToContact,
      alternatePhone: alternatePhone?.trim() || null,
      email: email?.trim() || existing?.email || user.email || null,
      phoneE164: user.phoneNumber,
      phoneNumber: user.phoneNumber,
      kycStatus: "verified",
      kycVerifiedAt: now,
      consentAcceptedAt: now,
      onboardedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    },
    { merge: true }
  );

  const userRecord = await admin.auth().getUser(user.uid);
  const claims = userRecord.customClaims || {};
  if (claims.role !== "owner" || claims.tenantId !== tenantId) {
    await admin.auth().setCustomUserClaims(user.uid, {
      ...claims,
      role: "owner",
      tenantId
    });
  }

  return { role: "owner", tenantId, kycStatus: "verified" };
}
