import admin from "firebase-admin";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";
import { removePublicProperty, upsertPublicProperty } from "../../services/publicSync.service";
import { logger } from "../../utils/logger";
import { isSafeObjectPath, requireTenantScopedPath } from "../../utils/objectPath";
import { AuthUser } from "../../types";
import { TRIAL_PUBLISH_LIMIT } from "../billing/plans";
import { fetchAgentSubscription } from "../agent/agent.subscription.service";
import {
  buildBillingError,
  requireCapability,
  requireOnboardingIfPremier,
  shouldEnforce
} from "../../middleware/requirePlan";
import { getOrCreateSubscriptionInTransaction } from "../billing";
import {
  ApprovePropertyInput,
  CreatePropertyInput,
  CreatePropertySchema,
  PatchPropertyInput,
  RejectPropertyInput,
  FeaturePropertyInput,
  SetVisibilityInput,
  SubmitPropertySchema
} from "./properties.schemas";
import { ZodError } from "zod";

type ListingDoc = Omit<CreatePropertyInput, "location" | "rental"> & {
  id: string;
  tenantId: string;
  visibility: "draft" | "published";
  listingStatus: "draft" | "submitted" | "approved" | "rejected";
  featured?: boolean;
  featuredAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  location?: any;
  rental?: any;
  moderation: {
    verificationStatus: "draft" | "pending" | "approved" | "rejected";
    requiredAction: string;
    approvedBy: string | null;
    approvedAt: FirebaseFirestore.FieldValue | null;
    remarks: string | null;
  };
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  createdBy: { uid: string; email: string };
};

function listingsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("listings");
}

export async function countPublishedListingsForUser(tenantId: string, userId: string) {
  const snap = await listingsCollection(tenantId)
    .where("visibility", "==", "published")
    .where("createdBy.uid", "==", userId)
    .get();
  return snap.size;
}

function assertTenantAccess(user: AuthUser, tenantId: string) {
  if (user.tenantId !== tenantId && user.role !== "platform_admin") {
    throw new Error("Forbidden");
  }
}

function isAdmin(role: string) {
  return role === "tenant_admin" || role === "platform_admin";
}

function isOwner(role: string) {
  return role === "owner";
}

function getDescriptionText(description: any) {
  if (!description) return "";
  if (typeof description === "string") return description;
  if (typeof description === "object") {
    if (description.active === "ai" && typeof description.ai === "string") return description.ai;
    if (description.active === "user" && typeof description.user === "string") return description.user;
    if (typeof description.user === "string") return description.user;
    if (typeof description.ai === "string") return description.ai;
  }
  return "";
}

async function getOwnerKycStatus(tenantId: string, uid: string) {
  const snap = await firestore.collection("tenants").doc(tenantId).collection("users").doc(uid).get();
  return (snap.data() as any)?.kycStatus ?? null;
}

function ensureMediaPathsSafe(tenantId: string, media?: any) {
  if (!media) return;
  const paths: string[] = [];
  if (media.hero?.objectPath) paths.push(media.hero.objectPath);
  media.gallery?.forEach((m: any) => m?.objectPath && paths.push(m.objectPath));
  media.documents?.forEach((m: any) => m?.objectPath && paths.push(m.objectPath));
  paths.forEach((p) => {
    if (!isSafeObjectPath(p)) {
      throw new Error("Invalid media object path");
    }
    requireTenantScopedPath(tenantId, p);
  });
}

const LAND_DOC_SLOTS = ["extract712", "naOrder", "other"] as const;
const LAND_DOC_CONTENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

type LandDocSlot = (typeof LAND_DOC_SLOTS)[number];
type LandDoc = { objectPath: string; fileName?: string; contentType?: string };
type LandDocs = Partial<Record<LandDocSlot, LandDoc | null>>;

function buildValidationError(message: string, fields: string[], code = "VALIDATION_FAILED", status = 400) {
  const err = new Error(message) as any;
  err.code = code;
  err.status = status;
  err.fields = fields;
  return err;
}

function collectLandPlotMissingFields(data: ListingDoc): string[] {
  const missing: string[] = [];
  if (data.mode !== "independent") return missing;
  if (data.propertyType === "land") {
    if (!data.landRecord?.mouza) missing.push("landRecord.mouza");
    if (!data.landRecord?.surveyOrGatNo) missing.push("landRecord.surveyOrGatNo");
    if (!data.landRecord?.taluka) missing.push("landRecord.taluka");
    if (!data.landRecord?.district) missing.push("landRecord.district");
    if (!data.area?.value) missing.push("area.value");
    if (!data.area?.unit) missing.push("area.unit");
  }
  if (data.propertyType === "plot") {
    if (!data.area?.value) missing.push("area.value");
    if (!data.area?.unit) missing.push("area.unit");
  }
  return missing;
}

