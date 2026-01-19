import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { getBucket } from "../../services/storage.service";
import { requireKycPath, isSafeObjectPath } from "../../utils/objectPath";
import { env } from "../../config/env";
import {
  KycApproveRequest,
  KycSignPutRequest,
  KycSubmitRequest
} from "./kyc.schemas";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type SignPutInput = KycSignPutRequest & { uid: string };
type SubmitInput = KycSubmitRequest & { uid: string };
type ApproveInput = KycApproveRequest & { adminUid: string; adminRole: string };

export async function createKycSignedPutUrl(input: SignPutInput) {
  const { uid, docType, side, contentType, fileName } = input;
  const bucket = getBucket();
  const safeExtRaw = fileName?.split(".").pop() || "bin";
  const safeExt = safeExtRaw.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const objectPath = `tenants/${env.platformTenantId}/kyc/${uid}/${docType}/${side}/${timestamp}-${random}.${safeExt}`;

  if (!isSafeObjectPath(objectPath)) {
    throw new Error("Invalid object path");
  }
  requireKycPath(uid, objectPath, env.platformTenantId);

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

export async function submitKyc(input: SubmitInput) {
  const { uid, countryCode, documents } = input;
  const normalizedDocs = documents.map((doc) => ({
    type: doc.type,
    idNumberMasked: doc.idNumberMasked,
    front: doc.front ? { ...doc.front } : undefined,
    back: doc.back ? { ...doc.back } : undefined
  }));

  normalizedDocs.forEach((doc) => {
    ["front", "back"].forEach((side) => {
      const entry = (doc as any)[side];
      if (entry) {
        if (!isSafeObjectPath(entry.objectPath)) {
          throw new Error("Invalid object path");
        }
        requireKycPath(uid, entry.objectPath, env.platformTenantId);
      }
    });
  });

  const now = admin.firestore.FieldValue.serverTimestamp();

  await firestore.collection("users").doc(uid).set(
    {
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
    },
    { merge: true }
  );

  return { status: "pending", level: "basic" };
}

function assertAdminRole(role: string) {
  if (role !== "tenant_admin" && role !== "platform_admin") {
    throw new Error("Forbidden: admin role required");
  }
}

export async function approveKyc(input: ApproveInput) {
  const { uid, action, remarks, adminUid, adminRole } = input;
  assertAdminRole(adminRole);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const status = action === "verify" ? "verified" : "rejected";
  const update: Record<string, unknown> = {
    kyc: {
      status,
      verifiedAt: action === "verify" ? now : null,
      rejectedAt: action === "reject" ? now : null,
      reviewedBy: adminUid,
      remarks: remarks ?? null
    }
  };

  await firestore.collection("users").doc(uid).set(update, { merge: true });

  return { status };
}
