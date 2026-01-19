import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { validateMandateForPublish } from "../mandates/mandates.service";
import { listMembershipsByUser } from "../memberships/memberships.service";
import { buildBillingError, requireCapability, requireOnboardingIfPremier, shouldEnforce } from "../../middleware/requirePlan";
import { getOrCreateSubscriptionInTransaction } from "../billing";
import { hasOrgListingPermission, type OrgListingPermission } from "./orgListings.permissions";
import {
  LifecycleStateSchema,
  OrgListingCreateSchema,
  OrgListingPatchSchema,
  OrgListingQuerySchema,
  TransitionRequestSchema
} from "./orgListings.schemas";

type OrgListingDoc = {
  tenantId: string;
  principalType: "agent" | "agency" | "enterprise";
  principalId: string;
  createdBy: string;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedBy: string;
  lifecycleState: "draft" | "review" | "approved" | "published" | "unpublished" | "archived";
  visibility: "public" | "private";
  title: string;
  propertyType: string;
  listingType: "sale" | "rent";
  location: {
    city: string;
    area?: string;
    addressLine?: string;
    lat?: number;
    lng?: number;
  };
  pricing?: {
    totalPrice?: number;
    price?: number;
    currency?: string;
  };
  media?: {
    gallery?: { objectPath: string; label?: string }[];
  };
  description?: string;
  attributes?: Record<string, any>;
  enterpriseProjectId?: string;
  inventoryItemId?: string;
  ownerUid?: string;
  ownerListingId?: string;
  mandateId?: string;
};

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function orgListingsCollection(tenantId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("orgListings");
}

function isTenantAdmin(user: AuthUser) {
  return user.role === "tenant_admin" || user.role === "platform_admin";
}

async function assertCanAccessPrincipal(input: {
  tenantId: string;
  user: AuthUser;
  principalType: "agent" | "agency" | "enterprise";
  principalId: string;
  permission: OrgListingPermission;
}) {
  const { tenantId, user, principalType, principalId, permission } = input;
  if (principalType === "agent") {
    if (principalId !== user.uid) {
      throw new Error("Forbidden");
    }
    return;
  }
  const memberships = await listMembershipsByUser({
    tenantId,
    userId: user.uid,
    orgType: principalType,
    orgId: principalId
  });
  if (memberships.length === 0) {
    throw new Error("Forbidden");
  }
  const membership = memberships[0];
  if (!hasOrgListingPermission(membership.role, permission)) {
    throw new Error("Forbidden");
  }
}

async function logEvent(input: {
  tenantId: string;
  orgListingId: string;
  action: string;
  note?: string;
  by: string;
  fromState: string;
  toState: string;
}) {
  const ref = orgListingsCollection(input.tenantId)
    .doc(input.orgListingId)
    .collection("events")
    .doc();
  await ref.set(
    stripUndefined({
      action: input.action,
      note: input.note,
      by: input.by,
      fromState: input.fromState,
      toState: input.toState,
      at: admin.firestore.FieldValue.serverTimestamp()
    })
  );
}

