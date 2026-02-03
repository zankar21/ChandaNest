"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantMe = getTenantMe;
exports.completePhoneKyc = completePhoneKyc;
exports.onboardOwner = onboardOwner;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const logger_1 = require("../../utils/logger");
function assertTenantAccess(user, tenantId) {
    if (user.tenantId !== tenantId && user.role !== "platform_admin") {
        throw new Error("Forbidden");
    }
}
async function getTenantMe(input) {
    const { tenantId, user } = input;
    assertTenantAccess(user, tenantId);
    const snap = await firebase_1.firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid).get();
    const data = snap.data() || {};
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
async function completePhoneKyc(input) {
    const { tenantId, user } = input;
    assertTenantAccess(user, tenantId);
    if (!user.phoneNumber) {
        throw new Error("Phone number not verified in Firebase");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await firebase_1.firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        kycStatus: "phone_verified",
        updatedAt: now
    }, { merge: true });
    return { kycStatus: "phone_verified" };
}
async function onboardOwner(input) {
    const { tenantId, user, fullName, ownerType, city, contactPreference, bestTimeToContact, alternatePhone, email } = input;
    if (tenantId !== "powerpulsetech") {
        throw new Error("Forbidden");
    }
    if (!user.phoneNumber) {
        logger_1.logger.warn("Owner onboard missing phone_number", { uid: user.uid, tenantId, role: user.role });
        throw new Error("phone_required");
    }
    const userRef = firebase_1.firestore.collection("tenants").doc(tenantId).collection("users").doc(user.uid);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const snap = await userRef.get();
    const existing = snap.data();
    if (existing?.role && existing.role !== "owner") {
        throw new Error("Forbidden");
    }
    await userRef.set({
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
    }, { merge: true });
    const userRecord = await firebase_admin_1.default.auth().getUser(user.uid);
    const claims = userRecord.customClaims || {};
    if (claims.role !== "owner" || claims.tenantId !== tenantId) {
        await firebase_admin_1.default.auth().setCustomUserClaims(user.uid, {
            ...claims,
            role: "owner",
            tenantId
        });
    }
    return { role: "owner", tenantId, kycStatus: "verified" };
}
