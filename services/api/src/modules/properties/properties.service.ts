import admin from "firebase-admin";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";
import { removePublicProperty, upsertPublicProperty } from "../../services/publicSync.service";
import { createSignedGetUrls, createSignedPutUrl } from "../media/media.service";
import { logger } from "../../utils/logger";
import { isSafeObjectPath, requireTenantScopedPath } from "../../utils/objectPath";
import { slugify } from "../../utils/slugify";
import { AuthUser } from "../../types";
import { TRIAL_PUBLISH_LIMIT } from "../billing/plans";
import { fetchAgentSubscription } from "../agent/agent.subscription.service";
import { fetchAgentProfile } from "../agent/agent.service";
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
  DealIntentSchema,
  PatchPropertyInput,
  PublishStateSchema,
  RejectPropertyInput,
  FeaturePropertyInput,
  SetVisibilityInput,
  SubmitPropertySchema
} from "./properties.schemas";
import { ZodError } from "zod";
import {
  ensureExpiresAtByDealIntent,
  inferDefaultExpiresAtForDealIntent,
  isPubliclyVisibleProperty,
  parseExpiryDate
} from "./properties-expiry";
import { DEFAULTS } from "../../constants/propertyEnums";
import { observeCompatibility } from "../monetization/compat.service";
import {
  assertOwnerActiveListingCap,
  ensureOwnerFreeEntitlementForListing,
  isOwnerMonetizationEnforced,
  syncOwnerListingBoostCache
} from "../monetization/owner.service";
import {
  assertAgentPublishEntitlement,
  isAgentMonetizationEnforced,
  syncAgentListingMonetizationCache
} from "../monetization/agent.service";

type ListingDoc = CreatePropertyInput & {
  id: string;
  tenantId: string;
  publishState: "draft" | "published" | "unpublished";
  recordStatus?: "active" | "inactive";
  featured?: boolean;
  featuredAt?: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp | null;
  location?: any;
  rentalDetails?: any;
  saleDetails?: any;
  expiresAt?: string | null;
  visibility?: any;
  listingStatus?: any;
  moderation?: any;
  createdByUid?: string;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  createdBy: { uid: string; email: string };
};

function isRentLikeListing(data: any) {
  return data?.dealIntent === "rent" || data?.dealIntent === "lease" || data?.propertyType === "pg";
}

function inferPublishState(data: Record<string, any>) {
  if (data.publishState === "published" || data.publishState === "draft" || data.publishState === "unpublished") {
    return data.publishState;
  }
  if (data.visibility === "published" || data.visibility === "public") return "published";
  if (data.visibility === "internal") return "unpublished";
  if (data.listingStatus === "approved" && data.visibility !== "published") return "unpublished";
  return "draft";
}