export async function createOrgListing(input: { tenantId: string; user: AuthUser; body: unknown }) {
  const payload = OrgListingCreateSchema.parse(input.body);
  await assertCanAccessPrincipal({
    tenantId: input.tenantId,
    user: input.user,
    principalType: payload.principalType,
    principalId: payload.principalId,
    permission: "orgListing.create"
  });
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = orgListingsCollection(input.tenantId).doc();
  const doc: OrgListingDoc = {
    tenantId: input.tenantId,
    principalType: payload.principalType,
    principalId: payload.principalId,
    createdBy: input.user.uid,
    createdAt: now,
    updatedAt: now,
    updatedBy: input.user.uid,
    lifecycleState: "draft",
    visibility: "private",
    title: payload.title,
    propertyType: payload.propertyType,
    listingType: payload.listingType,
    location: payload.location,
    pricing: payload.pricing,
    media: payload.media,
    description: payload.description,
    attributes: payload.attributes,
    enterpriseProjectId: payload.enterpriseProjectId,
    inventoryItemId: payload.inventoryItemId,
    ownerUid: payload.ownerUid,
    ownerListingId: payload.ownerListingId,
    mandateId: payload.mandateId
  };
  await requireOnboardingIfPremier(input.tenantId, input.user);
  await firestore.runTransaction(async (tx) => {
    const tenantSnap = await tx.get(firestore.collection("tenants").doc(input.tenantId));
    const tenantType = (tenantSnap.data() as any)?.type as string | undefined;
    const enforce = shouldEnforce(input.user, tenantType);
    if (enforce) {
      const subscription = await getOrCreateSubscriptionInTransaction(tx, input.tenantId, input.user);
      const active = subscription.status === "active" || subscription.status === "trialing";
      if (!active || subscription.validTill.toDate().getTime() < Date.now()) {
        throw buildBillingError("Subscription inactive or expired", "PAYMENT_REQUIRED", 402);
      }
      const counterRef = firestore.collection("tenants").doc(input.tenantId).collection("counters").doc("listings");
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
    tx.create(ref, stripUndefined(doc));
  });
  return { id: ref.id };
}

export async function listOrgListings(input: {
  tenantId: string;
  user: AuthUser;
  query: unknown;
}) {
  const queryParsed = OrgListingQuerySchema.parse(input.query);
  if (isTenantAdmin(input.user)) {
    let ref: FirebaseFirestore.Query = orgListingsCollection(input.tenantId);
    if (queryParsed.principalType) {
      ref = ref.where("principalType", "==", queryParsed.principalType);
    }
    if (queryParsed.principalId) {
      ref = ref.where("principalId", "==", queryParsed.principalId);
    }
    if (queryParsed.lifecycleState) {
      ref = ref.where("lifecycleState", "==", queryParsed.lifecycleState);
    }
    const snap = await ref.get();
    return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  }

  const memberships = await listMembershipsByUser({
    tenantId: input.tenantId,
    userId: input.user.uid
  });

  const results: any[] = [];
  const fetches: Promise<void>[] = [];
  const pushListing = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    results.push({ id: doc.id, ...doc.data() });
  };

  if (!queryParsed.principalType || queryParsed.principalType === "agent") {
    let agentRef: FirebaseFirestore.Query = orgListingsCollection(input.tenantId)
      .where("principalType", "==", "agent")
      .where("principalId", "==", input.user.uid);
    if (queryParsed.lifecycleState) {
      agentRef = agentRef.where("lifecycleState", "==", queryParsed.lifecycleState);
    }
    fetches.push(agentRef.get().then((snap) => snap.docs.forEach(pushListing)));
  }

  const agencyIds = memberships.filter((m) => m.orgType === "agency").map((m) => m.orgId);
  const enterpriseIds = memberships.filter((m) => m.orgType === "enterprise").map((m) => m.orgId);
  const orgEntries = [
    { type: "agency" as const, ids: agencyIds },
    { type: "enterprise" as const, ids: enterpriseIds }
  ];
  for (const entry of orgEntries) {
    for (const id of entry.ids) {
      let ref: FirebaseFirestore.Query = orgListingsCollection(input.tenantId)
        .where("principalType", "==", entry.type)
        .where("principalId", "==", id);
      if (queryParsed.lifecycleState) {
        ref = ref.where("lifecycleState", "==", queryParsed.lifecycleState);
      }
      fetches.push(ref.get().then((snap) => snap.docs.forEach(pushListing)));
    }
  }

  await Promise.all(fetches);
  return { items: results };
}

export async function getOrgListing(input: { tenantId: string; user: AuthUser; id: string }) {
  const snap = await orgListingsCollection(input.tenantId).doc(input.id).get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as OrgListingDoc;
  await assertCanAccessPrincipal({
    tenantId: input.tenantId,
    user: input.user,
    principalType: data.principalType,
    principalId: data.principalId,
    permission: "orgListing.read"
  });
  return { id: snap.id, ...data };
}

