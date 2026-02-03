"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeUniqueSlug = computeUniqueSlug;
exports.calculateUnitAvailabilityDelta = calculateUnitAvailabilityDelta;
exports.createProject = createProject;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
exports.getProject = getProject;
exports.listProjects = listProjects;
exports.publishProject = publishProject;
exports.unpublishProject = unpublishProject;
exports.createUnit = createUnit;
exports.updateUnit = updateUnit;
exports.deleteUnit = deleteUnit;
exports.listUnits = listUnits;
exports.publicListProjects = publicListProjects;
exports.publicGetProject = publicGetProject;
exports.publicListProjectUnits = publicListProjectUnits;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const slugify_1 = require("../../utils/slugify");
const objectPath_1 = require("../../utils/objectPath");
const properties_service_1 = require("../properties/properties.service");
const projects_schemas_1 = require("./projects.schemas");
const projects_repo_1 = require("./projects.repo");
const publicProjectsCollection = () => firebase_1.firestore.collection("publicProjects");
const publicProjectUnitsCollection = () => firebase_1.firestore.collection("publicProjectUnits");
function unitsCollection(tenantId, projectId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("projects").doc(projectId).collection("units");
}
function isPlatformAdmin(user) {
    if (user.role === "platform_admin")
        return true;
    return env_1.env.platformAdminUids.includes(user.uid);
}
function isAdmin(user) {
    return user.role === "tenant_admin" || user.role === "client_admin" || isPlatformAdmin(user);
}
function resolveTenantId(user, provided) {
    if (isPlatformAdmin(user)) {
        if (!provided)
            throw new Error("TENANT_ID_REQUIRED");
        return provided;
    }
    if (!user.tenantId)
        throw new Error("TENANT_ID_REQUIRED");
    if (provided && provided !== user.tenantId)
        throw new Error("Forbidden");
    return user.tenantId;
}
function parseCursor(cursor) {
    if (!cursor)
        return null;
    const [ms, id] = cursor.split(":");
    const value = Number(ms);
    if (!id || Number.isNaN(value)) {
        throw new Error("INVALID_CURSOR");
    }
    return { updatedAt: firebase_admin_1.default.firestore.Timestamp.fromMillis(value), id };
}
function toCursor(updatedAt, id) {
    if (!updatedAt || !id)
        return undefined;
    return `${updatedAt.toMillis()}:${id}`;
}
function ensureMediaPathsSafe(tenantId, media) {
    if (!media)
        return;
    const paths = [];
    if (media.cover?.objectPath)
        paths.push(media.cover.objectPath);
    media.gallery?.forEach((m) => m?.objectPath && paths.push(m.objectPath));
    if (media.brochure?.objectPath)
        paths.push(media.brochure.objectPath);
    paths.forEach((p) => {
        if (!(0, objectPath_1.isSafeObjectPath)(p))
            throw new Error("Invalid media object path");
        (0, objectPath_1.requireTenantScopedPath)(tenantId, p);
    });
}
function ensureUnitMediaPathsSafe(tenantId, media) {
    if (!media?.floorPlan?.objectPath)
        return;
    const path = media.floorPlan.objectPath;
    if (!(0, objectPath_1.isSafeObjectPath)(path))
        throw new Error("Invalid media object path");
    (0, objectPath_1.requireTenantScopedPath)(tenantId, path);
}
function randomSuffix() {
    return Math.random().toString(36).slice(2, 6);
}
function computeUniqueSlug(baseSlug, existing) {
    let candidate = baseSlug;
    let attempt = 2;
    const existingSet = new Set(existing);
    while (existingSet.has(candidate)) {
        candidate = `${baseSlug}-${attempt}`;
        attempt += 1;
    }
    return candidate;
}
async function ensureUniqueSlug(tenantId, baseSlug, projectId) {
    let candidate = baseSlug;
    let attempt = 2;
    while (true) {
        const snap = await (0, projects_repo_1.projectsCollection)(tenantId).where("slug", "==", candidate).get();
        const conflict = snap.docs.find((doc) => doc.id !== projectId);
        if (!conflict)
            return candidate;
        candidate = `${baseSlug}-${attempt}`;
        attempt += 1;
    }
}
async function generateSlug(tenantId, name, projectId) {
    const base = (0, slugify_1.slugify)(name, 80) || "project";
    const withSuffix = `${base}-${randomSuffix()}`;
    return ensureUniqueSlug(tenantId, withSuffix, projectId);
}
function buildProjectDoc(input, tenantId, projectId, user, createdAt, updatedAt, existing) {
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
function pickPublicProject(doc) {
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
        createdAt: doc.createdAt ?? undefined,
        updatedAt: doc.updatedAt ?? undefined
    };
}
async function syncPublicProject(tenantId, projectId) {
    const snap = await (0, projects_repo_1.projectsCollection)(tenantId).doc(projectId).get();
    if (!snap.exists)
        throw new Error("Not found");
    const data = snap.data();
    if (!data?.visibility || data.visibility.state !== "published")
        return;
    await publicProjectsCollection().doc(projectId).set((0, properties_service_1.deepStripUndefined)(pickPublicProject(data)));
}
async function deletePublicProject(projectId) {
    await publicProjectsCollection().doc(projectId).delete();
}
async function syncPublicUnit(unit) {
    const doc = {
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
        createdAt: unit.createdAt ?? undefined,
        updatedAt: unit.updatedAt ?? undefined
    };
    await publicProjectUnitsCollection().doc(doc.id).set((0, properties_service_1.deepStripUndefined)(doc));
}
async function deletePublicUnits(projectId) {
    const snap = await publicProjectUnitsCollection().where("projectId", "==", projectId).get();
    if (snap.empty)
        return;
    const batch = firebase_1.firestore.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}
