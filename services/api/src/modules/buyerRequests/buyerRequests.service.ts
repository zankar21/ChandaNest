import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { FIXED_PARTNER } from "../../constants/market";
import { DEFAULTS } from "../../constants/propertyEnums";
import { AuthUser } from "../../types";
import {
  CreateBuyerRequestInput,
  ListBuyerRequestQuery,
  PatchBuyerRequestInput,
  BuyerRequest
} from "./buyerRequests.schemas";

function getTenantIdForPublic(): string {
  if (env.publicDefaultTenantId) return env.publicDefaultTenantId;
  if (env.platformTenantId) return env.platformTenantId;
  throw new Error("PUBLIC_DEFAULT_TENANT_ID is not configured");
}

function buyerRequestsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("buyerRequests");
}

export async function createBuyerRequestPublic(input: CreateBuyerRequestInput) {
  const tenantId = getTenantIdForPublic();
  const col = buyerRequestsCollection(tenantId);
  const ref = col.doc();
  const requestId = ref.id;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const consentAt =
    input.consent.at instanceof Date
      ? input.consent.at
      : typeof input.consent.at === "number"
      ? new Date(input.consent.at)
      : input.consent.at
      ? new Date(input.consent.at)
      : new Date();

  const propertyType =
    input.property.category === "land" ? input.property.type ?? DEFAULTS.landType : input.property.type;

  const doc: BuyerRequest = {
    tenantId,
    requestId,
    createdAt: now,
    updatedAt: now,
    status: "created",
    partner: FIXED_PARTNER,
    citySlug: input.citySlug,
    intent: input.intent,
    property: {
      category: input.property.category,
      type: propertyType ?? DEFAULTS.landType,
      bhk: input.property.bhk
    },
    budget: input.budget,
    localityText: input.localityText,
    mustHaves: input.mustHaves ?? [],
    dealBreakers: input.dealBreakers ?? [],
    consent: {
      ...input.consent,
      at: consentAt
    },
    buyer: {
      name: input.buyer.name,
      phone: input.buyer.phone,
      preferredCallTime: input.buyer.preferredCallTime
    }
  };

  await ref.set(doc);
  return { requestId };
}

export async function listBuyerRequests(user: AuthUser, tenantId: string, query: ListBuyerRequestQuery) {
  if (user.tenantId !== tenantId) throw new Error("Forbidden");
  let ref: FirebaseFirestore.Query = buyerRequestsCollection(tenantId);
  if (query.status) ref = ref.where("status", "==", query.status);
  if (query.citySlug) ref = ref.where("citySlug", "==", query.citySlug);
  ref = ref.orderBy("createdAt", "desc").limit(query.limit ?? 50);
  const snap = await ref.get();
  const items = snap.docs.map((d) => d.data());
  return { items };
}

export async function getBuyerRequest(user: AuthUser, tenantId: string, requestId: string) {
  if (user.tenantId !== tenantId) throw new Error("Forbidden");
  const ref = buyerRequestsCollection(tenantId).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  return snap.data();
}

export async function updateBuyerRequest(
  user: AuthUser,
  tenantId: string,
  requestId: string,
  body: PatchBuyerRequestInput
) {
  if (user.tenantId !== tenantId) throw new Error("Forbidden");
  const ref = buyerRequestsCollection(tenantId).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");

  const update: Partial<BuyerRequest> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (body.status) update.status = body.status as BuyerRequest["status"];
  if (body.notes !== undefined) (update as any).notes = body.notes;

  await ref.set(update, { merge: true });
  return { requestId };
}