async function assertLandDocsAllowed(input: {
  tenantId: string;
  listingId: string;
  tenantType?: string;
  propertyType?: string;
  user: AuthUser;
  documents?: { land?: LandDocs };
}) {
  const { tenantId, listingId, tenantType, propertyType, user, documents } = input;
  const landDocs = documents?.land;
  if (!landDocs) return;
  if (isOwner(user.role)) {
    throw buildValidationError("Land documents are enterprise-only.", [], "FEATURE_NOT_ALLOWED", 403);
  }
  if (tenantType !== "enterprise") {
    throw buildValidationError("Land documents are enterprise-only.", [], "FEATURE_NOT_ALLOWED", 403);
  }
  if (propertyType !== "land") {
    throw buildValidationError("Land documents are allowed only for land listings.", [], "FEATURE_NOT_ALLOWED", 403);
  }
  const prefix = `tenants/${tenantId}/listings/${listingId}/docs/land/`;
  LAND_DOC_SLOTS.forEach((slot) => {
    const doc = landDocs[slot];
    if (doc === undefined || doc === null) return;
    if (typeof doc.objectPath !== "string" || !doc.objectPath.startsWith(prefix)) {
      throw buildValidationError("Invalid land document path", [`documents.land.${slot}.objectPath`], "INVALID_DOC_PATH", 400);
    }
    if (!isSafeObjectPath(doc.objectPath)) {
      throw buildValidationError("Invalid land document path", [`documents.land.${slot}.objectPath`], "INVALID_DOC_PATH", 400);
    }
    requireTenantScopedPath(tenantId, doc.objectPath);
    if (doc.contentType && !LAND_DOC_CONTENT_TYPES.has(doc.contentType)) {
      throw buildValidationError(
        "Invalid land document content type",
        [`documents.land.${slot}.contentType`],
        "INVALID_CONTENT_TYPE",
        400
      );
    }
    if (doc.fileName && doc.fileName.length > 120) {
      throw buildValidationError(
        "Land document fileName is too long",
        [`documents.land.${slot}.fileName`],
        "INVALID_FILE_NAME",
        400
      );
    }
  });
}

function collectLandDocChanges(existing?: LandDocs, next?: LandDocs) {
  const changes: { slot: LandDocSlot; before?: LandDoc | null; after?: LandDoc | null }[] = [];
  LAND_DOC_SLOTS.forEach((slot) => {
    const before = existing?.[slot] ?? null;
    const after = next?.[slot] ?? null;
    const beforePath = before?.objectPath ?? null;
    const afterPath = after?.objectPath ?? null;
    if (beforePath !== afterPath) {
      changes.push({ slot, before, after });
    }
  });
  return changes;
}

function normalizeMediaItem(item: any) {
  if (!item) return null;
  if (typeof item === "string") return { objectPath: item };
  if (typeof item === "object" && typeof item.objectPath === "string" && item.objectPath) {
    return item;
  }
  return null;
}

function normalizeMediaInput(media: any) {
  if (!media || typeof media !== "object") return undefined;
  const hero = media.hero === null ? null : normalizeMediaItem(media.hero);
  const galleryRaw = Array.isArray(media.gallery) ? media.gallery : undefined;
  const galleryItems = galleryRaw ? galleryRaw.map(normalizeMediaItem).filter(Boolean) : undefined;
  const gallery = galleryItems
    ? galleryItems.filter((item: any, index: number, list: any[]) => {
        return list.findIndex((other) => other.objectPath === item.objectPath) === index;
      })
    : undefined;
  const documents = Array.isArray(media.documents) ? media.documents : undefined;

  return {
    hero: media.hero === null ? null : hero ?? undefined,
    gallery,
    documents
  };
}

function stripLegacyMediaFields(media: any) {
  if (!media || typeof media !== "object") return media;
  const { galleryUrls, ...rest } = media;
  return rest;
}

function buildListingDoc(input: CreatePropertyInput, user: AuthUser, tenantId: string, listingId: string): ListingDoc {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return {
    ...input,
    location: input.location ? sanitizeLocation(input.location) : undefined,
    id: listingId,
    tenantId,
    visibility: "draft",
    listingStatus: "draft",
    moderation: {
      verificationStatus: "draft",
      requiredAction: "none",
      approvedBy: null,
      approvedAt: null,
      remarks: null
    },
    createdAt: now,
    updatedAt: now,
    createdBy: { uid: user.uid, email: user.email }
  };
}