function normalizeLegacyListing<T extends Record<string, any> | undefined>(data: T): T {
  if (!data || typeof data !== "object") return data;

  const next = {
    ...data,
    saleDetails: data.saleDetails ? { ...data.saleDetails } : undefined,
    pricing: data.pricing ? { ...data.pricing } : data.pricing,
    rental: data.rental ? { ...data.rental } : data.rental,
    rentalDetails: data.rentalDetails
      ? {
          ...data.rentalDetails,
          pricing: data.rentalDetails.pricing ? { ...data.rentalDetails.pricing } : data.rentalDetails.pricing,
          availability: data.rentalDetails.availability
            ? { ...data.rentalDetails.availability }
            : data.rentalDetails.availability,
          suitability: data.rentalDetails.suitability
            ? { ...data.rentalDetails.suitability }
            : data.rentalDetails.suitability,
          furnishing: data.rentalDetails.furnishing
            ? { ...data.rentalDetails.furnishing }
            : data.rentalDetails.furnishing,
          pg: data.rentalDetails.pg ? { ...data.rentalDetails.pg } : data.rentalDetails.pg,
          commercial: data.rentalDetails.commercial
            ? { ...data.rentalDetails.commercial }
            : data.rentalDetails.commercial
        }
      : undefined
  } as Record<string, any>;

  if (next.category === "land") {
    next.category = "land_plot";
  }
  if (!next.dealIntent) {
    if (next.purpose === "pg") {
      next.dealIntent = "rent";
      next.propertyType = "pg";
    } else if (typeof next.type === "string") {
      next.dealIntent = next.type;
    } else if (typeof next.purpose === "string" && next.purpose !== "pg") {
      next.dealIntent = next.purpose;
    }
  }

  const rentalDetails = next.rentalDetails ?? {};
  const rentalPricing = { ...(rentalDetails.pricing || {}) };
  const rentalAvailability = { ...(rentalDetails.availability || {}) };
  const rentalSuitability = { ...(rentalDetails.suitability || {}) };
  if (rentalSuitability.preferredGender === "boys") rentalSuitability.preferredGender = "male";
  if (rentalSuitability.preferredGender === "girls") rentalSuitability.preferredGender = "female";
  if (rentalSuitability.genderPreference === "boys") rentalSuitability.genderPreference = "male";
  if (rentalSuitability.genderPreference === "girls") rentalSuitability.genderPreference = "female";
  const rentalFurnishing = { ...(rentalDetails.furnishing || {}) };
  const rentalPg = { ...(rentalDetails.pg || {}) };
  const rentalCommercial = { ...(rentalDetails.commercial || {}) };
  const rentalFacilities = Array.isArray(rentalDetails.facilities)
    ? [...rentalDetails.facilities]
    : [];

  if (next.propertyType === "pg" && !rentalDetails.accommodationType) {
    rentalDetails.accommodationType = "pg";
  }
  if (next.propertyType === "room" && !rentalDetails.accommodationType) {
    rentalDetails.accommodationType = "room";
  }

  if (rentalDetails.rentalType && !rentalDetails.rentalModel) {
    if (rentalDetails.rentalType === "shared_room") rentalDetails.rentalModel = "shared_room";
    else if (rentalDetails.rentalType === "single_room") rentalDetails.rentalModel = "single_room";
    else if (rentalDetails.rentalType === "pg") rentalDetails.rentalModel = "per_bed";
    else rentalDetails.rentalModel = "whole_unit";
  }
  if (rentalDetails.rentalType === "pg" && !rentalDetails.accommodationType) {
    rentalDetails.accommodationType = "pg";
  }
  if ((rentalDetails.rentalType === "shared_room" || rentalDetails.rentalType === "single_room") && !rentalDetails.accommodationType) {
    rentalDetails.accommodationType = "room";
  }
  if (!rentalDetails.accommodationType && ["flat", "house", "villa", "row_house", "studio"].includes(String(next.propertyType || ""))) {
    rentalDetails.accommodationType = "standard_home";
  }

  if (!rentalDetails.rentalType && (next.dealIntent === "rent" || next.dealIntent === "lease")) {
    const bhk =
      next.specs?.flat?.bhk ??
      next.specs?.house?.bhk ??
      next.specs?.villa?.bedrooms;
    if (bhk === 1 && next.propertyType === "studio") {
      rentalDetails.rentalType = "1rk";
    } else if (bhk === 1) {
      rentalDetails.rentalType = "1bhk";
    } else if (bhk === 2) {
      rentalDetails.rentalType = "2bhk";
    }
  }
  // Default the canonical rental model for rent/lease if older drafts did not store it.
  if (!rentalDetails.rentalModel && (next.dealIntent === "rent" || next.dealIntent === "lease")) {
    rentalDetails.rentalModel =
      rentalDetails.accommodationType === "standard_home" ? "whole_unit" : "single_room";
  }
  if (next.category === "commercial" && (next.dealIntent === "rent" || next.dealIntent === "lease")) {
    rentalDetails.rentalModel = "whole_unit";
    rentalDetails.accommodationType = undefined;
    if (rentalPricing.rentPerBed != null) {
      delete rentalPricing.rentPerBed;
    }
  }
  if (next.category === "land_plot" && (next.dealIntent === "rent" || next.dealIntent === "lease")) {
    rentalDetails.rentalModel = "whole_unit";
    rentalDetails.accommodationType = undefined;
    if (rentalPricing.rentPerBed != null) {
      delete rentalPricing.rentPerBed;
    }
  }

  if (next.pricing?.rentPerMonth && rentalPricing.monthlyRent == null) {
    rentalPricing.monthlyRent = next.pricing.rentPerMonth;
  }
  if (next.pricing?.deposit && rentalPricing.deposit == null) {
    rentalPricing.deposit = next.pricing.deposit;
  }
  if (next.pricing?.maintenanceMonthly && rentalPricing.maintenanceMonthly == null) {
    rentalPricing.maintenanceMonthly = next.pricing.maintenanceMonthly;
  }
  if (next.rental?.leaseTermMonths && rentalPricing.lockInMonths == null) {
    rentalPricing.lockInMonths = next.rental.leaseTermMonths;
  }
  if (next.rental?.availableFrom && rentalAvailability.availableFrom == null) {
    rentalAvailability.availableFrom = next.rental.availableFrom;
  }
  if (next.rental?.maintenance && rentalPricing.maintenanceMonthly == null) {
    rentalPricing.maintenanceMonthly = next.rental.maintenance;
  }
  if (next.rental?.preferredTenants && !Array.isArray(rentalSuitability.suitableFor)) {
    if (next.rental.preferredTenants === "family") rentalSuitability.suitableFor = ["family"];
    if (next.rental.preferredTenants === "bachelor") rentalSuitability.suitableFor = ["bachelor"];
    if (next.rental.preferredTenants === "any") rentalSuitability.suitableFor = ["family", "bachelor"];
  }

  const residentialFurnishing =
    next.specs?.flat?.furnishing ??
    next.specs?.house?.furnishing ??
    next.specs?.villa?.furnishing;
  if (residentialFurnishing && rentalFurnishing.level == null) {
    rentalFurnishing.level =
      residentialFurnishing === "semi"
        ? "semi_furnished"
        : residentialFurnishing === "fully"
        ? "fully_furnished"
        : residentialFurnishing;
  }

  if (next.specs?.commercial?.fitOutStatus && rentalCommercial.fitoutStatus == null) {
    rentalCommercial.fitoutStatus = next.specs.commercial.fitOutStatus;
  }
  if (next.specs?.commercial?.powerLoadKw && rentalCommercial.powerLoadKw == null) {
    rentalCommercial.powerLoadKw = next.specs.commercial.powerLoadKw;
  }
  if (next.specs?.commercial?.dedicatedParking != null && rentalCommercial.parkingCount == null) {
    rentalCommercial.parkingCount = next.specs.commercial.dedicatedParking;
  }
  if (next.specs?.commercial?.tenancyType === "rent" && !next.dealIntent) {
    next.dealIntent = "rent";
  }
  if (next.specs?.commercial?.tenancyType === "lease" && !next.dealIntent) {
    next.dealIntent = "lease";
  }

  if (rentalAvailability.totalBeds != null && rentalAvailability.availableBeds == null) {
    const occupiedBeds = Number(rentalAvailability.occupiedBeds);
    if (Number.isFinite(occupiedBeds)) {
      rentalAvailability.availableBeds = Math.max(0, rentalAvailability.totalBeds - occupiedBeds);
    }
  }

  const nextRentalDetails = deepStripUndefined({
    ...rentalDetails,
    facilities: rentalFacilities,
    pricing: rentalPricing,
    availability: rentalAvailability,
    suitability: rentalSuitability,
    furnishing: rentalFurnishing,
    pg: rentalPg,
    commercial: rentalCommercial
  });

  if (nextRentalDetails) {
    next.rentalDetails = nextRentalDetails;
  }

  if (!next.saleDetails) {
    const pricing = next.pricing || {};
    const price = next.price || {};
    if (
      pricing.totalPrice != null ||
      pricing.pricePerSqFt != null ||
      pricing.maintenanceMonthly != null ||
      pricing.negotiable != null ||
      next.priceOnRequest != null
    ) {
      next.saleDetails = deepStripUndefined({
        saleType: next.saleType,
        priceOnRequest: next.priceOnRequest,
        totalPrice: pricing.totalPrice ?? price.amount,
        ratePerSqFt: pricing.pricePerSqFt ?? pricing.rate,
        priceUnit: price.unit ?? (pricing.rate ? "sqft" : pricing.totalPrice ? "total" : undefined),
        allInclusivePrice: pricing.allInclusivePrice,
        maintenanceMonthly: pricing.maintenanceMonthly,
        negotiable: pricing.negotiable
      });
    }
  }

  next.publishState = inferPublishState(next);
  if (!next.expiresAt) {
    next.expiresAt = inferDefaultExpiresAtForDealIntent(next.dealIntent);
  }

  return next as T;
}

function applyExpiryPolicy<T extends Record<string, any> | undefined>(data: T): T {
  if (!data || typeof data !== "object") return data;
  return ensureExpiresAtByDealIntent(normalizeLegacyListing(data)) as T;
}

function listingsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("listings");
}

function approvalsCollection() {
  return firestore.collection("approvals");
}