function countDelta(oldAvailability, newAvailability) {
    const wasAvailable = oldAvailability === "available";
    const isAvailable = newAvailability === "available";
    return {
        totalDelta: oldAvailability ? 0 : 1,
        availableDelta: (isAvailable ? 1 : 0) - (wasAvailable ? 1 : 0)
    };
}
function calculateUnitAvailabilityDelta(oldAvailability, newAvailability) {
    return countDelta(oldAvailability, newAvailability);
}
async function createProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const payload = projects_schemas_1.ProjectCreateSchema.parse(input.body);
    const slug = payload.slug ? (0, slugify_1.slugify)(payload.slug, 80) : await generateSlug(tenantId, payload.name);
    const uniqueSlug = await ensureUniqueSlug(tenantId, slug);
    ensureMediaPathsSafe(tenantId, payload.media);
    const ref = (0, projects_repo_1.projectsCollection)(tenantId).doc();
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const doc = buildProjectDoc({ ...payload, slug: uniqueSlug }, tenantId, ref.id, input.user, now, now);
    await ref.set((0, properties_service_1.deepStripUndefined)(doc));
    return { id: ref.id };
}
async function updateProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const patch = projects_schemas_1.ProjectUpdateSchema.parse(input.body);
    const ref = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const existing = snap.data();
    const nextSlug = patch.slug ? (0, slugify_1.slugify)(patch.slug, 80) : existing.slug;
    const uniqueSlug = await ensureUniqueSlug(tenantId, nextSlug, input.projectId);
    const merged = {
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
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const doc = buildProjectDoc(merged, tenantId, input.projectId, input.user, now, now, existing);
    await ref.set((0, properties_service_1.deepStripUndefined)(doc), { merge: true });
    if (doc.visibility.state === "published") {
        await syncPublicProject(tenantId, input.projectId);
    }
    return { id: input.projectId };
}
async function deleteProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const ref = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const unitsSnap = await unitsCollection(tenantId, input.projectId).get();
    const batch = firebase_1.firestore.batch();
    unitsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(ref);
    await batch.commit();
    await deletePublicProject(input.projectId);
    await deletePublicUnits(input.projectId);
    return { ok: true };
}
async function getProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const snap = await (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId).get();
    if (!snap.exists)
        throw new Error("Not found");
    return { id: snap.id, ...snap.data() };
}
async function listProjects(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const parsed = projects_schemas_1.ProjectListQuerySchema.parse(input.query ?? {});
    let ref = (0, projects_repo_1.projectsCollection)(tenantId);
    if (parsed.type)
        ref = ref.where("type", "==", parsed.type);
    if (parsed.status)
        ref = ref.where("status", "==", parsed.status);
    if (parsed.visibility)
        ref = ref.where("visibility.state", "==", parsed.visibility);
    ref = ref.orderBy("updatedAt", "desc");
    ref = ref.orderBy(firestore_1.FieldPath.documentId(), "desc");
    const limit = Math.min(Number(parsed.limit || 50), 100);
    const cursor = parseCursor(parsed.cursor);
    if (cursor) {
        ref = ref.startAfter(cursor.updatedAt, cursor.id);
    }
    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const filtered = parsed.q
        ? items.filter((item) => {
            const q = parsed.q?.toLowerCase() || "";
            return (item.name?.toLowerCase().includes(q) ||
                item.slug?.toLowerCase().includes(q) ||
                item.location?.city?.toLowerCase().includes(q));
        })
        : items;
    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last ? toCursor(last.get("updatedAt"), last.id) : undefined;
    return { items: filtered, nextCursor };
}
async function publishProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const ref = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set({
        visibility: { state: "published", publishedAt: now },
        updatedAt: now,
        updatedBy: { uid: input.user.uid, role: input.user.role }
    }, { merge: true });
    await syncPublicProject(tenantId, input.projectId);
    const unitsSnap = await unitsCollection(tenantId, input.projectId).get();
    for (const doc of unitsSnap.docs) {
        const unit = doc.data();
        await syncPublicUnit({ ...unit, id: doc.id });
    }
    return { ok: true };
}
async function unpublishProject(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const ref = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set({
        visibility: { state: "draft", publishedAt: firebase_admin_1.default.firestore.FieldValue.delete() },
        updatedAt: now,
        updatedBy: { uid: input.user.uid, role: input.user.role }
    }, { merge: true });
    await deletePublicProject(input.projectId);
    await deletePublicUnits(input.projectId);
    return { ok: true };
}
async function createUnit(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const payload = projects_schemas_1.UnitCreateSchema.parse(input.body);
    ensureUnitMediaPathsSafe(tenantId, payload.media);
    const projectRef = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const unitRef = unitsCollection(tenantId, input.projectId).doc();
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    let projectVisibility;
    await firebase_1.firestore.runTransaction(async (tx) => {
        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists)
            throw new Error("Not found");
        const project = projectSnap.data();
        projectVisibility = project.visibility;
        const unitDoc = {
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
        tx.set(unitRef, (0, properties_service_1.deepStripUndefined)(unitDoc));
        const delta = countDelta(undefined, payload.availability);
        tx.set(projectRef, {
            counts: {
                totalUnits: firebase_admin_1.default.firestore.FieldValue.increment(delta.totalDelta),
                availableUnits: firebase_admin_1.default.firestore.FieldValue.increment(delta.availableDelta)
            },
            updatedAt: now
        }, { merge: true });
    });
    if (projectVisibility?.state === "published") {
        const unitSnap = await unitRef.get();
        if (unitSnap.exists) {
            await syncPublicUnit(unitSnap.data());
            await syncPublicProject(tenantId, input.projectId);
        }
    }
    return { id: unitRef.id };
}
async function updateUnit(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const patch = projects_schemas_1.UnitUpdateSchema.parse(input.body);
    ensureUnitMediaPathsSafe(tenantId, patch.media);
    const projectRef = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const unitRef = unitsCollection(tenantId, input.projectId).doc(input.unitId);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    let projectVisibility;
    await firebase_1.firestore.runTransaction(async (tx) => {
        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists)
            throw new Error("Not found");
        const project = projectSnap.data();
        projectVisibility = project.visibility;
        const unitSnap = await tx.get(unitRef);
        if (!unitSnap.exists)
            throw new Error("Not found");
        const existing = unitSnap.data();
        const nextAvailability = patch.availability ?? existing.availability;
        const delta = countDelta(existing.availability, nextAvailability);
        tx.set(unitRef, (0, properties_service_1.deepStripUndefined)({
            ...existing,
            ...patch,
            availability: nextAvailability,
            updatedAt: now
        }), { merge: true });
        if (delta.availableDelta !== 0) {
            tx.set(projectRef, {
                counts: {
                    availableUnits: firebase_admin_1.default.firestore.FieldValue.increment(delta.availableDelta)
                },
                updatedAt: now
            }, { merge: true });
        }
        else {
            tx.set(projectRef, { updatedAt: now }, { merge: true });
        }
    });
    if (projectVisibility?.state === "published") {
        const unitSnap = await unitRef.get();
        if (unitSnap.exists) {
            await syncPublicUnit(unitSnap.data());
            await syncPublicProject(tenantId, input.projectId);
        }
    }
    return { id: input.unitId };
}
async function deleteUnit(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const projectRef = (0, projects_repo_1.projectsCollection)(tenantId).doc(input.projectId);
    const unitRef = unitsCollection(tenantId, input.projectId).doc(input.unitId);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    let projectVisibility;
    let availability;
    await firebase_1.firestore.runTransaction(async (tx) => {
        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists)
            throw new Error("Not found");
        const project = projectSnap.data();
        projectVisibility = project.visibility;
        const unitSnap = await tx.get(unitRef);
        if (!unitSnap.exists)
            throw new Error("Not found");
        const existing = unitSnap.data();
        availability = existing.availability;
        tx.delete(unitRef);
        const delta = countDelta(existing.availability, undefined);
        tx.set(projectRef, {
            counts: {
                totalUnits: firebase_admin_1.default.firestore.FieldValue.increment(-1),
                availableUnits: firebase_admin_1.default.firestore.FieldValue.increment(delta.availableDelta)
            },
            updatedAt: now
        }, { merge: true });
    });
    if (projectVisibility?.state === "published") {
        await publicProjectUnitsCollection().doc(`${input.projectId}_${input.unitId}`).delete();
        await syncPublicProject(tenantId, input.projectId);
    }
    return { ok: true, availability };
}
async function listUnits(input) {
    if (!isAdmin(input.user))
        throw new Error("Forbidden");
    const tenantId = resolveTenantId(input.user, input.tenantId);
    const snap = await unitsCollection(tenantId, input.projectId).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { items };
}
async function publicListProjects(query) {
    const parsed = projects_schemas_1.PublicProjectListQuerySchema.parse(query ?? {});
    let ref = publicProjectsCollection().where("visibility.state", "==", "published");
    if (parsed.city)
        ref = ref.where("location.city", "==", parsed.city);
    if (parsed.type)
        ref = ref.where("type", "==", parsed.type);
    if (parsed.status)
        ref = ref.where("status", "==", parsed.status);
    ref = ref.orderBy("updatedAt", "desc");
    ref = ref.orderBy(firestore_1.FieldPath.documentId(), "desc");
    const limit = Math.min(Number(parsed.limit || 50), 100);
    const cursor = parseCursor(parsed.cursor);
    if (cursor) {
        ref = ref.startAfter(cursor.updatedAt, cursor.id);
    }
    const snap = await ref.limit(limit).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (parsed.q) {
        const q = parsed.q.toLowerCase();
        items = items.filter((item) => {
            return (item.name?.toLowerCase().includes(q) ||
                item.slug?.toLowerCase().includes(q) ||
                item.location?.city?.toLowerCase().includes(q) ||
                item.location?.area?.toLowerCase().includes(q));
        });
    }
    if (parsed.minPrice || parsed.maxPrice) {
        const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
        const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
        items = items.filter((item) => {
            const priceMin = item.priceRange?.min ?? item.priceRange?.max;
            const priceMax = item.priceRange?.max ?? item.priceRange?.min;
            if (min && priceMax !== undefined && priceMax < min)
                return false;
            if (max && priceMin !== undefined && priceMin > max)
                return false;
            return true;
        });
    }
    const last = snap.docs[snap.docs.length - 1];
    const nextCursor = last ? toCursor(last.get("updatedAt"), last.id) : undefined;
    return { items, nextCursor };
}
async function publicGetProject(slug) {
    const snap = await publicProjectsCollection()
        .where("slug", "==", slug)
        .where("visibility.state", "==", "published")
        .limit(1)
        .get();
    if (snap.empty)
        throw new Error("Not found");
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}
async function publicListProjectUnits(slug) {
    const project = await publicGetProject(slug);
    const snap = await publicProjectUnitsCollection().where("projectId", "==", project.id).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { items };
}
