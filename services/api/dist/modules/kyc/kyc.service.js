"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKycSignedPutUrl = createKycSignedPutUrl;
exports.submitKyc = submitKyc;
exports.approveKyc = approveKyc;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const storage_service_1 = require("../../services/storage.service");
const objectPath_1 = require("../../utils/objectPath");
const env_1 = require("../../config/env");
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
async function createKycSignedPutUrl(input) {
    const { uid, docType, side, contentType, fileName } = input;
    const bucket = (0, storage_service_1.getBucket)();
    const safeExtRaw = fileName?.split(".").pop() || "bin";
    const safeExt = safeExtRaw.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const objectPath = `tenants/${env_1.env.platformTenantId}/kyc/${uid}/${docType}/${side}/${timestamp}-${random}.${safeExt}`;
    if (!(0, objectPath_1.isSafeObjectPath)(objectPath)) {
        throw new Error("Invalid object path");
    }
    (0, objectPath_1.requireKycPath)(uid, objectPath, env_1.env.platformTenantId);
    const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);
    const file = bucket.file(objectPath);
    const [url] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: expiresAt,
        contentType
    });
    return { url, objectPath, expiresAt: expiresAt.toISOString() };
}
async function submitKyc(input) {
    const { uid, countryCode, documents } = input;
    const normalizedDocs = documents.map((doc) => ({
        type: doc.type,
        idNumberMasked: doc.idNumberMasked,
        front: doc.front ? { ...doc.front } : undefined,
        back: doc.back ? { ...doc.back } : undefined
    }));
    normalizedDocs.forEach((doc) => {
        ["front", "back"].forEach((side) => {
            const entry = doc[side];
            if (entry) {
                if (!(0, objectPath_1.isSafeObjectPath)(entry.objectPath)) {
                    throw new Error("Invalid object path");
                }
                (0, objectPath_1.requireKycPath)(uid, entry.objectPath, env_1.env.platformTenantId);
            }
        });
    });
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await firebase_1.firestore.collection("users").doc(uid).set({
        kyc: {
            status: "pending",
            level: "basic",
            countryCode,
            submittedAt: now,
            verifiedAt: null,
            rejectedAt: null,
            reviewedBy: null,
            remarks: null,
            documents: normalizedDocs
        }
    }, { merge: true });
    return { status: "pending", level: "basic" };
}
function assertAdminRole(role) {
    if (role !== "tenant_admin" && role !== "platform_admin") {
        throw new Error("Forbidden: admin role required");
    }
}
async function approveKyc(input) {
    const { uid, action, remarks, adminUid, adminRole } = input;
    assertAdminRole(adminRole);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const status = action === "verify" ? "verified" : "rejected";
    const update = {
        kyc: {
            status,
            verifiedAt: action === "verify" ? now : null,
            rejectedAt: action === "reject" ? now : null,
            reviewedBy: adminUid,
            remarks: remarks ?? null
        }
    };
    await firebase_1.firestore.collection("users").doc(uid).set(update, { merge: true });
    return { status };
}