async function createListingApprovalIfMissing(input: {
  tenantId: string;
  propertyId: string;
  user: AuthUser;
}) {
  const existing = await approvalsCollection()
    .where("tenantId", "==", input.tenantId)
    .where("entityType", "==", "listing")
    .where("entityId", "==", input.propertyId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (!existing.empty) return;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const nowTimestamp = admin.firestore.Timestamp.now();
  const ref = approvalsCollection().doc();
  await ref.set({
    id: ref.id,
    tenantId: input.tenantId,
    entityType: "listing",
    entityId: input.propertyId,
    status: "pending",
    requestedByUid: input.user.uid,
    requestedAt: now,
    history: [
      {
        action: "requested",
        byUid: input.user.uid,
        byRole: input.user.role || null,
        at: nowTimestamp
      }
    ]
  });
}

export async function countPublishedListingsForUser(tenantId: string, userId: string) {
  const snap = await listingsCollection(tenantId)
    .where("publishState", "==", "published")
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

function isAgent(role: string) {
  return role === "agent" || role === "broker";
}

function canManageEnterpriseListing(role: string) {
  return role === "tenant_admin" || role === "platform_admin" || role === "enterprise";
}

type PublishState = "draft" | "published" | "unpublished";

function getPublishState(data: Pick<ListingDoc, "publishState"> & Record<string, any>): PublishState {
  return inferPublishState(data);
}

function enforcePublishStateTransition(currentState: PublishState, targetState: PublishState) {
  const allowed =
    (currentState === "draft" && targetState === "published") ||
    (currentState === "draft" && targetState === "draft") ||
    (currentState === "unpublished" && targetState === "published") ||
    (currentState === "published" && targetState === "unpublished") ||
    (currentState === "unpublished" && targetState === "draft");
  if (!allowed) {
    throw buildValidationError(
      `Invalid publish state transition: ${currentState} -> ${targetState}`,
      ["publishState"],
      "INVALID_PUBLISH_STATE_TRANSITION",
      409
    );
  }
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

function ensureMediaPathsSafe(tenantId: string, media?: any, mediaItems?: any[]) {
  const paths: string[] = [];
  if (media?.hero?.objectPath) paths.push(media.hero.objectPath);
  media?.gallery?.forEach((m: any) => m?.objectPath && paths.push(m.objectPath));
  media?.documents?.forEach((m: any) => m?.objectPath && paths.push(m.objectPath));
  mediaItems?.forEach((item) => item?.url && paths.push(item.url));
  paths.forEach((p) => {
    if (/^https?:\/\//i.test(p)) {
      throw new Error("Invalid media object path");
    }
    if (!isSafeObjectPath(p)) {
      throw new Error("Invalid media object path");
    }
    requireTenantScopedPath(tenantId, p);
  });
}

const LAND_DOC_SLOTS = ["extract712", "naOrder", "other"] as const;
const LAND_DOC_CONTENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MEDIA_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MEDIA_DOC_CONTENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DOC_BYTES = 20 * 1024 * 1024;

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
  if (data.propertyType === "land" || data.propertyType === "plot") {
    if (!data.landRecord?.mouza) missing.push("landRecord.mouza");
    if (!data.landRecord?.surveyOrGatNo) missing.push("landRecord.surveyOrGatNo");
    if (!data.landRecord?.taluka) missing.push("landRecord.taluka");
    if (!data.landRecord?.district) missing.push("landRecord.district");
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

function sanitizeFileName(name: string) {
  return name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120) || "upload";
}

function buildMediaObjectPath(tenantId: string, listingId: string, kind: "image" | "doc", fileName: string) {
  const safeName = sanitizeFileName(fileName);
  const prefix = kind === "doc" ? "docs" : "gallery";
  return `tenants/${tenantId}/listings/${listingId}/media/${prefix}/${Date.now()}-${safeName}`;
}

async function requireListingWriteAccess(input: {
  tenantId: string;
  propertyId: string;
  user: AuthUser;
}) {
  const { tenantId, propertyId, user } = input;
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
  if (isOwner(user.role) && getPublishState(existing) === "published") {
    throw new Error("Unpublish before editing.");
  }
  return { ref, existing };
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

function normalizeSpecs(input?: any) {
  if (!input || typeof input !== "object") return input;
  const flat = input.flat;
  if (flat && typeof flat === "object") {
    const { ageYears, ...rest } = flat;
    if (ageYears != null && rest.buildingAgeYears == null) {
      return { ...input, flat: { ...rest, buildingAgeYears: ageYears } };
    }
  }
  return input;
}

function buildListingDoc(input: CreatePropertyInput, user: AuthUser, tenantId: string, listingId: string): ListingDoc {
  const now = admin.firestore.FieldValue.serverTimestamp();
  return normalizeLegacyListing({
    ...input,
    location: input.location ? sanitizeLocation(input.location) : undefined,
    id: listingId,
    tenantId,
    publishState: input.publishState ?? "draft",
    recordStatus: input.recordStatus ?? "active",
    createdAt: now,
    updatedAt: now,
    createdBy: { uid: user.uid, email: user.email }
  }) as ListingDoc;
}

function mergePrice(
  existing?: { amount: number; currency: "INR"; unit?: "total" | "per_sqft" },
  patch?: { amount?: number; currency?: "INR"; unit?: "total" | "per_sqft" }
) {
  if (!patch) return existing;
  const nextAmount = typeof patch.amount === "number" ? patch.amount : existing?.amount;
  if (typeof nextAmount !== "number") return existing;
  return {
    amount: nextAmount,
    currency: patch.currency ?? existing?.currency ?? "INR",
    unit: patch.unit ?? existing?.unit
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
  const { mediaItems: patchMediaItems, ...patchRest } = patch;
  return normalizeLegacyListing({
    ...existing,
    ...patchRest,
    saleDetails: patch.saleDetails ? { ...(existing.saleDetails || {}), ...patch.saleDetails } : existing.saleDetails,
    amenities: patch.amenities ?? existing.amenities,
    highlights: patch.highlights ?? existing.highlights,
    contact: patch.contact ? { ...(existing.contact || {}), ...patch.contact } : existing.contact,
    rentalDetails: patch.rentalDetails
      ? {
          ...(existing.rentalDetails || {}),
          ...patch.rentalDetails,
          pricing: patch.rentalDetails.pricing
            ? { ...(existing.rentalDetails?.pricing || {}), ...patch.rentalDetails.pricing }
            : existing.rentalDetails?.pricing,
          availability: patch.rentalDetails.availability
            ? { ...(existing.rentalDetails?.availability || {}), ...patch.rentalDetails.availability }
            : existing.rentalDetails?.availability,
          suitability: patch.rentalDetails.suitability
            ? { ...(existing.rentalDetails?.suitability || {}), ...patch.rentalDetails.suitability }
            : existing.rentalDetails?.suitability,
          pg: patch.rentalDetails.pg
            ? { ...(existing.rentalDetails?.pg || {}), ...patch.rentalDetails.pg }
            : existing.rentalDetails?.pg,
          room: patch.rentalDetails.room
            ? { ...(existing.rentalDetails?.room || {}), ...patch.rentalDetails.room }
            : existing.rentalDetails?.room,
          building: patch.rentalDetails.building
            ? { ...(existing.rentalDetails?.building || {}), ...patch.rentalDetails.building }
            : existing.rentalDetails?.building
        }
      : existing.rentalDetails,
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
    media: stripLegacyMediaFields(mergedMedia),
    mediaItems: patchMediaItems ? (patchMediaItems as ListingDoc["mediaItems"]) : existing.mediaItems,
    unit: patch.unit
      ? {
          ...(existing.unit || {}),
          ...patch.unit,
          plot: patch.unit.plot ?? existing.unit?.plot,
          flat: patch.unit.flat ?? existing.unit?.flat,
          villa: patch.unit.villa ?? existing.unit?.villa
        }
      : existing.unit
  }) as ListingDoc;
}

function toListingPayload(data: any): CreatePropertyInput {
  const normalized = normalizeLegacyListing(data);
  return {
    mode: normalized.mode,
    dealIntent: normalized.dealIntent,
    category: normalized.category,
    categoryType: normalized.categoryType,
    propertyType: normalized.propertyType,
    title: normalized.title,
    description: normalized.description,
    brokeragePartnerId: normalized.brokeragePartnerId,
    saleDetails: normalized.saleDetails,
    amenities: normalized.amenities,
    highlights: normalized.highlights,
    location: normalized.location,
    enterpriseId: normalized.enterpriseId,
    publishState: normalized.publishState,
    recordStatus: normalized.recordStatus,
    source: normalized.source,
    internalReferenceId: normalized.internalReferenceId,
    ownerOrBuilderName: normalized.ownerOrBuilderName,
    assignedToUid: normalized.assignedToUid,
    tags: normalized.tags,
    leadPriority: normalized.leadPriority,
    expiryDate: normalized.expiryDate,
    specs: normalized.specs,
    plotInfo: normalized.plotInfo,
    landRecord: normalized.landRecord,
    area: normalized.area,
    contact: normalized.contact,
    rentalDetails: normalized.rentalDetails,
    media: normalized.media,
    mediaItems: normalized.mediaItems,
    coverMediaId: normalized.coverMediaId,
    documents: normalized.documents,
    projectId: normalized.projectId,
    unitType: normalized.unitType,
    unit: normalized.unit,
    availability: normalized.availability,
    ownerConsent: normalized.ownerConsent,
    ownerConsentMode: normalized.ownerConsentMode,
    exclusiveListing: normalized.exclusiveListing,
    brokerageApplicable: normalized.brokerageApplicable,
    brokerageType: normalized.brokerageType,
    brokerageValue: normalized.brokerageValue,
    brokerageNotes: normalized.brokerageNotes,
    internalNotes: normalized.internalNotes,
    expiresAt: normalized.expiresAt
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
    landmark: location.landmark,
    showExactAddress: location.showExactAddress,
    mouza: location.mouza,
    tahsil: location.tahsil,
    district: location.district,
    state: location.state,
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
  const hasEnterpriseFields = [
    payload.enterpriseId,
    payload.publishState,
    payload.recordStatus,
    payload.source,
    payload.assignedToUid,
    payload.tags,
    payload.leadPriority,
    payload.expiryDate
  ].some((value) => value !== undefined);
  if (!canManageEnterpriseListing(user.role) && hasEnterpriseFields) {
    throw new Error("Forbidden");
  }
  if (user.role === "enterprise" && !payload.enterpriseId) {
    throw new Error("enterpriseId is required for enterprise listings");
  }
  const normalizedPayload = {
    ...payload,
    location: payload.location ? sanitizeLocation(payload.location) : undefined,
    specs: payload.specs ? normalizeSpecs(payload.specs) : undefined,
    media: payload.media ? stripLegacyMediaFields(normalizeMediaInput(payload.media)) : undefined
  };
  const contractPayload = normalizeLegacyListing(normalizedPayload) as CreatePropertyInput;
  if (isOwner(user.role) && payload.mode !== "independent") {
    throw new Error("Only independent listings are allowed for owners");
  }
  if (isOwner(user.role) && isOwnerMonetizationEnforced()) {
    await assertOwnerActiveListingCap({
      tenantId,
      ownerUid: user.uid
    });
  }
  ensureMediaPathsSafe(tenantId, contractPayload.media, contractPayload.mediaItems);

  const ref = listingsCollection(tenantId).doc();
  const listingId = ref.id;
  const tenantSnap = await firestore.collection("tenants").doc(tenantId).get();
  const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
  await assertLandDocsAllowed({
    tenantId,
    listingId,
    tenantType,
    propertyType: contractPayload.propertyType,
    user,
    documents: contractPayload.documents as any
  });
  const doc = buildListingDoc(contractPayload as CreatePropertyInput, user, tenantId, listingId);
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
  const createdLandDocs = (contractPayload.documents?.land as LandDocs | undefined) ?? undefined;
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
  if (isOwner(user.role) && existing.publishState === "published") {
    throw new Error("Unpublish before editing.");
  }
  const hasEnterpriseFields = [
    body.enterpriseId,
    body.publishState,
    body.recordStatus,
    body.source,
    body.assignedToUid,
    body.tags,
    body.leadPriority,
    body.expiryDate
  ].some((value) => value !== undefined);
  if (!canManageEnterpriseListing(user.role) && hasEnterpriseFields) {
    throw new Error("Forbidden");
  }

  const tenantSnap = await firestore.collection("tenants").doc(tenantId).get();
  const tenantType = (tenantSnap.data() as any)?.type as string | undefined;

  const normalizedPatch = normalizeLegacyListing(
    body.specs ? { ...body, specs: normalizeSpecs(body.specs) } : body
  ) as PatchPropertyInput;
  const merged = normalizeLegacyListing(mergeListing(existing, normalizedPatch)) as ListingDoc;
  if (merged.coverMediaId) {
    if (!Array.isArray(merged.mediaItems) || merged.mediaItems.length === 0) {
      throw buildValidationError("mediaItems is required when coverMediaId is provided", ["mediaItems"], "VALIDATION_FAILED", 400);
    }
    const hasCover = merged.mediaItems.some((item: any) => item?.id === merged.coverMediaId);
    if (!hasCover) {
      throw buildValidationError("coverMediaId must match one of mediaItems.id", ["coverMediaId"], "VALIDATION_FAILED", 400);
    }
  }
  ensureMediaPathsSafe(tenantId, merged.media, merged.mediaItems);
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
  const mergedForValidation = normalizeLegacyListing({
    ...merged,
    mode: merged.mode || "independent",
    dealIntent: merged.dealIntent || "sale",
    propertyType: merged.propertyType || "flat",
    title: String(merged.title || "").trim() || "Draft listing",
    brokeragePartnerId: merged.brokeragePartnerId || DEFAULTS.brokeragePartnerId
  }) as ListingDoc;
  const validated = normalizeLegacyListing(CreatePropertySchema.parse(toListingPayload(mergedForValidation)));
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    deepStripUndefined({
      ...validated,
      id: propertyId,
      tenantId,
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
    const normalized = normalizeLegacyListing(data);
    SubmitPropertySchema.parse(toListingPayload(normalized));
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = err.errors.map((e) => e.path.filter((p) => p !== undefined).join(".")).filter(Boolean);
      throw buildValidationError(err.errors.map((e) => e.message).join(", "), fields, "VALIDATION_FAILED", 400);
    }
    throw err;
  }
  const missing = collectLandPlotMissingFields(normalizeLegacyListing(data) as ListingDoc);
  if (missing.length) {
    throw buildValidationError("Missing required land/plot fields", missing, "VALIDATION_FAILED", 400);
  }
}

function validateOwnerPublish(data: ListingDoc) {
  const normalized = normalizeLegacyListing(data) as ListingDoc;
  const issues: string[] = [];
  if (!normalized.title || normalized.title.trim().length < 3) issues.push("Title is required");
  if (!normalized.location?.citySlug) issues.push("City is required");
  if (!normalized.location?.locality) issues.push("Locality is required");
  if (!normalized.contact?.phone) issues.push("Contact phone is required");
  if (!normalized.dealIntent) issues.push("Deal intent is required");
  if (normalized.dealIntent === "sale" && !normalized.saleDetails?.priceOnRequest) {
    const hasPrice = Boolean(normalized.saleDetails?.totalPrice || normalized.saleDetails?.ratePerSqFt);
    if (!hasPrice) issues.push("Total price is required for sale");
  }
  if (normalized.dealIntent === "rent" || normalized.dealIntent === "lease") {
    const hasRent = Boolean(
      normalized.rentalDetails?.pricing?.monthlyRent ||
        normalized.rentalDetails?.pricing?.rentPerBed
    );
    if (!hasRent) issues.push("Monthly rent is required for rent");
  }
  const descriptionText = getDescriptionText(normalized.description);
  if (!descriptionText || descriptionText.trim().length < 30) {
    issues.push("Description must be at least 30 characters");
  }
  const hasHero = Boolean(normalized.media?.hero?.objectPath);
  const galleryCount = normalized.media?.gallery?.length ?? 0;
  const requiredGalleryMin = 1;
  if (!hasHero || galleryCount < requiredGalleryMin) {
    issues.push(`At least ${requiredGalleryMin} photos and a cover photo are required`);
  }
  if (normalized.propertyType === "land") {
    if (!normalized.landRecord?.mouza) issues.push("Mouza is required for land listings");
    if (!normalized.landRecord?.surveyOrGatNo) issues.push("Survey/Gat No is required for land listings");
    if (!normalized.landRecord?.taluka) issues.push("Taluka is required for land listings");
    if (!normalized.landRecord?.district) issues.push("District is required for land listings");
    if (!normalized.area?.value || normalized.area.value <= 0) issues.push("Area value is required for land listings");
    const unit = normalized.area?.unit;
    if (!unit || !["sqft", "sqm", "acre", "hectare"].includes(unit)) {
      issues.push("Area unit is required for land listings");
    }
  }
  if (normalized.propertyType === "plot") {
    if (!normalized.area?.value || normalized.area.value <= 0) issues.push("Area value is required for plot listings");
    const unit = normalized.area?.unit;
    if (!unit || !["sqft", "sqm", "acre", "hectare"].includes(unit)) {
      issues.push("Area unit is required for plot listings");
    }
  }
  if (issues.length) {
    const fields = collectLandPlotMissingFields(normalized);
    throw buildValidationError(issues.join(", "), fields, "VALIDATION_FAILED", 400);
  }
}

export async function listProperties(
  tenantId: string,
  user: AuthUser,
  query?: {
    mine?: boolean;
    projectId?: string;
    publishState?: string;
    status?: string;
    visibility?: string;
    recordStatus?: string;
    q?: string;
  }
) {
  assertTenantAccess(user, tenantId);
  let ref: FirebaseFirestore.Query = listingsCollection(tenantId);
  if (isOwner(user.role)) {
    ref = ref.where("createdBy.uid", "==", user.uid);
  } else if (query?.mine) {
    ref = ref.where("createdBy.uid", "==", user.uid);
  }
  if (query?.projectId) {
    ref = ref.where("projectId", "==", query.projectId);
  }
  const publishState =
    query?.publishState ||
    (query?.visibility === "published"
      ? "published"
      : query?.visibility === "internal"
      ? "unpublished"
      : query?.visibility === "draft"
      ? "draft"
      : undefined);
  if (publishState) {
    ref = ref.where("publishState", "==", publishState);
  }
  if (query?.recordStatus) {
    ref = ref.where("recordStatus", "==", query.recordStatus);
  }
  const snap = await ref.get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (query?.status) {
    items = items.filter((item: any) => {
      const status = item?.publishState || "draft";
      return status === query.status;
    });
  }
  if (query?.q) {
    const needle = query.q.toLowerCase().trim();
    items = items.filter((item: any) => {
      const location = item?.location || {};
      const hay = [
        item?.title,
        location?.citySlug,
        location?.locality,
        item?.id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
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
    const normalized = applyExpiryPolicy(normalizeLegacyListing(data) as ListingDoc);
    validateOwnerPublish(normalized as ListingDoc);
    if (isOwner(user.role) && isOwnerMonetizationEnforced()) {
      await assertOwnerActiveListingCap({
        tenantId,
        ownerUid: user.uid,
        excludeListingId: propertyId
      });
    }
    const state = getPublishState(normalized as ListingDoc);
    if (state === "published") {
      canPublish = false;
      appendMissing(["publishState"]);
    }
    const expiresAt = parseExpiryDate(normalized?.expiresAt);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      canPublish = false;
      appendMissing(["expiresAt"]);
    }
  } catch (err: any) {
    canPublish = false;
    appendMissing(err?.fields);
  }

  return { canSubmit, canPublish, missing };
}

export async function submitProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  throw buildValidationError("Submit workflow removed in direct publish V3. Use publish instead.", ["publishState"], "WORKFLOW_REMOVED", 409);
}

export async function approveProperty(input: {
  tenantId: string;
  propertyId: string;
  user: AuthUser;
  body: ApprovePropertyInput;
}) {
  throw buildValidationError("Approval workflow removed in direct publish V3", ["publishState"], "WORKFLOW_REMOVED", 409);
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
  enforcePublishStateTransition(getPublishState(data), "unpublished");
  await ref.update(
    deepStripUndefined({
      publishState: "unpublished",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  );
  await removePublicProperty(propertyId);
  return { status: "unpublished", publishState: "unpublished" };
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
  if (data.publishState === "published") {
    throw new Error("Unpublish before deleting.");
  }
  await firestore.runTransaction(async (tx) => {
    const currentSnap = await tx.get(ref);
    const current = currentSnap.data() as ListingDoc | undefined;
    if (!current) return;

    const tenantDocRef = firestore.collection("tenants").doc(tenantId);
    const counterRef = tenantDocRef.collection("counters").doc("listings");
    const featuredCounterRef = tenantDocRef.collection("counters").doc("featuredListings");

    const tenantSnap = await tx.get(tenantDocRef);
    const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
    const enforce = shouldEnforce(user, tenantType);
    const counterSnap = enforce ? await tx.get(counterRef) : null;
    const featuredSnap = enforce && current.featured === true ? await tx.get(featuredCounterRef) : null;

    tx.delete(ref);

    if (!enforce) return;
    const count = (counterSnap?.data() as any)?.count ?? 0;
    const nextCount = Math.max(0, count - 1);
    tx.set(
      counterRef,
      { count: nextCount, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    if (current.featured === true) {
      const featuredCount = (featuredSnap?.data() as any)?.count ?? 0;
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

export async function initListingMediaUpload(input: {
  tenantId: string;
  propertyId: string;
  body: { kind: "image" | "doc"; contentType: string; fileName: string; sizeBytes: number };
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  await requireListingWriteAccess({ tenantId, propertyId, user });

  const contentType = body.contentType.toLowerCase();
  if (body.kind === "image" && !MEDIA_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw buildValidationError("Invalid image content type", ["contentType"], "INVALID_CONTENT_TYPE", 400);
  }
  if (body.kind === "doc" && !MEDIA_DOC_CONTENT_TYPES.has(contentType)) {
    throw buildValidationError("Invalid document content type", ["contentType"], "INVALID_CONTENT_TYPE", 400);
  }
  const maxBytes = body.kind === "doc" ? MAX_DOC_BYTES : MAX_IMAGE_BYTES;
  if (body.sizeBytes > maxBytes) {
    throw buildValidationError("File too large", ["sizeBytes"], "FILE_TOO_LARGE", 400);
  }

  const storagePath = buildMediaObjectPath(tenantId, propertyId, body.kind, body.fileName);
  const signed = await createSignedPutUrl({
    tenantId,
    objectPath: storagePath,
    contentType
  });
  const mediaId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return {
    uploadUrl: signed.url,
    storagePath: signed.objectPath,
    mediaId
  };
}

export async function commitListingMediaUpload(input: {
  tenantId: string;
  propertyId: string;
  body: {
    mediaId: string;
    storagePath: string;
    kind: "image" | "doc";
    isCover?: boolean;
    caption?: string;
    label?: string;
  };
  user: AuthUser;
}) {
  const { tenantId, propertyId, body, user } = input;
  const { ref, existing } = await requireListingWriteAccess({ tenantId, propertyId, user });

  if (!isSafeObjectPath(body.storagePath)) {
    throw buildValidationError("Invalid storage path", ["storagePath"], "INVALID_MEDIA_PATH", 400);
  }
  requireTenantScopedPath(tenantId, body.storagePath);
  const expectedPrefix = `tenants/${tenantId}/listings/${propertyId}/`;
  if (!body.storagePath.startsWith(expectedPrefix)) {
    throw buildValidationError("Invalid storage path", ["storagePath"], "INVALID_MEDIA_PATH", 400);
  }

  const nextMedia = existing.media ?? {};
  const nowIso = new Date().toISOString();

  if (body.kind === "image") {
    const nextItem = deepStripUndefined({
      objectPath: body.storagePath,
      id: body.mediaId,
      kind: "image",
      caption: body.caption,
      isCover: body.isCover,
      createdAt: nowIso
    }) as any;
    const gallery = Array.isArray(nextMedia.gallery) ? nextMedia.gallery : [];
    const deduped = gallery.filter((item: any) => item?.objectPath !== body.storagePath);
    nextMedia.gallery = [...deduped, nextItem];
    if (body.isCover) {
      nextMedia.hero = { objectPath: body.storagePath, id: body.mediaId, kind: "image", isCover: true };
    }
  } else {
    const ext = body.storagePath.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    const nextDoc = deepStripUndefined({
      objectPath: body.storagePath,
      id: body.mediaId,
      kind: ext,
      label: body.label,
      createdAt: nowIso
    }) as any;
    const documents = Array.isArray(nextMedia.documents) ? nextMedia.documents : [];
    const dedupedDocs = documents.filter((item: any) => item?.objectPath !== body.storagePath);
    nextMedia.documents = [...dedupedDocs, nextDoc];
  }

  ensureMediaPathsSafe(tenantId, nextMedia);
  await ref.update(
    deepStripUndefined({
      media: nextMedia,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  );

  const fresh = await ref.get();
  return { id: propertyId, media: fresh.data()?.media ?? nextMedia };
}

export async function getListingMediaUrl(input: {
  tenantId: string;
  propertyId: string;
  mediaId: string;
  user: AuthUser;
}) {
  const { tenantId, propertyId, mediaId, user } = input;
  const { existing } = await requireListingWriteAccess({ tenantId, propertyId, user });
  const media = existing.media ?? {};
  const items = [
    media.hero,
    ...(Array.isArray(media.gallery) ? media.gallery : []),
    ...(Array.isArray(media.documents) ? media.documents : [])
  ].filter(Boolean) as any[];
  const match = items.find((item) => item?.id === mediaId);
  if (!match?.objectPath) {
    throw buildValidationError("Media not found", ["mediaId"], "NOT_FOUND", 404);
  }
  const signed = await createSignedGetUrls({ tenantId, paths: [match.objectPath] });
  const url = signed.items?.[0]?.url;
  if (!url) throw new Error("Failed to sign URL");
  return { signedGetUrl: url };
}

export async function publishProperty(input: { tenantId: string; propertyId: string; user: AuthUser }) {
  const { tenantId, propertyId, user } = input;
  assertTenantAccess(user, tenantId);
  const ref = await findListingRef(propertyId, tenantId);
  if (!ref) throw new Error("Not found");
  const snap = await ref.get();
  const data = normalizeLegacyListing(snap.data() as ListingDoc | undefined);
  if (!data) throw new Error("Not found");
  if (data.createdBy?.uid && data.createdBy.uid !== user.uid && !isAdmin(user.role)) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role) && data.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
  if (isOwner(user.role) && data.mode !== "independent") {
    throw new Error("Only independent listings are allowed for owners");
  }
  let hasActiveAgentAccess = false;
  if (!isOwner(user.role) && !isAgent(user.role) && !canManageEnterpriseListing(user.role) && !isAdmin(user.role)) {
    const agentProfile = await fetchAgentProfile(tenantId, user.uid);
    const agentStatus =
      typeof agentProfile?.status === "string" ? String(agentProfile.status).toUpperCase() : "NONE";
    hasActiveAgentAccess = agentStatus === "ACTIVE";
  }
  if (
    !isOwner(user.role) &&
    !isAgent(user.role) &&
    !canManageEnterpriseListing(user.role) &&
    !isAdmin(user.role) &&
    !hasActiveAgentAccess
  ) {
    throw new Error("Forbidden");
  }

  const normalizedForPublish = applyExpiryPolicy(data);
  validateSubmitPayload(normalizedForPublish as ListingDoc);
  validateOwnerPublish(normalizedForPublish as ListingDoc);
  let publishExpiresAtIso = normalizedForPublish?.expiresAt ?? null;
  const currentPublishState = getPublishState(normalizedForPublish as ListingDoc);
  let agentPublishResolution: Awaited<ReturnType<typeof assertAgentPublishEntitlement>> | null = null;
  if (isOwner(user.role) && isOwnerMonetizationEnforced()) {
    await assertOwnerActiveListingCap({
      tenantId,
      ownerUid: user.uid,
      excludeListingId: propertyId
    });
    const freeEntitlement = await ensureOwnerFreeEntitlementForListing({
      tenantId,
      listingId: propertyId,
      ownerUid: user.uid
    });
    if (freeEntitlement.expiresAt) {
      publishExpiresAtIso = freeEntitlement.expiresAt;
      logger.info("Owner listing expiry derived from entitlement", {
        tenantId,
        propertyId,
        ownerUid: user.uid,
        source: "entitlement",
        productId: "owner_free_listing_v1",
        expiresAt: freeEntitlement.expiresAt
      });
    }
  }
  if (
    !isOwner(user.role) &&
    isAgent(user.role) &&
    isAgentMonetizationEnforced()
  ) {
    agentPublishResolution = await assertAgentPublishEntitlement({
      tenantId,
      listingId: propertyId,
      user,
      currentPublishState
    });
    if (
      agentPublishResolution.source === "listing_entitlement" ||
      agentPublishResolution.source === "credit_wallet"
    ) {
      const entitlementEndsAt = parseExpiryDate(
        agentPublishResolution.listingEntitlement?.endsAt || null
      );
      if (entitlementEndsAt) {
        publishExpiresAtIso = entitlementEndsAt.toISOString();
      }
    }
  }
  const expiresAt = parseExpiryDate(publishExpiresAtIso);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw buildValidationError("Listing is expired and cannot be published", ["expiresAt"], "LISTING_EXPIRED", 409);
  }

  enforcePublishStateTransition(currentPublishState, "published");

  const now = admin.firestore.FieldValue.serverTimestamp();
  if (isOwner(user.role)) {
    const kycStatus = await getOwnerKycStatus(tenantId, user.uid);
    if (kycStatus !== "phone_verified" && kycStatus !== "verified") {
      throw new Error("Phone KYC required to publish");
    }
  }
  if (!isOwner(user.role)) {
    if (env.monetizationNewEngineRead) {
      await observeCompatibility({
        tenantId,
        user,
        capability: "publish",
        source: "properties.publish",
        metadata: { propertyId }
      });
    }
    const agentEnforcedPath = isAgent(user.role) && isAgentMonetizationEnforced();
    if (!agentEnforcedPath) {
      const subscription = await requireCapability(tenantId, user, "PUBLISH");
      const agentSubscription = await fetchAgentSubscription(tenantId, user.uid);
      const agentStatus = agentSubscription?.status || "trial";
      const agentPlan = agentSubscription?.planCode || "trial";
      const isActiveAgentPlan = agentStatus === "active";
      const isTrial = !isActiveAgentPlan || agentPlan === "trial";
      if (isTrial && subscription?.limits?.publishAllowed !== false) {
        const publishedCount = await countPublishedListingsForUser(tenantId, user.uid);
        if (publishedCount >= TRIAL_PUBLISH_LIMIT) {
          logger.warn("Trial publish limit reached", { tenantId, uid: user.uid, publishedCount, limit: TRIAL_PUBLISH_LIMIT });
          throw buildBillingError("Publish limit reached for trial plan", "PLAN_LIMIT_REACHED", 403);
        }
      }
    }
  }

  const gallery = normalizedForPublish?.media?.gallery || [];
  const heroMissing = !normalizedForPublish?.media?.hero?.objectPath;
  const nextHero = heroMissing && gallery.length > 0 ? { objectPath: gallery[0].objectPath } : null;
  await ref.update(
    deepStripUndefined({
      publishState: "published",
      ...(nextHero ? { "media.hero": nextHero } : {}),
      expiresAt: publishExpiresAtIso,
      updatedAt: now
    })
  );

  const fresh = await ref.get();
  const nextData = applyExpiryPolicy(normalizeLegacyListing(fresh.data() as ListingDoc | undefined));
  if (nextData && nextData.expiresAt !== fresh.data()?.expiresAt) {
    await ref.update(
      deepStripUndefined({
        expiresAt: nextData.expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    );
  }
  await syncPublicProperty(propertyId, nextData);
  if (isOwner(user.role) && isOwnerMonetizationEnforced()) {
    await syncOwnerListingBoostCache({
      tenantId,
      listingId: propertyId
    });
  }
  if (isAgent(user.role) && isAgentMonetizationEnforced()) {
    await syncAgentListingMonetizationCache({
      tenantId,
      listingId: propertyId,
      source: agentPublishResolution?.source || "none"
    });
    logger.info("Agent publish resolved through monetization path", {
      tenantId,
      propertyId,
      uid: user.uid,
      source: agentPublishResolution?.source || "unknown",
      entitlementProductId:
        agentPublishResolution?.listingEntitlement?.productId || null,
      monthlyCompatProductId:
        agentPublishResolution?.monthlyCompat?.productId || null
    });
  }
  return { status: nextData?.publishState === "published" ? "published" : "unpublished", publishState: nextData?.publishState ?? "draft" };
}

export async function rejectProperty(input: {
  tenantId: string;
  propertyId: string;
  body: RejectPropertyInput;
  user: AuthUser;
}) {
  throw buildValidationError("Reject workflow removed in direct publish V3", ["publishState"], "WORKFLOW_REMOVED", 409);
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
      const counterSnap = await tx.get(counterRef);
      const current = (counterSnap.data() as any)?.count ?? 0;
      if (subscription.limits.featuredLimit !== null) {
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
  const targetState = body.publishState;
  const currentState = getPublishState(data);

  if (targetState === "published") {
    const normalized = applyExpiryPolicy(data);
    validateSubmitPayload(normalized as ListingDoc);
    validateOwnerPublish(normalized as ListingDoc);
    const expiresAt = parseExpiryDate(normalized?.expiresAt);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw buildValidationError("Listing is expired and cannot be published", ["expiresAt"], "LISTING_EXPIRED", 409);
    }
  }
  enforcePublishStateTransition(currentState, targetState);

  await ref.update(
    deepStripUndefined({
      publishState: targetState,
      expiresAt: targetState === "published" ? applyExpiryPolicy(data)?.expiresAt : data.expiresAt,
      updatedAt: now
    })
  );

  const fresh = await ref.get();
  const freshData = fresh.data();
  if (!freshData) return { publishState: targetState };
  await syncPublicProperty(propertyId, freshData);
  return { publishState: targetState };
}

function buildPublicProjection(propertyId: string, data: any) {
  const normalized = applyExpiryPolicy(normalizeLegacyListing(data));
  const citySlug =
    normalized?.location?.citySlug ??
    (normalized?.location?.city ? slugify(String(normalized.location.city), 80) : null);
  const locality = normalized?.location?.locality ?? null;
  return {
    listingId: propertyId,
    tenantId: normalized?.tenantId,
    mode: normalized?.mode,
    projectId: normalized?.projectId ?? null,
    unitType: normalized?.unitType ?? null,
    availability: normalized?.availability ?? null,
    title: normalized?.title,
    dealIntent: normalized?.dealIntent ?? null,
    publishState: normalized?.publishState ?? "draft",
    category: normalized?.category ?? null,
    categoryType: normalized?.categoryType ?? null,
    propertyType: normalized?.propertyType,
    description: normalized?.description ?? null,
    amenities: normalized?.amenities ?? [],
    highlights: normalized?.highlights ?? [],
    saleDetails: normalized?.saleDetails ?? null,
    rentalDetails: normalized?.rentalDetails ?? null,
    expiresAt: normalized?.expiresAt ?? null,
    citySlug,
    locality,
    location: normalized?.location
      ? {
          citySlug,
          locality,
          addressLine: normalized.location.addressLine ?? null,
          landmark: normalized.location.landmark ?? null,
          showExactAddress: normalized.location.showExactAddress ?? null,
          pincode: normalized.location.pincode ?? null,
          geo: normalized.location.geo ?? null
        }
      : null,
    specs: normalized?.specs ?? {},
    plotInfo: normalized?.plotInfo ?? null,
    landRecord: normalized?.landRecord ?? null,
    unit: normalized?.unit ?? null,
    area: normalized?.area ?? null,
    media: normalized?.media ?? {},
    mediaItems: normalized?.mediaItems ?? null,
    coverMediaId: normalized?.coverMediaId ?? null,
    contact: normalized?.contact ?? null,
    isPublished: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

function stripInternalFields(data: any) {
  if (!data || typeof data !== "object") return data;
  const {
    ownerConsent,
    ownerConsentMode,
    exclusiveListing,
    brokerageApplicable,
    brokerageType,
    brokerageValue,
    brokerageNotes,
    internalNotes,
    enterpriseId,
    recordStatus,
    source,
    assignedToUid,
    leadPriority,
    tags,
    ...rest
  } = data;
  return rest;
}

function normalizePublicMonetizationCache(data: any) {
  if (!data || typeof data !== "object") return { normalized: data, changed: false };
  const monetization = data.monetization;
  if (!monetization || typeof monetization !== "object") return { normalized: data, changed: false };
  const nowMs = Date.now();
  const boostEndsAt = parseExpiryDate(monetization.boostEndsAt || null);
  const expiredBoost = Boolean(
    boostEndsAt &&
      boostEndsAt.getTime() <= nowMs &&
      (monetization.effectiveBoostTier === "boost" || monetization.effectiveBoostTier === "premium")
  );
  const featuredEndsAt = parseExpiryDate(monetization.featuredEndsAt || null);
  const expiredFeaturedAutoRenew = Boolean(
    featuredEndsAt &&
      featuredEndsAt.getTime() <= nowMs &&
      monetization.autoRenewFeaturedActive === true
  );
  if (!expiredBoost && !expiredFeaturedAutoRenew) return { normalized: data, changed: false };
  const fallbackTier = String(monetization.baseListingTier || "none");
  const fallbackRankWeight =
    typeof monetization.baseRankWeight === "number"
      ? monetization.baseRankWeight
      : fallbackTier === "featured"
      ? 300
      : fallbackTier === "premium"
      ? 200
      : 100;
  const featuredStillActive =
    monetization.autoRenewFeaturedActive === true &&
    !!featuredEndsAt &&
    featuredEndsAt.getTime() > nowMs;
  const nextRankWeight = expiredFeaturedAutoRenew
    ? fallbackRankWeight
    : featuredStillActive
    ? 300
    : 100;
  return {
    normalized: {
      ...data,
      boost: null,
      monetization: {
        ...monetization,
        effectiveBoostTier: "none",
        effectiveListingTier: expiredFeaturedAutoRenew ? fallbackTier : monetization.effectiveListingTier,
        autoRenewFeaturedActive: expiredFeaturedAutoRenew ? false : monetization.autoRenewFeaturedActive,
        autoRenewStatus: expiredFeaturedAutoRenew ? "expired" : monetization.autoRenewStatus,
        featuredEndsAt: expiredFeaturedAutoRenew ? null : monetization.featuredEndsAt,
        rankWeight: nextRankWeight,
        boostEndsAt: null,
        updatedAt: new Date().toISOString()
      }
    },
    changed: true
  };
}

export async function listPublicProperties(query: any) {
  let ref: FirebaseFirestore.Query = firestore.collection("publicProperties");
  if (query.citySlug) ref = ref.where("location.citySlug", "==", query.citySlug);
  if (query.propertyType) ref = ref.where("propertyType", "==", query.propertyType);
  if (query.dealIntent) ref = ref.where("dealIntent", "==", query.dealIntent);
  if (query.mode) ref = ref.where("mode", "==", query.mode);
  if (query.projectId) ref = ref.where("projectId", "==", query.projectId);
  if (query.featured) ref = ref.where("featured", "==", true);
  const snap = await ref.limit(query.limit ?? 20).get();
  const items = await Promise.all(
    snap.docs.map(async (doc) => {
      const projected = { id: doc.id, ...doc.data() };
      const normalized = normalizePublicMonetizationCache(projected);
      if (normalized.changed) {
        await firestore.collection("publicProperties").doc(doc.id).set(
          {
            boost: null,
            monetization: normalized.normalized.monetization
          },
          { merge: true }
        );
      }
      return stripInternalFields(normalized.normalized);
    })
  );
  return { items };
}

export async function getPublicProperty(propertyId: string) {
  const snap = await firestore.collection("publicProperties").doc(propertyId).get();
  if (!snap.exists) throw new Error("Not found");
  const projected = { id: snap.id, ...snap.data() };
  const normalized = normalizePublicMonetizationCache(projected);
  if (normalized.changed) {
    await firestore.collection("publicProperties").doc(propertyId).set(
      {
        boost: null,
        monetization: normalized.normalized.monetization
      },
      { merge: true }
    );
  }
  return stripInternalFields(normalized.normalized);
}

async function syncPublicProperty(propertyId: string, data: any) {
  const normalized = applyExpiryPolicy(normalizeLegacyListing(data));
  if (!normalized) {
    await removePublicProperty(propertyId);
    return;
  }
  const isPublished = isPubliclyVisibleProperty(normalized, new Date());
  if (normalized.publishState !== data?.publishState || normalized.expiresAt !== data?.expiresAt) {
    const ref = await findListingRef(propertyId, normalized.tenantId);
    if (ref) {
      await ref.update(
        deepStripUndefined({
          publishState: normalized.publishState,
          expiresAt: normalized.expiresAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
    }
  }
  if (isPublished) {
    logger.info("Public property upserted", { propertyId, publishState: normalized.publishState });
    await upsertPublicProperty(propertyId, buildPublicProjection(propertyId, normalized));
  } else {
    logger.info("Public property removed", {
      propertyId,
      publishState: normalized.publishState,
      expiresAt: normalized.expiresAt
    });
    await removePublicProperty(propertyId);
  }
}
