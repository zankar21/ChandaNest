import admin from "firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { slugify } from "../../utils/slugify";
import { isSafeObjectPath, requireTenantScopedPath } from "../../utils/objectPath";
import { AuthUser } from "../../types";
import { deepStripUndefined } from "../properties/properties.service";
import {
  ProjectCreateInput,
  ProjectCreateSchema,
  ProjectListQuerySchema,
  ProjectUpdateInput,
  ProjectUpdateSchema,
  PublicProjectListQuerySchema,
  UnitCreateInput,
  UnitCreateSchema,
  UnitUpdateInput,
  UnitUpdateSchema
} from "./projects.schemas";
import { projectsCollection } from "./projects.repo";
import { ProjectDoc, PublicProjectDoc, PublicUnitDoc, UnitDoc } from "./projects.types";

type Cursor = { updatedAt: FirebaseFirestore.Timestamp; id: string } | null;

const publicProjectsCollection = () => firestore.collection("publicProjects");
const publicProjectUnitsCollection = () => firestore.collection("publicProjectUnits");

function unitsCollection(tenantId: string, projectId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("projects").doc(projectId).collection("units");
}

function isPlatformAdmin(user: AuthUser) {
  if (user.role === "platform_admin") return true;
  return env.platformAdminUids.includes(user.uid);
}

function isAdmin(user: AuthUser) {
  return user.role === "tenant_admin" || user.role === "client_admin" || isPlatformAdmin(user);
}

function resolveTenantId(user: AuthUser, provided?: string) {
  if (isPlatformAdmin(user)) {
    if (!provided) throw new Error("TENANT_ID_REQUIRED");
    return provided;
  }
  if (!user.tenantId) throw new Error("TENANT_ID_REQUIRED");
  if (provided && provided !== user.tenantId) throw new Error("Forbidden");
  return user.tenantId;
}

function parseCursor(cursor?: string): Cursor {
  if (!cursor) return null;
  const [ms, id] = cursor.split(":");
  const value = Number(ms);
  if (!id || Number.isNaN(value)) {
    throw new Error("INVALID_CURSOR");
  }
  return { updatedAt: admin.firestore.Timestamp.fromMillis(value), id };
}

function toCursor(updatedAt?: FirebaseFirestore.Timestamp, id?: string) {
  if (!updatedAt || !id) return undefined;
  return `${updatedAt.toMillis()}:${id}`;
}

function ensureMediaPathsSafe(tenantId: string, media?: ProjectCreateInput["media"]) {
  if (!media) return;
  const paths: string[] = [];
  if (media.cover?.objectPath) paths.push(media.cover.objectPath);
  media.gallery?.forEach((m) => m?.objectPath && paths.push(m.objectPath));
  if (media.brochure?.objectPath) paths.push(media.brochure.objectPath);
  paths.forEach((p) => {
    if (!isSafeObjectPath(p)) throw new Error("Invalid media object path");
    requireTenantScopedPath(tenantId, p);
  });
}