function mergeListing(existing: ListingDoc, patch: PatchPropertyInput): ListingDoc {
  const normalizedMedia = patch.media ? stripLegacyMediaFields(normalizeMediaInput(patch.media)) : undefined;
  const mergedMedia = normalizedMedia
    ? {
        ...(existing.media || {}),
        ...normalizedMedia,
        gallery: normalizedMedia.gallery ?? existing.media?.gallery ?? [],
        documents: normalizedMedia.documents ?? existing.media?.documents ?? []
      }
    : existing.media;
  return {
    ...existing,
    ...patch,
    contact: patch.contact ? { ...(existing.contact || {}), ...patch.contact } : existing.contact,
    rental: patch.rental ? { ...(existing.rental || {}), ...patch.rental } : existing.rental,
    location: patch.location
      ? sanitizeLocation({ ...(existing.location || {}), ...patch.location })
      : existing.location,
    specs: patch.specs ? { ...(existing.specs || {}), ...patch.specs } : existing.specs,
    plotInfo: patch.plotInfo ? { ...(existing.plotInfo || {}), ...patch.plotInfo } : existing.plotInfo,
    landRecord: patch.landRecord ? { ...(existing.landRecord || {}), ...patch.landRecord } : existing.landRecord,
    documents: patch.documents
      ? {
          ...(existing.documents || {}),
          ...patch.documents,
          land: patch.documents.land
            ? { ...(existing.documents?.land || {}), ...patch.documents.land }
            : existing.documents?.land
        }
      : existing.documents,
    pricing: patch.pricing ? { ...(existing.pricing || {}), ...patch.pricing } : existing.pricing,
    media: stripLegacyMediaFields(mergedMedia),
    unit: patch.unit
      ? {
          ...(existing.unit || {}),
          ...patch.unit,
          plot: patch.unit.plot ?? existing.unit?.plot,
          flat: patch.unit.flat ?? existing.unit?.flat,
          villa: patch.unit.villa ?? existing.unit?.villa
        }
      : existing.unit
  };
}

function toListingPayload(data: any): CreatePropertyInput {
  return {
    mode: data.mode,
    type: data.type,
    propertyType: data.propertyType,
    title: data.title,
    description: data.description,
    brokeragePartnerId: data.brokeragePartnerId,
    location: data.location,
    specs: data.specs,
    plotInfo: data.plotInfo,
    landRecord: data.landRecord,
    area: data.area,
    contact: data.contact,
    pricing: data.pricing,
    rental: data.rental,
    media: data.media,
    documents: data.documents,
    status: data.status,
    projectId: data.projectId,
    unitType: data.unitType,
    unit: data.unit,
    availability: data.availability
  };
}

async function findListingRef(propertyId: string, tenantId: string) {
  const primaryRef = listingsCollection(tenantId).doc(propertyId);
  const snap = await primaryRef.get();
  if (snap.exists) return primaryRef;
  const platformRef = listingsCollection(env.platformTenantId).doc(propertyId);
  const platformSnap = await platformRef.get();
  if (platformSnap.exists) return platformRef;
  return null;
}

function sanitizeLocation(location: any) {
  const geoFromNew =
    location.geo && typeof location.geo.lat === "number" && typeof location.geo.lng === "number"
      ? { lat: location.geo.lat, lng: location.geo.lng }
      : undefined;
  const geoFromLegacy =
    typeof location.lat === "number" && typeof location.lng === "number"
      ? { lat: location.lat, lng: location.lng }
      : undefined;
  const geo = geoFromNew || geoFromLegacy;
  return {
    citySlug: location.citySlug,
    locality: location.locality,
    addressLine: location.addressLine,
    pincode: location.pincode,
    geo
  };
}

export function deepStripUndefined(value: any): any {
  if (value && typeof value === "object" && "_methodName" in value) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepStripUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      const cleaned = deepStripUndefined(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    });
    return Object.keys(result).length ? result : undefined;
  }
  return value === undefined ? undefined : value;
}