export async function updateOrgListing(input: {
  tenantId: string;
  user: AuthUser;
  id: string;
  body: unknown;
}) {
  const payload = OrgListingPatchSchema.parse(input.body);
  const ref = orgListingsCollection(input.tenantId).doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const existing = snap.data() as OrgListingDoc;
  if (existing.lifecycleState === "published") {
    throw new Error("Published listings cannot be edited");
  }
  await assertCanAccessPrincipal({
    tenantId: input.tenantId,
    user: input.user,
    principalType: existing.principalType,
    principalId: existing.principalId,
    permission: "orgListing.edit"
  });
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      ...payload,
      updatedAt: now,
      updatedBy: input.user.uid
    }),
    { merge: true }
  );
  return { id: input.id };
}

function assertTransition(from: string, action: string) {
  if (action === "submit" && from !== "draft") return false;
  if (action === "approve" && from !== "review") return false;
  if (action === "publish" && !(from === "approved" || from === "unpublished")) return false;
  if (action === "unpublish" && from !== "published") return false;
  if (action === "archive" && !["draft", "review", "approved", "unpublished"].includes(from)) return false;
  return true;
}

function nextState(from: string, action: string): "draft" | "review" | "approved" | "published" | "unpublished" | "archived" {
  if (action === "submit") return "review";
  if (action === "approve") return "approved";
  if (action === "publish") return "published";
  if (action === "unpublish") return "unpublished";
  return "archived";
}

const actionPermission: Record<string, OrgListingPermission> = {
  submit: "orgListing.submit",
  approve: "orgListing.approve",
  publish: "orgListing.publish",
  unpublish: "orgListing.unpublish",
  archive: "orgListing.archive"
};

export async function transitionOrgListing(input: {
  tenantId: string;
  user: AuthUser;
  id: string;
  body: unknown;
}) {
  const payload = TransitionRequestSchema.parse(input.body);
  const ref = orgListingsCollection(input.tenantId).doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const existing = snap.data() as OrgListingDoc;
  const fromState = existing.lifecycleState;
  if (!assertTransition(fromState, payload.action)) {
    throw new Error(`Invalid transition from ${fromState}`);
  }
  const permission = actionPermission[payload.action];
  await assertCanAccessPrincipal({
    tenantId: input.tenantId,
    user: input.user,
    principalType: existing.principalType,
    principalId: existing.principalId,
    permission
  });
  const toState = nextState(fromState, payload.action);
  const visibility = payload.action === "publish" ? "public" : payload.action === "unpublish" ? "private" : existing.visibility;
  const now = admin.firestore.FieldValue.serverTimestamp();
  let mandateId: string | undefined;
  if (payload.action === "publish") {
    await requireCapability(input.tenantId, input.user, "PUBLISH");
    const mandate = await validateMandateForPublish({
      tenantId: input.tenantId,
      principalType: existing.principalType,
      principalId: existing.principalId,
      ownerUid: (existing as any).ownerUid,
      ownerListingId: (existing as any).ownerListingId,
      mandateId: (existing as any).mandateId
    });
    if (mandate && !(existing as any).mandateId) {
      mandateId = mandate.id;
    }
  }
  await ref.set(
    stripUndefined({
      lifecycleState: toState,
      visibility,
      mandateId: mandateId ?? (existing as any).mandateId,
      updatedAt: now,
      updatedBy: input.user.uid
    }),
    { merge: true }
  );
  await logEvent({
    tenantId: input.tenantId,
    orgListingId: input.id,
    action: payload.action,
    note: payload.note,
    by: input.user.uid,
    fromState,
    toState
  });
  return { id: input.id, lifecycleState: toState, visibility };
}

export const transitionValidator = {
  assertTransition,
  nextState
};