function ensureUnitMediaPathsSafe(tenantId: string, media?: UnitCreateInput["media"]) {
  if (!media?.floorPlan?.objectPath) return;
  const path = media.floorPlan.objectPath;
  if (!isSafeObjectPath(path)) throw new Error("Invalid media object path");
  requireTenantScopedPath(tenantId, path);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

export function computeUniqueSlug(baseSlug: string, existing: string[]) {
  let candidate = baseSlug;
  let attempt = 2;
  const existingSet = new Set(existing);
  while (existingSet.has(candidate)) {
    candidate = `${baseSlug}-${attempt}`;
    attempt += 1;
  }
  return candidate;
}

async function ensureUniqueSlug(tenantId: string, baseSlug: string, projectId?: string) {
  let candidate = baseSlug;
  let attempt = 2;
  while (true) {
    const snap = await projectsCollection(tenantId).where("slug", "==", candidate).get();
    const conflict = snap.docs.find((doc) => doc.id !== projectId);
    if (!conflict) return candidate;
    candidate = `${baseSlug}-${attempt}`;
    attempt += 1;
  }
}

async function generateSlug(tenantId: string, name: string, projectId?: string) {
  const base = slugify(name, 80) || "project";
  const withSuffix = `${base}-${randomSuffix()}`;
  return ensureUniqueSlug(tenantId, withSuffix, projectId);
}

function buildProjectDoc(
  input: ProjectCreateInput & { slug: string },
  tenantId: string,
  projectId: string,
  user: AuthUser,
  createdAt: FirebaseFirestore.FieldValue,
  updatedAt: FirebaseFirestore.FieldValue,
  existing?: ProjectDoc
): ProjectDoc {
  return {
    id: projectId,
    tenantId,
    enterpriseId: input.enterpriseId,
    name: input.name,
    slug: input.slug,
    type: input.type,
    status: input.status,
    rera: input.rera,
    location: input.location,
    priceRange: input.priceRange,
    possessionDate: input.possessionDate,
    amenities: input.amenities,
    highlights: input.highlights,
    media: input.media,
    visibility: existing?.visibility ?? { state: "draft" },
    moderation: existing?.moderation,
    counts: existing?.counts ?? { totalUnits: 0, availableUnits: 0 },
    createdAt: existing?.createdAt ?? createdAt,
    updatedAt,
    createdBy: existing?.createdBy ?? { uid: user.uid, role: user.role },
    updatedBy: { uid: user.uid, role: user.role }
  };
}

function pickPublicProject(doc: ProjectDoc): PublicProjectDoc {
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    slug: doc.slug,
    name: doc.name,
    type: doc.type,
    status: doc.status,
    location: doc.location,
    priceRange: doc.priceRange,
    possessionDate: doc.possessionDate,
    amenities: doc.amenities,
    highlights: doc.highlights,
    media: doc.media,
    visibility: doc.visibility,
    counts: doc.counts,
    createdAt: (doc.createdAt as FirebaseFirestore.Timestamp) ?? undefined,
    updatedAt: (doc.updatedAt as FirebaseFirestore.Timestamp) ?? undefined
  };
}

async function syncPublicProject(tenantId: string, projectId: string) {
  const snap = await projectsCollection(tenantId).doc(projectId).get();
  if (!snap.exists) throw new Error("Not found");
  const data = snap.data() as ProjectDoc;
  if (!data?.visibility || data.visibility.state !== "published") return;
  await publicProjectsCollection().doc(projectId).set(deepStripUndefined(pickPublicProject(data)));
}

async function deletePublicProject(projectId: string) {
  await publicProjectsCollection().doc(projectId).delete();
}

async function syncPublicUnit(unit: UnitDoc) {
  const doc: PublicUnitDoc = {
    id: `${unit.projectId}_${unit.id}`,
    projectId: unit.projectId,
    unitId: unit.id,
    tenantId: unit.tenantId,
    type: unit.type,
    areaSqFt: unit.areaSqFt,
    carpetSqFt: unit.carpetSqFt,
    builtUpSqFt: unit.builtUpSqFt,
    price: unit.price,
    floor: unit.floor,
    facing: unit.facing,
    availability: unit.availability,
    media: unit.media,
    createdAt: (unit.createdAt as FirebaseFirestore.Timestamp) ?? undefined,
    updatedAt: (unit.updatedAt as FirebaseFirestore.Timestamp) ?? undefined
  };
  await publicProjectUnitsCollection().doc(doc.id).set(deepStripUndefined(doc));
}