export async function createProperty(input: {
  tenantId: string;
  body: CreatePropertyInput;
  user: AuthUser;
}) {
  const { tenantId, body, user } = input;
  assertTenantAccess(user, tenantId);
  const payload = CreatePropertySchema.parse(body);
  const normalizedPayload = {
    ...payload,
    location: payload.location ? sanitizeLocation(payload.location) : undefined,
    media: payload.media ? stripLegacyMediaFields(normalizeMediaInput(payload.media)) : undefined
  };
  if (isOwner(user.role) && payload.mode !== "independent") {
    throw new Error("Only independent listings are allowed for owners");
  }
  if (isOwner(user.role) && payload.type === "lease") {
    throw new Error("Lease listings are not allowed for owners");
  }
  ensureMediaPathsSafe(tenantId, normalizedPayload.media);

  const ref = listingsCollection(tenantId).doc();
  const listingId = ref.id;
  const tenantSnap = await firestore.collection("tenants").doc(tenantId).get();
  const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
  await assertLandDocsAllowed({
    tenantId,
    listingId,
    tenantType,
    propertyType: normalizedPayload.propertyType,
    user,
    documents: normalizedPayload.documents as any
  });
  const doc = buildListingDoc(normalizedPayload as CreatePropertyInput, user, tenantId, listingId);
  await requireOnboardingIfPremier(tenantId, user);
  await firestore.runTransaction(async (tx) => {
    const tenantSnapTx = await tx.get(firestore.collection("tenants").doc(tenantId));
    const tenantTypeTx = (tenantSnapTx.data() as any)?.type as string | undefined;
    const enforce = shouldEnforce(user, tenantTypeTx);
    if (enforce) {
      const subscription = await getOrCreateSubscriptionInTransaction(tx, tenantId, user);
      const active = subscription.status === "active" || subscription.status === "trialing";
      if (!active || subscription.validTill.toDate().getTime() < Date.now()) {
        throw buildBillingError("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
      }
      const counterRef = firestore.collection("tenants").doc(tenantId).collection("counters").doc("listings");
      const counterSnap = await tx.get(counterRef);
      const current = (counterSnap.data() as any)?.count ?? 0;
      const limit = subscription.limits.listingLimit;
      if (limit !== null && current + 1 > limit) {
        throw buildBillingError("Listing limit reached", "LIMIT_REACHED", 409);
      }
      tx.set(
        counterRef,
        { count: current + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
    tx.create(ref, deepStripUndefined(doc));
  });
  const createdLandDocs = (normalizedPayload.documents?.land as LandDocs | undefined) ?? undefined;
  const landDocChanges = collectLandDocChanges(undefined, createdLandDocs);
  if (landDocChanges.length > 0) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const auditRef = firestore.collection("audit_logs");
    await Promise.all(
      landDocChanges.map((change) =>
        auditRef.doc().set({
          tenantId,
          actorUid: user.uid,
          actorRole: user.role,
          action: "LISTING_DOC_UPLOADED",
          entityType: "listing",
          entityId: listingId,
          metadata: { slot: change.slot, objectPath: change.after?.objectPath || null },
          createdAt: now
        })
      )
    );
  }
  return { listingId };
}

export async function updateProperty(input: {
  tenantId: string;
  propertyId: string;
  body: PatchPropertyInput;
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const existing = snap.data() as ListingDoc | undefined;
  if (!existing) throw new Error("Not found");

  if (existing.createdBy?.uid && existing.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }
    if (isOwner(user.role) && existing.tenantId !== tenantId) {
      throw new Error("Forbidden");
    }
    if (isOwner(user.role) && existing.mode !== "independent") {
      throw new Error("Only independent listings are allowed for owners");
    }
  if (isOwner(user.role) && existing.visibility === "published") {
    throw new Error("Unpublish before editing.");
  }

  const tenantSnap = await firestore.collection("tenants").doc(tenantId).get();
  const tenantType = (tenantSnap.data() as any)?.type as string | undefined;

  const merged = mergeListing(existing, body);
  ensureMediaPathsSafe(tenantId, merged.media);
  await assertLandDocsAllowed({
    tenantId,
    listingId: propertyId,
    tenantType,
    propertyType: merged.propertyType,
    user,
    documents: body.documents as any
  });
  const existingLandDocs = (existing.documents?.land as LandDocs | undefined) ?? undefined;
  const nextLandDocs = (merged.documents?.land as LandDocs | undefined) ?? undefined;
  const landDocChanges = body.documents?.land ? collectLandDocChanges(existingLandDocs, nextLandDocs) : [];
  const validated = CreatePropertySchema.parse(toListingPayload(merged));
  const now = admin.firestore.FieldValue.serverTimestamp();
  const shouldResetSubmission = existing.listingStatus === "submitted" && isOwner(user.role);
  await ref.set(
    deepStripUndefined({
      ...validated,
      id: propertyId,
      tenantId,
      ...(shouldResetSubmission
        ? {
            listingStatus: "draft",
            visibility: "draft",
            "moderation.verificationStatus": "draft",
            "moderation.requiredAction": "owner_resubmit",
            "moderation.approvedBy": null,
            "moderation.approvedAt": null,
            "moderation.remarks": null
          }
        : {}),
      updatedAt: now
    }),
    { merge: true }
  );

  const fresh = await ref.get();
  if (fresh.exists) {
    await syncPublicProperty(propertyId, fresh.data());
  }
  if (landDocChanges.length > 0) {
    const auditRef = firestore.collection("audit_logs");
    await Promise.all(
      landDocChanges.map((change) => {
        const action = change.after?.objectPath ? "LISTING_DOC_UPLOADED" : "LISTING_DOC_REMOVED";
        const objectPath = change.after?.objectPath || change.before?.objectPath || null;
        return auditRef.doc().set({
          tenantId,
          actorUid: user.uid,
          actorRole: user.role,
          action,
          entityType: "listing",
          entityId: propertyId,
          metadata: { slot: change.slot, objectPath },
          createdAt: now
        });
      })
    );
  }

  return { listingId: propertyId };
}

function validateSubmitPayload(data: ListingDoc) {
  try {
    SubmitPropertySchema.parse(toListingPayload(data));
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = err.errors.map((e) => e.path.filter((p) => p !== undefined).join(".")).filter(Boolean);
      throw buildValidationError(err.errors.map((e) => e.message).join(", "), fields, "VALIDATION_FAILED", 400);
    }
    throw err;
  }
  const missing = collectLandPlotMissingFields(data);
  if (missing.length) {
    throw buildValidationError("Missing required land/plot fields", missing, "VALIDATION_FAILED", 400);
  }
}

function validateOwnerPublish(data: ListingDoc) {
  const issues: string[] = [];
  if (!data.title || data.title.trim().length < 3) issues.push("Title is required");
  if (!data.location?.citySlug) issues.push("City is required");
  if (!data.location?.locality) issues.push("Locality is required");
  if (!data.contact?.phone) issues.push("Contact phone is required");
  if (data.type !== "sale" && data.type !== "rent") issues.push("Listing type must be sale or rent");
  if (data.type === "sale" && !data.pricing?.totalPrice) issues.push("Total price is required for sale");
  if (data.type === "rent" && !data.pricing?.rentPerMonth) issues.push("Monthly rent is required for rent");
  const descriptionText = getDescriptionText(data.description);
  if (!descriptionText || descriptionText.trim().length < 30) {
    issues.push("Description must be at least 30 characters");
  }
    const hasHero = Boolean(data.media?.hero?.objectPath);
    const galleryCount = data.media?.gallery?.length ?? 0;
    if (!hasHero && galleryCount < 1) issues.push("At least one photo is required");
  if (data.propertyType === "land") {
    if (!data.landRecord?.mouza) issues.push("Mouza is required for land listings");
    if (!data.landRecord?.surveyOrGatNo) issues.push("Survey/Gat No is required for land listings");
    if (!data.landRecord?.taluka) issues.push("Taluka is required for land listings");
    if (!data.landRecord?.district) issues.push("District is required for land listings");
    if (!data.area?.value || data.area.value <= 0) issues.push("Area value is required for land listings");
    const unit = data.area?.unit;
    if (!unit || !["sqft", "sqm", "acre", "hectare"].includes(unit)) {
      issues.push("Area unit is required for land listings");
    }
  }
  if (data.propertyType === "plot") {
    if (!data.area?.value || data.area.value <= 0) issues.push("Area value is required for plot listings");
    const unit = data.area?.unit;
    if (!unit || !["sqft", "sqm", "acre", "hectare"].includes(unit)) {
      issues.push("Area unit is required for plot listings");
    }
  }
  if (issues.length) {
    const fields = collectLandPlotMissingFields(data);
    throw buildValidationError(issues.join(", "), fields, "VALIDATION_FAILED", 400);
  }
}

export async function listProperties(tenantId: string, user: AuthUser, query?: { mine?: boolean }) {
  assertTenantAccess(user, tenantId);
  let ref: FirebaseFirestore.Query = listingsCollection(tenantId);
  if (isOwner(user.role)) {
    ref = ref.where("createdBy.uid", "==", user.uid);
  } else if (query?.mine) {
    ref = ref.where("createdBy.uid", "==", user.uid);
  }
  const snap = await ref.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { items };
}

export async function getProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as ListingDoc | undefined;
  if (data && data.createdBy?.uid && data.createdBy.uid !== user.uid && isOwner(user.role)) {
    throw new Error("Forbidden");
  }
  if (data && isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  return { id: snap.id, ...snap.data() };
}

export async function validateProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && isOwner(user.role)) {
    throw new Error("Forbidden");
  }
  if (data && isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }

  let canSubmit = true;
  let canPublish = true;
  const missing: string[] = [];
  const appendMissing = (fields?: string[]) => {
    if (!fields || fields.length === 0) return;
    fields.forEach((field) => {
      if (!missing.includes(field)) missing.push(field);
    });
  };
  try {
    validateSubmitPayload(data);
  } catch (err: any) {
    canSubmit = false;
    appendMissing(err?.fields);
  }
  try {
    if (isOwner(user.role)) {
      validateOwnerPublish(data);
    } else {
      validateSubmitPayload(data);
    }
  } catch (err: any) {
    canPublish = false;
    appendMissing(err?.fields);
  }

  return { canSubmit, canPublish, missing };
}

export async function submitProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }

  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }

  validateSubmitPayload(data);
  if (data.mode === "independent") {
    validateOwnerPublish(data);
  }

  const gallery = data.media?.gallery || [];
  const heroMissing = !data.media?.hero?.objectPath;
  const nextHero = heroMissing && gallery.length > 0 ? { objectPath: gallery[0].objectPath } : null;

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.update(
    deepStripUndefined({
      listingStatus: "submitted",
      visibility: "draft",
      "moderation.verificationStatus": "pending",
      "moderation.requiredAction": "tenant_admin_review",
      "moderation.approvedBy": null,
      "moderation.approvedAt": null,
      "moderation.remarks": null,
      ...(nextHero ? { "media.hero": nextHero } : {}),
      updatedAt: now
    })
  );

  const fresh = await ref.get();
  await syncPublicProperty(propertyId, fresh.data());

  return { status: "pending", visibility: "draft" };
}

