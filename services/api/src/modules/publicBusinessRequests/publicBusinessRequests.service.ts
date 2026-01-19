import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { hashIp, isRateLimited } from "../../utils/rateLimit";
import { PublicBusinessRequestInput } from "./publicBusinessRequests.schema";

type RequestMeta = {
  ip?: string;
  userAgent?: string;
};

function stripUndefined<T extends Record<string, any>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

export async function createBusinessRequest(input: PublicBusinessRequestInput, meta: RequestMeta) {
  const ipHash = meta.ip ? hashIp(meta.ip, env.ipHashSalt) : undefined;
  if (ipHash && isRateLimited(ipHash, 5, 60 * 60 * 1000)) {
    throw new Error("RATE_LIMITED");
  }

  const ref = firestore.collection("business_requests").doc();
  const requestId = ref.id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const doc = stripUndefined({
    status: "pending",
    businessType: input.businessType,
    organizationName: input.organizationName,
    contactPerson: input.contactPerson,
    email: input.email,
    phone: input.phone,
    city: input.city,
    gstNumber: input.gstNumber,
    website: input.website,
    expectedListings: input.expectedListings,
    message: input.message,
    source: "web-public",
    userAgent: meta.userAgent ? meta.userAgent.slice(0, 200) : undefined,
    ipHash,
    submittedAt: now
  });

  await ref.set(doc);
  return { requestId };
}