async function deletePublicUnits(projectId: string) {
  const snap = await publicProjectUnitsCollection().where("projectId", "==", projectId).get();
  if (snap.empty) return;
  const batch = firestore.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

function countDelta(oldAvailability?: string, newAvailability?: string) {
  const wasAvailable = oldAvailability === "available";
  const isAvailable = newAvailability === "available";
  return {
    totalDelta: oldAvailability ? 0 : 1,
    availableDelta: (isAvailable ? 1 : 0) - (wasAvailable ? 1 : 0)
  };
}

export function calculateUnitAvailabilityDelta(oldAvailability?: string, newAvailability?: string) {
  return countDelta(oldAvailability, newAvailability);
}

export async function createProject(input: {
  tenantId?: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const payload = ProjectCreateSchema.parse(input.body);
  const slug = payload.slug ? slugify(payload.slug, 80) : await generateSlug(tenantId, payload.name);
  const uniqueSlug = await ensureUniqueSlug(tenantId, slug);
  ensureMediaPathsSafe(tenantId, payload.media);

  const ref = projectsCollection(tenantId).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const doc = buildProjectDoc(
    { ...payload, slug: uniqueSlug },
    tenantId,
    ref.id,
    input.user,
    now,
    now
  );
  await ref.set(deepStripUndefined(doc));
  return { id: ref.id };
}

export async function updateProject(input: {
  tenantId?: string;
  projectId: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const patch = ProjectUpdateSchema.parse(input.body);

  const ref = projectsCollection(tenantId).doc(input.projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const existing = snap.data() as ProjectDoc;

  const nextSlug = patch.slug ? slugify(patch.slug, 80) : existing.slug;
  const uniqueSlug = await ensureUniqueSlug(tenantId, nextSlug, input.projectId);

  const merged: ProjectCreateInput & { slug: string } = {
    name: patch.name ?? existing.name,
    slug: uniqueSlug,
    enterpriseId: patch.enterpriseId ?? existing.enterpriseId,
    type: patch.type ?? existing.type,
    status: patch.status ?? existing.status,
    rera: patch.rera ?? existing.rera,
    location: {
      ...(existing.location || {}),
      ...(patch.location || {})
    },
    priceRange: patch.priceRange ?? existing.priceRange,
    possessionDate: patch.possessionDate ?? existing.possessionDate,
    amenities: patch.amenities ?? existing.amenities,
    highlights: patch.highlights ?? existing.highlights,
    media: patch.media
      ? {
          ...(existing.media || {}),
          ...patch.media,
          gallery: patch.media.gallery ?? existing.media?.gallery,
          cover: patch.media.cover ?? existing.media?.cover,
          brochure: patch.media.brochure ?? existing.media?.brochure
        }
      : existing.media
  };

  ensureMediaPathsSafe(tenantId, merged.media);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const doc = buildProjectDoc(merged, tenantId, input.projectId, input.user, now, now, existing);
  await ref.set(deepStripUndefined(doc), { merge: true });

  if (doc.visibility.state === "published") {
    await syncPublicProject(tenantId, input.projectId);
  }

  return { id: input.projectId };
}

export async function deleteProject(input: {
  tenantId?: string;
  projectId: string;
  user: AuthUser;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");

  const unitsSnap = await unitsCollection(tenantId, input.projectId).get();
  const batch = firestore.batch();
  unitsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();

  await deletePublicProject(input.projectId);
  await deletePublicUnits(input.projectId);

  return { ok: true };
}

export async function getProject(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const snap = await projectsCollection(tenantId).doc(input.projectId).get();
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

export async function listProjects(input: {
  tenantId?: string;
  user: AuthUser;
  query: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const parsed = ProjectListQuerySchema.parse(input.query ?? {});

  let ref: FirebaseFirestore.Query = projectsCollection(tenantId);
  if (parsed.type) ref = ref.where("type", "==", parsed.type);
  if (parsed.status) ref = ref.where("status", "==", parsed.status);
  if (parsed.visibility) ref = ref.where("visibility.state", "==", parsed.visibility);

  ref = ref.orderBy("updatedAt", "desc");
  ref = ref.orderBy(FieldPath.documentId(), "desc");
  const limit = Math.min(Number(parsed.limit || 50), 100);
  const cursor = parseCursor(parsed.cursor);
  if (cursor) {
    ref = ref.startAfter(cursor.updatedAt, cursor.id);
  }
  const snap = await ref.limit(limit).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const filtered = parsed.q
    ? items.filter((item: any) => {
        const q = parsed.q?.toLowerCase() || "";
        return (
          item.name?.toLowerCase().includes(q) ||
          item.slug?.toLowerCase().includes(q) ||
          item.location?.city?.toLowerCase().includes(q)
        );
      })
    : items;

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor = last ? toCursor(last.get("updatedAt"), last.id) : undefined;

  return { items: filtered, nextCursor };
}

export async function publishProject(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    {
      visibility: { state: "published", publishedAt: now },
      updatedAt: now,
      updatedBy: { uid: input.user.uid, role: input.user.role }
    },
    { merge: true }
  );

  await syncPublicProject(tenantId, input.projectId);

  const unitsSnap = await unitsCollection(tenantId, input.projectId).get();
  for (const doc of unitsSnap.docs) {
    const unit = doc.data() as UnitDoc;
    await syncPublicUnit({ ...unit, id: doc.id });
  }

  return { ok: true };
}

export async function unpublishProject(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    {
      visibility: { state: "draft", publishedAt: admin.firestore.FieldValue.delete() },
      updatedAt: now,
      updatedBy: { uid: input.user.uid, role: input.user.role }
    },
    { merge: true }
  );
  await deletePublicProject(input.projectId);
  await deletePublicUnits(input.projectId);
  return { ok: true };
}

export async function createUnit(input: {
  tenantId?: string;
  projectId: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const payload = UnitCreateSchema.parse(input.body);
  ensureUnitMediaPathsSafe(tenantId, payload.media);

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const unitRef = unitsCollection(tenantId, input.projectId).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let projectVisibility: ProjectDoc["visibility"] | undefined;

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;

    const unitDoc: UnitDoc = {
      id: unitRef.id,
      projectId: input.projectId,
      tenantId,
      type: payload.type,
      availability: payload.availability,
      areaSqFt: payload.areaSqFt,
      carpetSqFt: payload.carpetSqFt,
      builtUpSqFt: payload.builtUpSqFt,
      price: payload.price,
      floor: payload.floor,
      facing: payload.facing,
      media: payload.media,
      createdAt: now,
      updatedAt: now
    };

    tx.set(unitRef, deepStripUndefined(unitDoc));
    const delta = countDelta(undefined, payload.availability);
    tx.set(
      projectRef,
      {
        counts: {
          totalUnits: admin.firestore.FieldValue.increment(delta.totalDelta),
          availableUnits: admin.firestore.FieldValue.increment(delta.availableDelta)
        },
        updatedAt: now
      },
      { merge: true }
    );
  });

  if (projectVisibility?.state === "published") {
    const unitSnap = await unitRef.get();
    if (unitSnap.exists) {
      await syncPublicUnit(unitSnap.data() as UnitDoc);
      await syncPublicProject(tenantId, input.projectId);
    }
  }

  return { id: unitRef.id };
}

export async function updateUnit(input: {
  tenantId?: string;
  projectId: string;
  unitId: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const patch = UnitUpdateSchema.parse(input.body);
  ensureUnitMediaPathsSafe(tenantId, patch.media);

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const unitRef = unitsCollection(tenantId, input.projectId).doc(input.unitId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  let projectVisibility: ProjectDoc["visibility"] | undefined;

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;

    const unitSnap = await tx.get(unitRef);
    if (!unitSnap.exists) throw new Error("Not found");
    const existing = unitSnap.data() as UnitDoc;

    const nextAvailability = patch.availability ?? existing.availability;
    const delta = countDelta(existing.availability, nextAvailability);

    tx.set(
      unitRef,
      deepStripUndefined({
        ...existing,
        ...patch,
        availability: nextAvailability,
        updatedAt: now
      }),
      { merge: true }
    );
    if (delta.availableDelta !== 0) {
      tx.set(
        projectRef,
        {
          counts: {
            availableUnits: admin.firestore.FieldValue.increment(delta.availableDelta)
          },
          updatedAt: now
        },
        { merge: true }
      );
    } else {
      tx.set(projectRef, { updatedAt: now }, { merge: true });
    }
  });

  if (projectVisibility?.state === "published") {
    const unitSnap = await unitRef.get();
    if (unitSnap.exists) {
      await syncPublicUnit(unitSnap.data() as UnitDoc);
      await syncPublicProject(tenantId, input.projectId);
    }
  }

  return { id: input.unitId };
}

export async function deleteUnit(input: {
  tenantId?: string;
  projectId: string;
  unitId: string;
  user: AuthUser;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const unitRef = unitsCollection(tenantId, input.projectId).doc(input.unitId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  let projectVisibility: ProjectDoc["visibility"] | undefined;
  let availability: UnitDoc["availability"] | undefined;

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;

    const unitSnap = await tx.get(unitRef);
    if (!unitSnap.exists) throw new Error("Not found");
    const existing = unitSnap.data() as UnitDoc;
    availability = existing.availability;

    tx.delete(unitRef);
    const delta = countDelta(existing.availability, undefined);
    tx.set(
      projectRef,
      {
        counts: {
          totalUnits: admin.firestore.FieldValue.increment(-1),
          availableUnits: admin.firestore.FieldValue.increment(delta.availableDelta)
        },
        updatedAt: now
      },
      { merge: true }
    );
  });

  if (projectVisibility?.state === "published") {
    await publicProjectUnitsCollection().doc(`${input.projectId}_${input.unitId}`).delete();
    await syncPublicProject(tenantId, input.projectId);
  }

  return { ok: true, availability };
}

export async function listUnits(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const snap = await unitsCollection(tenantId, input.projectId).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { items };
}

export async function publicListProjects(query: unknown) {
  const parsed = PublicProjectListQuerySchema.parse(query ?? {});
  let ref: FirebaseFirestore.Query = publicProjectsCollection().where("visibility.state", "==", "published");
  if (parsed.city) ref = ref.where("location.city", "==", parsed.city);
  if (parsed.type) ref = ref.where("type", "==", parsed.type);
  if (parsed.status) ref = ref.where("status", "==", parsed.status);
  ref = ref.orderBy("updatedAt", "desc");
  ref = ref.orderBy(FieldPath.documentId(), "desc");

  const limit = Math.min(Number(parsed.limit || 50), 100);
  const cursor = parseCursor(parsed.cursor);
  if (cursor) {
    ref = ref.startAfter(cursor.updatedAt, cursor.id);
  }
  const snap = await ref.limit(limit).get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (parsed.q) {
    const q = parsed.q.toLowerCase();
    items = items.filter((item: any) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.slug?.toLowerCase().includes(q) ||
        item.location?.city?.toLowerCase().includes(q) ||
        item.location?.area?.toLowerCase().includes(q)
      );
    });
  }

  if (parsed.minPrice || parsed.maxPrice) {
    const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
    const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
    items = items.filter((item: any) => {
      const priceMin = item.priceRange?.min ?? item.priceRange?.max;
      const priceMax = item.priceRange?.max ?? item.priceRange?.min;
      if (min && priceMax !== undefined && priceMax < min) return false;
      if (max && priceMin !== undefined && priceMin > max) return false;
      return true;
    });
  }

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor = last ? toCursor(last.get("updatedAt"), last.id) : undefined;
  return { items, nextCursor };
}

export async function publicGetProject(slug: string) {
  const snap = await publicProjectsCollection()
    .where("slug", "==", slug)
    .where("visibility.state", "==", "published")
    .limit(1)
    .get();
  if (snap.empty) throw new Error("Not found");
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function publicListProjectUnits(slug: string) {
  const project = await publicGetProject(slug);
  const snap = await publicProjectUnitsCollection().where("projectId", "==", project.id).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { items };
}