export async function approveProperty(input: {
  tenantId: string;
  propertyId: string;
  user: AuthUser;
  body: ApprovePropertyInput;
}) {
  const { tenantId, propertyId, user, body } = input;
  assertTenantAccess(user, tenantId);
  if (!isAdmin(user.role)) throw new Error("Forbidden");
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  if (data.moderation?.verificationStatus !== "pending") {
    throw new Error("Only pending listings can be approved");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.update(
    deepStripUndefined({
      listingStatus: "approved",
      visibility: "published",
      "moderation.verificationStatus": "approved",
      "moderation.requiredAction": "none",
      "moderation.approvedBy": user.uid,
      "moderation.approvedAt": now,
      "moderation.remarks": body.remarks ?? null,
      updatedAt: now
    })
  );

  const fresh = await ref.get();
  await syncPublicProperty(propertyId, fresh.data());
  return { status: "approved", visibility: "published" };
}

export async function unpublishProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  await ref.update(
    deepStripUndefined({
      visibility: "draft",
      "moderation.requiredAction": "none",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  );
  await removePublicProperty(propertyId);
  return { status: "unpublished" };
}

export async function deleteProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  if (data.visibility === "published") {
    throw new Error("Unpublish before deleting.");
  }
  await firestore.runTransaction(async (tx) => {
    const currentSnap = await tx.get(ref);
    const current = currentSnap.data() as ListingDoc | undefined;
    if (!current) return;
    tx.delete(ref);

    const tenantSnap = await tx.get(firestore.collection("tenants").doc(tenantId));
    const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
    const enforce = shouldEnforce(user, tenantType);
    if (!enforce) return;
    const counterRef = firestore.collection("tenants").doc(tenantId).collection("counters").doc("listings");
    const featuredCounterRef = firestore
      .collection("tenants")
      .doc(tenantId)
      .collection("counters")
      .doc("featuredListings");
    const counterSnap = await tx.get(counterRef);
    const count = (counterSnap.data() as any)?.count ?? 0;
    const nextCount = Math.max(0, count - 1);
    tx.set(
      counterRef,
      { count: nextCount, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    if (current.featured === true) {
      const featuredSnap = await tx.get(featuredCounterRef);
      const featuredCount = (featuredSnap.data() as any)?.count ?? 0;
      const nextFeaturedCount = Math.max(0, featuredCount - 1);
      tx.set(
        featuredCounterRef,
        { count: nextFeaturedCount, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  });
  await removePublicProperty(propertyId);
  return { ok: true };
}

export async function publishProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role)) {
    if (data.mode !== "independent") {
      throw new Error("Only independent listings are allowed for owners");
    }
    if (data.listingStatus !== "submitted") {
      throw new Error("Submit listing for review before publishing");
    }
    const kycStatus = await getOwnerKycStatus(tenantId, user.uid);
    if (kycStatus !== "phone_verified" && kycStatus !== "verified") {
      throw new Error("Phone KYC required to publish");
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  if (isOwner(user.role)) {
    const gallery = data.media?.gallery || [];
    const heroMissing = !data.media?.hero?.objectPath;
    const nextHero = heroMissing && gallery.length > 0 ? { objectPath: gallery[0].objectPath } : null;
    validateOwnerPublish(data);
    await ref.update(
      deepStripUndefined({
      visibility: "published",
      ...(nextHero ? { "media.hero": nextHero } : {}),
      updatedAt: now
      })
    );
  } else {
    const subscription = await requireCapability(tenantId, user, "PUBLISH");
    const agentSubscription = await fetchAgentSubscription(tenantId, user.uid);
    const agentStatus = agentSubscription?.status || "trial";
    const agentPlan = agentSubscription?.planCode || "trial";
    const isActiveAgentPlan = agentStatus === "active";
    const isTrial = !isActiveAgentPlan || agentPlan === "trial";
    if (isTrial && subscription?.limits?.publishAllowed !== false) {
      const publishedCount = await countPublishedListingsForUser(tenantId, user.uid);
      if (publishedCount >= TRIAL_PUBLISH_LIMIT) {
        logger.warn("Trial publish limit reached", {
          tenantId,
          uid: user.uid,
          publishedCount,
          limit: TRIAL_PUBLISH_LIMIT
        });
        throw buildBillingError("Publish limit reached for trial plan", "PLAN_LIMIT_REACHED", 403);
      }
    }
    validateSubmitPayload(data);
    await ref.update(
      deepStripUndefined({
      listingStatus: "approved",
      visibility: "published",
      "moderation.verificationStatus": "approved",
      "moderation.requiredAction": "none",
      "moderation.approvedBy": user.uid,
      "moderation.approvedAt": now,
      updatedAt: now
      })
    );
  }

  const fresh = await ref.get();
  await syncPublicProperty(propertyId, fresh.data());
  return { status: "published", visibility: "published" };
}

export async function rejectProperty(input: {
  tenantId: string;
  propertyId: string;
  body: RejectPropertyInput;
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");
  const createdBy = data.createdBy?.uid;
  if (createdBy && createdBy !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.update(
    deepStripUndefined({
      listingStatus: "rejected",
      visibility: "draft",
      "moderation.verificationStatus": "rejected",
      "moderation.requiredAction": "none",
      "moderation.approvedBy": null,
      "moderation.approvedAt": null,
      "moderation.remarks": body.reason,
      updatedAt: now
    })
  );
  await removePublicProperty(propertyId);
  return { status: "rejected", visibility: "draft" };
}

export async function setFeaturedProperty(input: {
  tenantId: string;
  propertyId: string;
  body: FeaturePropertyInput;
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  assertTenantAccess(user, tenantId);
  if (!isAdmin(user.role)) throw new Error("Forbidden");

  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");

  await requireOnboardingIfPremier(tenantId, user);

  const counterRef = firestore.collection("tenants").doc(tenantId).collection("counters").doc("featuredListings");
  const now = admin.firestore.FieldValue.serverTimestamp();

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Not found");
    const data = snap.data() as ListingDoc;

    if (body.featured && data.featured === true) {
      return;
    }
    if (!body.featured && data.featured !== true) {
      return;
    }

    const tenantSnap = await tx.get(firestore.collection("tenants").doc(tenantId));
    const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
    const enforce = shouldEnforce(user, tenantType);
    if (enforce) {
      const subscription = await getOrCreateSubscriptionInTransaction(tx, tenantId, user);
      const active = subscription.status === "active" || subscription.status === "trialing";
      if (!active || subscription.validTill.toDate().getTime() < Date.now()) {
        throw buildBillingError("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
      }
      if (!subscription.limits.featuredAllowed) {
        throw buildBillingError("Featured listings not allowed for current plan", "FEATURE_NOT_ALLOWED", 403);
      }
      if (subscription.limits.featuredLimit !== null) {
        const counterSnap = await tx.get(counterRef);
        const current = (counterSnap.data() as any)?.count ?? 0;
        if (body.featured && current + 1 > subscription.limits.featuredLimit) {
          throw buildBillingError("Featured listing limit reached", "LIMIT_REACHED", 409);
        }
        if (body.featured) {
          tx.set(
            counterRef,
            { count: current + 1, updatedAt: now },
            { merge: true }
          );
        } else {
          const nextCount = Math.max(0, current - 1);
          tx.set(
            counterRef,
            { count: nextCount, updatedAt: now },
            { merge: true }
          );
        }
      } else {
        if (body.featured) {
          const counterSnap = await tx.get(counterRef);
          const current = (counterSnap.data() as any)?.count ?? 0;
          tx.set(
            counterRef,
            { count: current + 1, updatedAt: now },
            { merge: true }
          );
        } else {
          const counterSnap = await tx.get(counterRef);
          const current = (counterSnap.data() as any)?.count ?? 0;
          const nextCount = Math.max(0, current - 1);
          tx.set(
            counterRef,
            { count: nextCount, updatedAt: now },
            { merge: true }
          );
        }
      }
    }

    tx.set(
      ref,
      {
        featured: body.featured,
        featuredAt: body.featured ? now : null,
        updatedAt: now
      },
      { merge: true }
    );
  });

  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: body.featured ? "LISTING_FEATURED_ON" : "LISTING_FEATURED_OFF",
    entityType: "listing",
    entityId: propertyId,
    metadata: {},
    createdAt: now
  });

  return { featured: body.featured };
}

export async function setVisibilityProperty(input: {
  tenantId: string;
  propertyId: string;
  body: SetVisibilityInput;
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  assertTenantAccess(user, tenantId);
  if (!isAdmin(user.role)) throw new Error("Forbidden");
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = snap.data() as ListingDoc | undefined;
  if (!data) throw new Error("Not found");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const visibility = body.visibility;

  if (visibility === "published" && data.moderation?.verificationStatus !== "approved") {
    throw new Error("Only approved listings can be published");
  }

  await ref.update(
    deepStripUndefined({
      visibility,
      updatedAt: now
    })
  );

  const fresh = await ref.get();
  const freshData = fresh.data();
  if (!freshData) return { visibility };

  const isPublished =
    visibility === "published" && freshData.moderation?.verificationStatus === "approved";
  if (isPublished) {
    await syncPublicProperty(propertyId, freshData);
  } else {
    await removePublicProperty(propertyId);
  }

  return { visibility, status: freshData.moderation?.verificationStatus };
}

function buildPublicProjection(propertyId: string, data: any) {
  const pricing = data.pricing ?? {};
  const rateUnit = pricing.rateUnit ?? null;
  const pricePerSqFt =
    rateUnit && rateUnit !== "sqft" ? null : pricing.pricePerSqFt ?? null;
  return {
    listingId: propertyId,
    tenantId: data.tenantId,
    mode: data.mode,
    projectId: data.projectId ?? null,
    unitType: data.unitType ?? null,
    availability: data.availability ?? null,
    title: data.title,
    type: data.type,
    propertyType: data.propertyType,
    description: data.description ?? null,
    pricing: {
      ...pricing,
      rate: pricing.rate ?? null,
      rateUnit,
      pricePerSqFt
    },
    location: data.location
      ? {
          citySlug: data.location.citySlug ?? null,
          locality: data.location.locality ?? null,
          addressLine: data.location.addressLine ?? null,
          pincode: data.location.pincode ?? null,
          geo: data.location.geo ?? null
        }
      : null,
    specs: data.specs ?? {},
    plotInfo: data.plotInfo ?? null,
    landRecord: data.landRecord ?? null,
    unit: data.unit ?? null,
    area: data.area ?? null,
    media: data.media ?? {},
    contact: data.contact ?? null,
    rental: data.rental ?? null,
    isPublished: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

export async function listPublicProperties(query: any) {
  let ref: FirebaseFirestore.Query = firestore.collection("publicProperties");
  if (query.citySlug) ref = ref.where("location.citySlug", "==", query.citySlug);
  if (query.propertyType) ref = ref.where("propertyType", "==", query.propertyType);
  if (query.type) ref = ref.where("type", "==", query.type);
  if (query.mode) ref = ref.where("mode", "==", query.mode);
  if (query.projectId) ref = ref.where("projectId", "==", query.projectId);
  const snap = await ref.limit(query.limit ?? 20).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { items };
}

export async function getPublicProperty(propertyId: string) {
  const snap = await firestore.collection("publicProperties").doc(propertyId).get();
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

async function syncPublicProperty(propertyId: string, data: any) {
  // Phase-1 owner auto-publish: visibility is the source of truth for public sync.
  const isPublished = data?.visibility === "published";
  if (isPublished) {
    logger.info("Public property upserted", { propertyId, visibility: data?.visibility });
    await upsertPublicProperty(propertyId, buildPublicProjection(propertyId, data));
  } else {
    logger.info("Public property removed", {
      propertyId,
      visibility: data?.visibility,
      moderationStatus: data?.moderation?.verificationStatus
    });
    await removePublicProperty(propertyId);
  }
}
