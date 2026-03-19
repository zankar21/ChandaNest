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
  PublicProjectUnitsQuerySchema,
  UnitCreateInput,
  UnitCreateSchema,
  UnitBulkCreateSchema,
  validateUnitMergedStrict,
  validateUnitStrict,
  UnitUpdateInput,
  UnitUpdateSchema
} from "./projects.schemas";
import { projectsCollection } from "./projects.repo";
import { ProjectDoc, PublicProjectDoc, PublicUnitDoc, UnitDoc } from "./projects.types";
import { observeCompatibility } from "../monetization/compat.service";
import {
  adjustBuilderUsageCacheCounters,
  assertBuilderProjectCap,
  assertBuilderSubscriptionEntitlement,
  assertBuilderUnitCap,
  isBuilderPublishedProject,
  isProjectReraFormatValid,
  isProjectReraGraceAllowed,
  isProjectReraMissing,
  shouldApplyBuilderMonetization,
  shouldProjectPublishRequireRera
} from "../monetization/builder.service";

type Cursor = { updatedAt: FirebaseFirestore.Timestamp; id: string } | null;
type PublishIssueSeverity = "error" | "warning";
export type ProjectPublishIssue = {
  code: string;
  message: string;
  blocking: boolean;
  severity: PublishIssueSeverity;
  field?: string;
  meta?: Record<string, unknown>;
};

const publicProjectsCollection = () => firestore.collection("publicProjects");
const publicProjectUnitsCollection = () => firestore.collection("publicProjectUnits");

function unitsCollection(tenantId: string, projectId: string) {
  return firestore.collection("tenants").doc(tenantId).collection("projects").doc(projectId).collection("units");
}

function isPlatformAdmin(user: AuthUser) {
  if (user.role === "platform_admin" || user.role === "master_admin") return true;
  if (env.platformAdminUids.includes(user.uid)) return true;
  return env.platformAdminEmails.includes(user.email.toLowerCase());
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

function toMillisSafe(value: any): number | null {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value.seconds != null) {
    const seconds = Number(value.seconds);
    const nanos = Number(value.nanoseconds ?? 0);
    if (!Number.isNaN(seconds)) {
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return null;
}

function toCursor(updatedAt?: FirebaseFirestore.Timestamp, id?: string) {
  if (!updatedAt || !id) return undefined;
  const ms = toMillisSafe(updatedAt);
  if (!ms) return undefined;
  return `${ms}:${id}`;
}

function normalizeCity(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function parseBhkFromType(value?: string | null) {
  if (!value) return null;
  const match = value.toLowerCase().match(/(\d+)\s*bhk/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
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

function ensureDeveloperMediaPathsSafe(tenantId: string, developer?: ProjectCreateInput["developer"]) {
  const path = developer?.logo?.objectPath;
  if (!path) return;
  if (!isSafeObjectPath(path)) throw new Error("Invalid media object path");
  requireTenantScopedPath(tenantId, path);
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
  if (!input.location?.city) {
    throw new Error("location.city is required");
  }
  const category = input.category ?? inferCategoryFromType(input.type);
  const nextLocation = {
    ...input.location,
    cityNormalized: normalizeCity(input.location.city),
    citySlug: input.location.citySlug || slugify(input.location.city, 80)
  };
  const inventory = input.inventory
    ? {
        totalUnits: input.inventory.totalUnits,
        availableUnits: input.inventory.availableUnits,
        towers: input.inventory.towers,
        floors: input.inventory.floors,
        parking: input.inventory.parking
      }
    : undefined;
  const canonicalPlotInventories =
    category === "plotted"
      ? input.plotDetails?.plotInventories?.filter((item) => {
          const sizeValue = item.sizeValue ?? item.sizeSqFt;
          const isActive =
            sizeValue != null ||
            item.count != null ||
            item.frontageFt != null ||
            item.depthFt != null ||
            Boolean(item.label);
          return isActive && sizeValue != null && sizeValue > 0 && (item.count || 0) > 0 && Boolean(item.sizeUnit);
        })
      : input.plotDetails?.plotInventories;
  const canonicalPlotDetails =
    category === "plotted" && input.plotDetails
      ? {
          ...input.plotDetails,
          plotInventories: canonicalPlotInventories?.length ? canonicalPlotInventories : undefined,
          totalPlotsPlanned:
            (canonicalPlotInventories || []).reduce((sum, item) => {
              const sizeValue = item.sizeValue ?? item.sizeSqFt;
              return sizeValue != null && sizeValue > 0 && (item.count || 0) > 0 ? sum + (item.count || 0) : sum;
            }, 0)
        }
      : input.plotDetails;
  return {
    id: projectId,
    tenantId,
    enterpriseId: input.enterpriseId,
    developerName: input.developerName,
    developer: input.developer,
    name: input.name,
    slug: input.slug,
    category,
    type: input.type,
    lifecycleStatus: input.lifecycleStatus,
    recordStatus: input.recordStatus,
    possessionStatus: input.possessionStatus,
    rera: input.rera,
    approvals: category === "plotted" ? undefined : input.approvals,
    launchDate: input.launchDate,
    completionDate: input.completionDate,
    totalUnitsPlanned:
      input.totalUnitsPlanned ??
      (existing?.inventory as any)?.totalUnitsPlanned ??
      existing?.totalUnitsPlanned,
    configurationMix: input.configurationMix,
    commercialMix: input.commercialMix,
    inventory,
    plotDetails: canonicalPlotDetails,
    commercialDetails: input.commercialDetails,
    salesStatus: input.salesStatus,
    flags: input.flags,
    seo: input.seo,
    mixedIncludes: input.mixedIncludes,
    mixedUseIncludes: input.mixedUseIncludes ?? input.mixedIncludes,
    mixedDetails: input.mixedDetails,
    location: nextLocation,
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
  const minPrice = doc.priceRange?.min ?? null;
  const maxPrice = doc.priceRange?.max ?? null;
  const startingPrice = minPrice ?? maxPrice ?? null;
  const availableUnits = doc.counts?.availableUnits ?? doc.inventory?.availableUnits ?? null;
  const totalUnits = doc.counts?.totalUnits ?? doc.inventory?.totalUnits ?? null;
  const bhkTypes = doc.configurationMix
    ? (Object.entries(doc.configurationMix)
        .filter(([, value]) => Number(value) > 0)
        .map(([key]) => Number(key.replace("bhk", "")))
        .filter((value) => Number.isFinite(value)) as number[])
    : [];
  const coverObjectPath = doc.media?.cover?.objectPath ?? null;
  const citySlug = doc.location.citySlug || slugify(doc.location.city, 80);
  const updatedAtMs = toMillisSafe(doc.updatedAt);
  const lifecycleStatus = doc.lifecycleStatus ?? doc.status ?? "planning";
  const totalUnitsPlanned = doc.totalUnitsPlanned ?? (doc.inventory as any)?.totalUnitsPlanned;
  const recordStatus = doc.recordStatus ?? "active";
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    slug: doc.slug,
    name: doc.name,
    category: doc.category,
    type: doc.type,
    status: lifecycleStatus,
    lifecycleStatus,
    recordStatus,
    developerName: doc.developerName,
    developer: doc.developer,
    possessionStatus: doc.possessionStatus,
    rera: doc.rera,
    approvals: doc.category === "plotted" ? undefined : doc.approvals,
    launchDate: doc.launchDate,
    completionDate: doc.completionDate,
    totalUnitsPlanned,
    configurationMix: doc.configurationMix,
    commercialMix: doc.commercialMix,
    plotDetails: doc.plotDetails,
    commercialDetails: doc.commercialDetails,
    salesStatus: doc.salesStatus,
    flags: doc.flags
      ? {
          featured: doc.flags.featured,
          verified: doc.flags.verified
        }
      : undefined,
    mixedIncludes: doc.mixedIncludes,
    mixedUseIncludes: doc.mixedUseIncludes ?? doc.mixedIncludes,
    mixedDetails: doc.mixedDetails,
    location: {
      ...doc.location,
      cityNormalized: doc.location.cityNormalized || normalizeCity(doc.location.city),
      citySlug
    },
    priceRange: doc.priceRange,
    possessionDate: doc.possessionDate,
    seo: doc.seo,
    amenities: doc.amenities,
    highlights: doc.highlights,
    media: doc.media,
    visibility: doc.visibility,
    counts: doc.counts,
    monetization: doc.monetization,
    city: doc.location.city,
    citySlug,
    area: doc.location.area ?? null,
    minPrice,
    maxPrice,
    startingPrice,
    availableUnits,
    totalUnits,
    bhkTypes,
    coverObjectPath,
    coverUrl: null,
    updatedAtMs,
    createdAt: (doc.createdAt as FirebaseFirestore.Timestamp) ?? undefined,
    updatedAt: (doc.updatedAt as FirebaseFirestore.Timestamp) ?? undefined
  };
}

function normalizeProjectResponse(doc: ProjectDoc, id: string) {
  const lifecycleStatus = doc.lifecycleStatus ?? doc.status ?? "planning";
  const totalUnitsPlanned = doc.totalUnitsPlanned ?? (doc.inventory as any)?.totalUnitsPlanned;
  return {
    ...doc,
    id,
    status: lifecycleStatus,
    lifecycleStatus,
    totalUnitsPlanned
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
  const area = unit.area;
  const pricing = unit.pricing;
  const floorInfo = unit.floorInfo;
  const projectSnap = await projectsCollection(unit.tenantId).doc(unit.projectId).get();
  const project = projectSnap.exists ? (projectSnap.data() as ProjectDoc) : null;
  const projectSlug = project?.slug;
  const city = project?.location?.city;
  const citySlug = project?.location?.citySlug || (city ? slugify(city, 80) : undefined);
  const bhk = unit.bhk ?? parseBhkFromType(unit.type);
  const priceNumber = pricing?.basePrice ?? pricing?.allInclusivePrice ?? unit.price ?? null;
  const areaSqFtNumber =
    area?.areaSqFt ?? area?.builtUpSqFt ?? area?.superBuiltUpSqFt ?? unit.areaSqFt ?? unit.builtUpSqFt ?? null;
  const updatedAtMs = toMillisSafe(unit.updatedAt);
  const doc: PublicUnitDoc = {
    id: `${unit.projectId}_${unit.id}`,
    projectId: unit.projectId,
    unitId: unit.id,
    tenantId: unit.tenantId,
    projectSlug,
    city,
    citySlug,
    type: unit.type,
    bhk,
    areaSqFt: area?.areaSqFt ?? unit.areaSqFt,
    carpetSqFt: area?.carpetSqFt ?? unit.carpetSqFt,
    builtUpSqFt: area?.builtUpSqFt ?? unit.builtUpSqFt,
    price: pricing?.basePrice ?? pricing?.allInclusivePrice ?? unit.price,
    floor: floorInfo?.number ?? unit.floor,
    facing: unit.facing,
    commercialUse: (unit as any).commercialUse,
    saleableSqFt: (unit as any).saleableSqFt,
    frontageFeet: (unit as any).frontageFeet,
    depthFeet: (unit as any).depthFeet,
    ceilingHeightFeet: (unit as any).ceilingHeightFeet,
    shutterType: (unit as any).shutterType,
    powerLoadKw: (unit as any).powerLoadKw,
    washroom: (unit as any).washroom,
    waterConnection: (unit as any).waterConnection,
    fireSafetyReady: (unit as any).fireSafetyReady,
    signageAllowed: (unit as any).signageAllowed,
    dedicatedParking: (unit as any).dedicatedParking,
    visibilityScore: (unit as any).visibilityScore,
    footfallGrade: (unit as any).footfallGrade,
    nearEntrance: (unit as any).nearEntrance,
    nearEscalator: (unit as any).nearEscalator,
    nearAnchor: (unit as any).nearAnchor,
    tenancyType: (unit as any).tenancyType,
    monthlyRentExpected: (unit as any).monthlyRentExpected,
    depositExpected: (unit as any).depositExpected,
    camPerSqFt: (unit as any).camPerSqFt,
    propertyTaxMonthly: (unit as any).propertyTaxMonthly,
    fitoutStatus: (unit as any).fitoutStatus,
    possession: (unit as any).possession,
    cabinsCount: (unit as any).cabinsCount,
    workstationsCapacity: (unit as any).workstationsCapacity,
    meetingRoomsCount: (unit as any).meetingRoomsCount,
    pantry: (unit as any).pantry,
    acProvision: (unit as any).acProvision,
    internetReady: (unit as any).internetReady,
    powerBackup: (unit as any).powerBackup,
    furnishing: (unit as any).furnishing,
    glassFacade: (unit as any).glassFacade,
    displayAreaSqFt: (unit as any).displayAreaSqFt,
    storageAreaSqFt: (unit as any).storageAreaSqFt,
    loadingAccess: (unit as any).loadingAccess,
    signageType: (unit as any).signageType,
    roadExposure: (unit as any).roadExposure,
    plotLengthFeet: unit.plotLengthFeet,
    plotWidthFeet: unit.plotWidthFeet,
    plotAreaSqFt: unit.plotAreaSqFt,
    revenue: unit.revenue,
    roadWidthFeet: unit.roadWidthFeet,
    corner: unit.corner,
    cornerPremiumPct: unit.cornerPremiumPct,
    finalPrice: unit.finalPrice,
    privateOpenSpaceSqFt: (unit as any).privateOpenSpaceSqFt,
    cornerUnit: (unit as any).cornerUnit,
    floorsType: (unit as any).floorsType,
    parkingSlots: (unit as any).parkingSlots,
    privateGardenSqFt: (unit as any).privateGardenSqFt,
    mixedMeta: (unit as any).mixedMeta,
    availability: unit.availability,
    media: unit.media,
    monetization: unit.monetization,
    area: area ?? undefined,
    pricing: pricing ?? undefined,
    floorInfo: floorInfo ?? undefined,
    priceNumber,
    areaSqFtNumber,
    updatedAtMs,
    createdAt: (unit.createdAt as FirebaseFirestore.Timestamp) ?? undefined,
    updatedAt: (unit.updatedAt as FirebaseFirestore.Timestamp) ?? undefined
  } as PublicUnitDoc;
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

function normalizeUnitNumber(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function requiresStrictDuplicateCheck(type?: string) {
  return type === "plot_layout" || type === "villa" || type === "row_house";
}

function duplicateUnitMessage(type?: string) {
  if (type === "plot_layout") return "Plot number already exists.";
  if (type === "villa") return "Villa unit number already exists.";
  return "Unit number already exists.";
}

function assertNoStrictUnitDuplicate(args: {
  units: UnitDoc[];
  candidate: { id?: string; type?: string; unitNumber?: string };
  batchSeen?: Map<string, number>;
  rowNumber?: number;
}) {
  const { units, candidate, batchSeen, rowNumber } = args;
  if (!requiresStrictDuplicateCheck(candidate.type)) return;
  const normalized = normalizeUnitNumber(candidate.unitNumber);
  if (!normalized) return;

  if (
    units.some(
      (unit) => unit.id !== candidate.id && normalizeUnitNumber(unit.unitNumber) === normalized
    )
  ) {
    throw new Error(duplicateUnitMessage(candidate.type));
  }

  if (batchSeen) {
    const firstRow = batchSeen.get(normalized);
    if (firstRow != null) {
      throw new Error(`Row ${rowNumber ?? firstRow}: ${duplicateUnitMessage(candidate.type)}`);
    }
    if (rowNumber != null) {
      batchSeen.set(normalized, rowNumber);
    }
  }
}

export function calculateUnitAvailabilityDelta(oldAvailability?: string, newAvailability?: string) {
  return countDelta(oldAvailability, newAvailability);
}

function inferCategoryFromType(type?: string): ProjectDoc["category"] {
  if (!type) return undefined;
  if (["apartment", "villa", "row_house"].includes(type)) return "residential";
  if (["plot_layout"].includes(type)) return "plotted";
  if (["shop", "office", "showroom"].includes(type)) return "commercial";
  if (["township", "mixed_building"].includes(type)) return "mixed";
  return undefined;
}

function pushIssue(
  issues: ProjectPublishIssue[],
  issue: Omit<ProjectPublishIssue, "severity" | "blocking"> & {
    severity?: PublishIssueSeverity;
    blocking?: boolean;
  }
) {
  issues.push({
    severity: issue.severity || "error",
    blocking: issue.blocking ?? issue.severity !== "warning",
    code: issue.code,
    message: issue.message,
    field: issue.field,
    meta: issue.meta
  });
}

function buildPublishIssues(project: ProjectDoc): ProjectPublishIssue[] {
  const issues: ProjectPublishIssue[] = [];
  const category = project.category ?? inferCategoryFromType(project.type);
  const recordStatus = project.recordStatus ?? "active";
  const hasCover = Boolean(project.media?.cover?.objectPath);
  const hasArea = Boolean(project.location?.area);
  const hasDeveloper = Boolean(project.developerName);
  const lifecycleStatus = project.lifecycleStatus ?? project.status;
  const plotCountFromInventories = Array.isArray(project.plotDetails?.plotInventories)
    ? project.plotDetails.plotInventories.reduce((sum, row) => sum + (Number(row?.count) || 0), 0)
    : 0;
  const totalUnitsPlanned =
    (project.inventory as any)?.totalUnitsPlanned ??
    project.totalUnitsPlanned ??
    project.plotDetails?.totalPlotsPlanned ??
    project.plotDetails?.plotCount ??
    null;
  const hasUnits = Boolean(project.counts?.totalUnits && project.counts.totalUnits > 0);

  if (!project.name?.trim()) {
    pushIssue(issues, {
      code: "PROJECT_NAME_REQUIRED",
      field: "name",
      message: "Project name is required."
    });
  }
  if (!hasDeveloper) {
    pushIssue(issues, {
      code: "PROJECT_DEVELOPER_REQUIRED",
      field: "developerName",
      message: "Developer name is required."
    });
  }
  if (!category) {
    pushIssue(issues, {
      code: "PROJECT_CATEGORY_REQUIRED",
      field: "category",
      message: "Project category is required."
    });
  }
  if (!project.type) {
    pushIssue(issues, {
      code: "PROJECT_TYPE_REQUIRED",
      field: "type",
      message: "Project type is required."
    });
  }
  if (!lifecycleStatus) {
    pushIssue(issues, {
      code: "PROJECT_LIFECYCLE_REQUIRED",
      field: "lifecycleStatus",
      message: "Lifecycle status is required."
    });
  }
  if (recordStatus !== "active") {
    pushIssue(issues, {
      code: "PROJECT_RECORD_STATUS_INACTIVE",
      field: "recordStatus",
      message: "Record status must be active for publish."
    });
  }
  if (!project.location?.city) {
    pushIssue(issues, {
      code: "PROJECT_CITY_REQUIRED",
      field: "location.city",
      message: "City is required."
    });
  }
  if (!hasArea) {
    pushIssue(issues, {
      code: "PROJECT_AREA_REQUIRED",
      field: "location.area",
      message: "Area/locality is required."
    });
  }
  if (!hasCover) {
    pushIssue(issues, {
      code: "PROJECT_COVER_REQUIRED",
      field: "media.cover",
      message: "Cover image is required."
    });
  }

  if (category === "residential") {
    if (!project.possessionStatus) {
      pushIssue(issues, {
        code: "PROJECT_POSSESSION_STATUS_REQUIRED",
        field: "possessionStatus",
        message: "Possession status is required."
      });
    }
    const hasConfig =
      project.configurationMix &&
      Object.values(project.configurationMix).some((value) => typeof value === "number" && value > 0);
    const hasResidentialInventory = Boolean(totalUnitsPlanned || hasUnits || hasConfig);
    if (!hasResidentialInventory) {
      pushIssue(issues, {
        code: "PROJECT_RESIDENTIAL_INVENTORY_REQUIRED",
        field: "inventory",
        message: "Inventory or configuration mix is required for residential projects."
      });
    }
  }

  if (category === "commercial") {
    if (!project.possessionStatus) {
      pushIssue(issues, {
        code: "PROJECT_POSSESSION_STATUS_REQUIRED",
        field: "possessionStatus",
        message: "Possession status is required."
      });
    }
    const hasCommercialInventory =
      Boolean(totalUnitsPlanned || hasUnits) ||
      Boolean(project.commercialDetails?.typicalUnitSizeMinSqFt || project.commercialDetails?.typicalUnitSizeMaxSqFt);
    if (!hasCommercialInventory) {
      pushIssue(issues, {
        code: "PROJECT_COMMERCIAL_INVENTORY_REQUIRED",
        field: "commercialDetails",
        message: "Inventory or typical size range is required for commercial projects."
      });
    }
  }

  if (category === "plotted") {
    const approvals = project.plotDetails?.approvals || {};
    const revenue = project.plotDetails?.revenue || {};
    const layoutApprovalNo = project.plotDetails?.layoutApproval?.approvalNo || undefined;
    const naOrderNo = project.plotDetails?.naOrder?.orderNo || undefined;
    if (!approvals.layoutApproved && !approvals.naApproved) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_APPROVAL_REQUIRED",
        field: "plotDetails.approvals",
        message: "Layout or NA approval is required."
      });
    }
    if (!(plotCountFromInventories > 0 || (project.plotDetails?.totalPlotsPlanned || 0) > 0)) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_TOTAL_PLOTS_REQUIRED",
        field: "plotDetails.totalPlotsPlanned",
        message: "Total plots planned must be greater than zero."
      });
    }
    if (!revenue.mouza) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_MOUZA_REQUIRED",
        field: "plotDetails.revenue.mouza",
        message: "Plot mouza is required."
      });
    }
    if (!revenue.taluka) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_TALUKA_REQUIRED",
        field: "plotDetails.revenue.taluka",
        message: "Plot taluka is required."
      });
    }
    if (!revenue.district) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_DISTRICT_REQUIRED",
        field: "plotDetails.revenue.district",
        message: "Plot district is required."
      });
    }
    if (approvals.layoutApproved && !layoutApprovalNo) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_LAYOUT_APPROVAL_NO_REQUIRED",
        field: "plotDetails.layoutApproval.approvalNo",
        message: "Layout approval number is required."
      });
    }
    if (approvals.naApproved && !naOrderNo) {
      pushIssue(issues, {
        code: "PROJECT_PLOTTED_NA_ORDER_NO_REQUIRED",
        field: "plotDetails.naOrder.orderNo",
        message: "NA order number is required."
      });
    }
  }

  if (category === "mixed") {
    const includes = project.mixedUseIncludes || project.mixedIncludes || {};
    if (!includes.residential && !includes.commercial && !includes.plotted) {
      pushIssue(issues, {
        code: "PROJECT_MIXED_USE_INCLUDES_REQUIRED",
        field: "mixedUseIncludes",
        message: "Mixed-use includes must specify at least one segment."
      });
    }
    if (!project.mixedDetails) {
      pushIssue(issues, {
        code: "PROJECT_MIXED_DETAILS_REQUIRED",
        field: "mixedDetails",
        message: "Mixed details are required."
      });
    } else if (project.mixedDetails.kind === "township") {
      if (!project.mixedDetails.totalLandArea || !project.mixedDetails.landAreaUnit) {
        pushIssue(issues, {
          code: "PROJECT_TOWNSHIP_LAND_AREA_REQUIRED",
          field: "mixedDetails.totalLandArea",
          message: "Township land area and unit are required."
        });
      }
    }
  }

  return issues;
}

function buildProjectServiceError(args: {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}) {
  const err = new Error(args.message) as Error & {
    code?: string;
    status?: number;
    details?: Record<string, unknown>;
  };
  err.code = args.code;
  err.status = args.status ?? 400;
  err.details = args.details;
  return err;
}

async function buildBuilderPublishIssues(input: {
  tenantId: string;
  user: AuthUser;
  project: ProjectDoc;
  projectId: string;
}) {
  const issues: ProjectPublishIssue[] = [];
  const applies = await shouldApplyBuilderMonetization({
    tenantId: input.tenantId,
    user: input.user
  });
  if (!applies) return issues;

  if (!env.monetizationBuilderEnforce) return issues;

  try {
    await assertBuilderSubscriptionEntitlement({
      tenantId: input.tenantId,
      user: input.user,
      operation: "project_publish"
    });
  } catch (error) {
    const err = error as any;
    pushIssue(issues, {
      code: err?.code || "BUILDER_SUBSCRIPTION_REQUIRED",
      message: err?.message || "Active builder subscription required for publish.",
      field: "monetization",
      meta: err?.details || {}
    });
    return issues;
  }

  if (isBuilderPublishedProject(input.project)) {
    return issues;
  }

  try {
    await assertBuilderProjectCap({
      tenantId: input.tenantId,
      user: input.user,
      excludeProjectId: input.projectId
    });
  } catch (error) {
    const err = error as any;
    pushIssue(issues, {
      code: err?.code || "BUILDER_PROJECT_CAP_REACHED",
      message: err?.message || "Builder project cap reached.",
      field: "visibility.state",
      meta: err?.details || {}
    });
  }

  const availableUnits = Number(input.project.counts?.availableUnits || 0);
  if (availableUnits > 0) {
    try {
      await assertBuilderUnitCap({
        tenantId: input.tenantId,
        user: input.user,
        incrementBy: availableUnits
      });
    } catch (error) {
      const err = error as any;
      pushIssue(issues, {
        code: err?.code || "BUILDER_UNIT_CAP_REACHED",
        message: err?.message || "Builder unit cap reached.",
        field: "counts.availableUnits",
        meta: {
          ...(err?.details || {}),
          requestedIncrement: availableUnits
        }
      });
    }
  }
  return issues;
}

async function buildReraPublishIssues(input: {
  tenantId: string;
  projectId: string;
  project: ProjectDoc;
}) {
  const issues: ProjectPublishIssue[] = [];
  const reraNumber = String(input.project?.rera?.number || "").trim().toUpperCase();

  const graceAllowed = await isProjectReraGraceAllowed({
    tenantId: input.tenantId,
    projectId: input.projectId
  });
  const required = shouldProjectPublishRequireRera({
    project: input.project as any,
    hasAllowlistGrace: graceAllowed
  });
  if (!required) return issues;

  const reraMissing = isProjectReraMissing(input.project);
  if (reraMissing) {
    pushIssue(issues, {
      code: "RERA_REQUIRED_FOR_PUBLISH",
      message: "RERA number is required for project publish in this context.",
      field: "rera.number",
      severity: env.reraProjectPublishEnforce ? "error" : "warning",
      blocking: env.reraProjectPublishEnforce
    });
    return issues;
  }

  if (!isProjectReraFormatValid(reraNumber)) {
    pushIssue(issues, {
      code: "RERA_INVALID_FORMAT",
      message: "RERA number format is invalid. Expected format like P51700012345.",
      field: "rera.number",
      severity: env.reraProjectPublishEnforce ? "error" : "warning",
      blocking: env.reraProjectPublishEnforce
    });
    return issues;
  }

  return issues;
}

async function buildPublishChecklist(input: {
  tenantId: string;
  projectId: string;
  user: AuthUser;
  project: ProjectDoc;
}) {
  const baseIssues = buildPublishIssues(input.project);
  const [builderIssues, reraIssues] = await Promise.all([
    buildBuilderPublishIssues(input),
    buildReraPublishIssues({
      tenantId: input.tenantId,
      projectId: input.projectId,
      project: input.project
    })
  ]);
  const issues = [...baseIssues, ...builderIssues, ...reraIssues];
  return {
    issues,
    blockingIssues: issues.filter((issue) => issue.blocking)
  };
}

export async function createProject(input: {
  tenantId?: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  if (env.monetizationBuilderEnforce) {
    const applies = await shouldApplyBuilderMonetization({
      tenantId,
      user: input.user
    });
    if (applies) {
      await assertBuilderSubscriptionEntitlement({
        tenantId,
        user: input.user,
        operation: "project_create"
      });
    }
  }
  const payload = ProjectCreateSchema.parse(input.body);
  const slug = payload.slug ? slugify(payload.slug, 80) : await generateSlug(tenantId, payload.name);
  const uniqueSlug = await ensureUniqueSlug(tenantId, slug);
  ensureMediaPathsSafe(tenantId, payload.media);
  ensureDeveloperMediaPathsSafe(tenantId, payload.developer);

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

  const resolvedCategory =
    patch.category ?? existing.category ?? inferCategoryFromType(patch.type ?? existing.type);
  if (!resolvedCategory) {
    throw new Error("CATEGORY_REQUIRED");
  }

  const merged: ProjectCreateInput & { slug: string } = {
    developerName: patch.developerName ?? existing.developerName,
    developer: patch.developer
      ? {
          ...(existing.developer || {}),
          ...patch.developer,
          logo:
            patch.developer.logo === null
              ? null
              : patch.developer.logo ?? existing.developer?.logo
        }
      : existing.developer,
    name: patch.name ?? existing.name,
    slug: uniqueSlug,
    enterpriseId: patch.enterpriseId ?? existing.enterpriseId,
    category: resolvedCategory,
    type: patch.type ?? existing.type,
    lifecycleStatus: patch.lifecycleStatus ?? existing.lifecycleStatus ?? existing.status ?? "planning",
    recordStatus: patch.recordStatus ?? existing.recordStatus ?? "active",
    possessionStatus: patch.possessionStatus ?? existing.possessionStatus,
    rera: patch.rera ?? existing.rera,
    approvals: resolvedCategory === "plotted" ? undefined : patch.approvals ?? existing.approvals,
    launchDate: patch.launchDate ?? existing.launchDate,
    completionDate: patch.completionDate ?? existing.completionDate,
    configurationMix: patch.configurationMix ?? existing.configurationMix,
    commercialMix: patch.commercialMix ?? existing.commercialMix,
    inventory: patch.inventory ?? existing.inventory,
    plotDetails: patch.plotDetails ?? existing.plotDetails,
    commercialDetails: patch.commercialDetails ?? existing.commercialDetails,
    salesStatus: patch.salesStatus ? { ...(existing.salesStatus || {}), ...patch.salesStatus } : existing.salesStatus,
    flags: patch.flags ? { ...(existing.flags || {}), ...patch.flags } : existing.flags,
    seo: patch.seo ? { ...(existing.seo || {}), ...patch.seo } : existing.seo,
    mixedIncludes: patch.mixedIncludes ?? existing.mixedIncludes,
    mixedUseIncludes: patch.mixedUseIncludes ?? existing.mixedUseIncludes ?? patch.mixedIncludes ?? existing.mixedIncludes,
    mixedDetails: patch.mixedDetails ?? existing.mixedDetails,
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
          cover: patch.media.cover === null ? null : patch.media.cover ?? existing.media?.cover,
          brochure: patch.media.brochure === null ? null : patch.media.brochure ?? existing.media?.brochure
        }
      : existing.media
  };

  ensureMediaPathsSafe(tenantId, merged.media);
  ensureDeveloperMediaPathsSafe(tenantId, merged.developer);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const doc = buildProjectDoc(merged, tenantId, input.projectId, input.user, now, now, existing);
  await ref.set(deepStripUndefined(doc), { merge: true });
  await ref.set(
    {
      status: admin.firestore.FieldValue.delete(),
      "inventory.totalUnitsPlanned": admin.firestore.FieldValue.delete()
    } as any,
    { merge: true }
  );

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
  const data = snap.data() as ProjectDoc;
  return normalizeProjectResponse(data, snap.id);
}

export async function listProjects(input: {
  tenantId?: string;
  user: AuthUser;
  query: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const parsed = ProjectListQuerySchema.parse(input.query ?? {});
  const lifecycleFilter = parsed.lifecycleStatus || parsed.status;

  const limit = Math.min(Number(parsed.limit || 50), 100);
  const cursor = parseCursor(parsed.cursor);
  const buildBaseQuery = () => {
    let ref: FirebaseFirestore.Query = projectsCollection(tenantId);
    if (parsed.type) ref = ref.where("type", "==", parsed.type);
    if (parsed.recordStatus) ref = ref.where("recordStatus", "==", parsed.recordStatus);
    if (parsed.visibility) ref = ref.where("visibility.state", "==", parsed.visibility);
    ref = ref.orderBy("updatedAt", "desc");
    ref = ref.orderBy(FieldPath.documentId(), "desc");
    if (cursor) {
      ref = ref.startAfter(cursor.updatedAt, cursor.id);
    }
    return ref;
  };
  const refs = lifecycleFilter
    ? [
        buildBaseQuery().where("lifecycleStatus", "==", lifecycleFilter),
        buildBaseQuery().where("status", "==", lifecycleFilter)
      ]
    : [buildBaseQuery()];
  const snaps = await Promise.all(refs.map((ref) => ref.limit(limit).get()));
  const items = Array.from(
    new Map(
      snaps
        .flatMap((snap) => snap.docs)
        .map((doc) => {
          const data = doc.data() as ProjectDoc;
          return [doc.id, normalizeProjectResponse(data, doc.id)] as const;
        })
    ).values()
  ).sort((a: any, b: any) => {
    const aMs = toMillisSafe(a.updatedAt) ?? 0;
    const bMs = toMillisSafe(b.updatedAt) ?? 0;
    if (aMs !== bMs) return bMs - aMs;
    return String(b.id).localeCompare(String(a.id));
  });
  const filtered = items.filter((item: any) => {
    if (!parsed.q) return true;
    const q = parsed.q.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.slug?.toLowerCase().includes(q) ||
      item.location?.city?.toLowerCase().includes(q)
    );
  });
  const paged = filtered.slice(0, limit);
  const last = paged[paged.length - 1];
  const nextCursor = last ? toCursor(last.updatedAt as FirebaseFirestore.Timestamp, last.id) : undefined;

  return { items: paged, nextCursor };
}

export async function getProjectPublishChecklist(input: {
  tenantId?: string;
  projectId: string;
  user: AuthUser;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const project = snap.data() as ProjectDoc;
  const checklist = await buildPublishChecklist({
    tenantId,
    projectId: input.projectId,
    user: input.user,
    project
  });
  return {
    tenantId,
    projectId: input.projectId,
    enforcement: {
      monetizationBuilderEnforce: env.monetizationBuilderEnforce,
      reraProjectPublishEnforce: env.reraProjectPublishEnforce
    },
    issues: checklist.issues,
    blockingIssues: checklist.blockingIssues
  };
}

export async function publishProject(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  if (env.monetizationNewEngineRead) {
    await observeCompatibility({
      tenantId,
      user: input.user,
      capability: "publish",
      source: "projects.publish",
      metadata: { projectId: input.projectId }
    });
  }
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const project = snap.data() as ProjectDoc;
  const wasPublished = isBuilderPublishedProject(project as any);
  const availableUnits = Number(project.counts?.availableUnits || 0);
  const checklist = await buildPublishChecklist({
    tenantId,
    projectId: input.projectId,
    user: input.user,
    project
  });
  if (checklist.blockingIssues.length) {
    throw buildProjectServiceError({
      code: "PUBLISH_VALIDATION_FAILED",
      status: 409,
      message: "Project publish blocked due to validation issues.",
      details: {
        issues: checklist.issues,
        blockingIssueCodes: checklist.blockingIssues.map((item) => item.code)
      }
    });
  }
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
  if (!wasPublished) {
    await adjustBuilderUsageCacheCounters({
      tenantId,
      projectDelta: 1,
      unitDelta: availableUnits > 0 ? availableUnits : 0
    });
  }

  return { ok: true, issues: checklist.issues };
}

export async function unpublishProject(input: { tenantId?: string; projectId: string; user: AuthUser }) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const ref = projectsCollection(tenantId).doc(input.projectId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const project = snap.data() as ProjectDoc;
  const wasPublished = isBuilderPublishedProject(project as any);
  const availableUnits = Number(project.counts?.availableUnits || 0);
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
  if (wasPublished) {
    await adjustBuilderUsageCacheCounters({
      tenantId,
      projectDelta: -1,
      unitDelta: availableUnits > 0 ? -availableUnits : 0
    });
  }
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
  const builderScopeApplies = await shouldApplyBuilderMonetization({
    tenantId,
    user: input.user
  });
  if (env.monetizationBuilderEnforce && builderScopeApplies) {
    await assertBuilderSubscriptionEntitlement({
      tenantId,
      user: input.user,
      operation: "unit_create"
    });
  }
  const payload = UnitCreateSchema.parse(input.body);
  ensureUnitMediaPathsSafe(tenantId, payload.media);

  const preProjectSnap = await projectsCollection(tenantId).doc(input.projectId).get();
  if (!preProjectSnap.exists) throw new Error("Not found");
  const preProject = preProjectSnap.data() as ProjectDoc;
  if (
    env.monetizationBuilderEnforce &&
    builderScopeApplies &&
    isBuilderPublishedProject(preProject as any) &&
    payload.availability === "available"
  ) {
    await assertBuilderUnitCap({
      tenantId,
      user: input.user,
      incrementBy: 1
    });
  }

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const unitRef = unitsCollection(tenantId, input.projectId).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  let projectVisibility: ProjectDoc["visibility"] | undefined;

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;
    const existingUnitsSnap = await tx.get(unitsCollection(tenantId, input.projectId));
    const existingUnits = existingUnitsSnap.docs.map((doc) => doc.data() as UnitDoc);

    const area = (payload as any).area;
    const pricing = (payload as any).pricing;
    const floorInfo = (payload as any).floorInfo;
    const unitDoc: UnitDoc = {
      id: unitRef.id,
      projectId: input.projectId,
      tenantId,
      type: payload.type,
      unitNumber: payload.unitNumber,
      tower: payload.tower,
      bhk: payload.bhk,
      configurationLabel: payload.configurationLabel,
      frontageFeet: (payload as any).frontageFeet,
      depthFeet: (payload as any).depthFeet,
      ceilingHeightFeet: (payload as any).ceilingHeightFeet,
      shutterType: (payload as any).shutterType,
      powerLoadKw: (payload as any).powerLoadKw,
      washroom: (payload as any).washroom,
      waterConnection: (payload as any).waterConnection,
      fireSafetyReady: (payload as any).fireSafetyReady,
      signageAllowed: (payload as any).signageAllowed,
      dedicatedParking: (payload as any).dedicatedParking,
      visibilityScore: (payload as any).visibilityScore,
      footfallGrade: (payload as any).footfallGrade,
      nearEntrance: (payload as any).nearEntrance,
      nearEscalator: (payload as any).nearEscalator,
      nearAnchor: (payload as any).nearAnchor,
      tenancyType: (payload as any).tenancyType,
      monthlyRentExpected: (payload as any).monthlyRentExpected,
      depositExpected: (payload as any).depositExpected,
      camPerSqFt: (payload as any).camPerSqFt,
      propertyTaxMonthly: (payload as any).propertyTaxMonthly,
      fitoutStatus: (payload as any).fitoutStatus,
      possession: (payload as any).possession,
      plotLengthFeet: (payload as any).plotLengthFeet,
      plotWidthFeet: (payload as any).plotWidthFeet,
      plotAreaSqFt: (payload as any).plotAreaSqFt,
      revenue: (payload as any).revenue,
      roadWidthFeet: (payload as any).roadWidthFeet,
      corner: (payload as any).corner,
      cornerPremiumPct: (payload as any).cornerPremiumPct,
      finalPrice: (payload as any).finalPrice,
      privateOpenSpaceSqFt: (payload as any).privateOpenSpaceSqFt,
      cornerUnit: (payload as any).cornerUnit,
      floorsType: (payload as any).floorsType,
      parkingSlots: (payload as any).parkingSlots,
      privateGardenSqFt: (payload as any).privateGardenSqFt,
      availability: payload.availability,
      areaSqFt: area?.areaSqFt,
      carpetSqFt: area?.carpetSqFt,
      builtUpSqFt: area?.builtUpSqFt,
      price: pricing?.basePrice ?? pricing?.allInclusivePrice,
      floor: floorInfo?.number,
      facing: payload.facing,
      media: payload.media,
      ...(area ? { area } : null),
      ...(pricing ? { pricing } : null),
      ...(floorInfo ? { floorInfo } : null),
      createdAt: now,
      updatedAt: now
    } as UnitDoc;

    const strictErrors = validateUnitStrict(unitDoc);
    if (Object.keys(strictErrors).length > 0) {
      throw new Error(Object.values(strictErrors)[0]);
    }
    assertNoStrictUnitDuplicate({
      units: existingUnits,
      candidate: unitDoc
    });

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
    if (payload.availability === "available") {
      await adjustBuilderUsageCacheCounters({
        tenantId,
        unitDelta: 1
      });
    }
  }

  return { id: unitRef.id };
}

export async function bulkCreateUnits(input: {
  tenantId?: string;
  projectId: string;
  user: AuthUser;
  body: unknown;
}) {
  if (!isAdmin(input.user)) throw new Error("Forbidden");
  const tenantId = resolveTenantId(input.user, input.tenantId);
  const builderScopeApplies = await shouldApplyBuilderMonetization({
    tenantId,
    user: input.user
  });
  if (env.monetizationBuilderEnforce && builderScopeApplies) {
    await assertBuilderSubscriptionEntitlement({
      tenantId,
      user: input.user,
      operation: "unit_bulk_create"
    });
  }
  const payload = UnitBulkCreateSchema.parse(input.body);

  payload.units.forEach((unit) => ensureUnitMediaPathsSafe(tenantId, unit.media));

  const preProjectSnap = await projectsCollection(tenantId).doc(input.projectId).get();
  if (!preProjectSnap.exists) throw new Error("Not found");
  const preProject = preProjectSnap.data() as ProjectDoc;
  if (env.monetizationBuilderEnforce && builderScopeApplies && isBuilderPublishedProject(preProject as any)) {
    const availableCount = payload.units.filter((unit) => unit.availability === "available").length;
    if (availableCount > 0) {
      await assertBuilderUnitCap({
        tenantId,
        user: input.user,
        incrementBy: availableCount
      });
    }
  }

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const unitRefs: FirebaseFirestore.DocumentReference[] = [];
  let projectVisibility: ProjectDoc["visibility"] | undefined;
  let totalDelta = 0;
  let availableDelta = 0;

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;
    const existingUnitsSnap = await tx.get(unitsCollection(tenantId, input.projectId));
    const existingUnits = existingUnitsSnap.docs.map((doc) => doc.data() as UnitDoc);
    const batchSeen = new Map<string, number>();

    payload.units.forEach((unit, index) => {
      const unitRef = unitsCollection(tenantId, input.projectId).doc();
      unitRefs.push(unitRef);
      const area = (unit as any).area;
      const pricing = (unit as any).pricing;
      const floorInfo = (unit as any).floorInfo;
      const unitDoc: UnitDoc = {
        id: unitRef.id,
        projectId: input.projectId,
        tenantId,
        type: unit.type,
        unitNumber: unit.unitNumber,
        tower: unit.tower,
        bhk: unit.bhk,
        configurationLabel: unit.configurationLabel,
        frontageFeet: (unit as any).frontageFeet,
        depthFeet: (unit as any).depthFeet,
        ceilingHeightFeet: (unit as any).ceilingHeightFeet,
        shutterType: (unit as any).shutterType,
        powerLoadKw: (unit as any).powerLoadKw,
        washroom: (unit as any).washroom,
        waterConnection: (unit as any).waterConnection,
        fireSafetyReady: (unit as any).fireSafetyReady,
        signageAllowed: (unit as any).signageAllowed,
        dedicatedParking: (unit as any).dedicatedParking,
        visibilityScore: (unit as any).visibilityScore,
        footfallGrade: (unit as any).footfallGrade,
        nearEntrance: (unit as any).nearEntrance,
        nearEscalator: (unit as any).nearEscalator,
        nearAnchor: (unit as any).nearAnchor,
        tenancyType: (unit as any).tenancyType,
        monthlyRentExpected: (unit as any).monthlyRentExpected,
        depositExpected: (unit as any).depositExpected,
        camPerSqFt: (unit as any).camPerSqFt,
        propertyTaxMonthly: (unit as any).propertyTaxMonthly,
        fitoutStatus: (unit as any).fitoutStatus,
        possession: (unit as any).possession,
        plotLengthFeet: (unit as any).plotLengthFeet,
        plotWidthFeet: (unit as any).plotWidthFeet,
        plotAreaSqFt: (unit as any).plotAreaSqFt,
        revenue: (unit as any).revenue,
        roadWidthFeet: (unit as any).roadWidthFeet,
        corner: (unit as any).corner,
        cornerPremiumPct: (unit as any).cornerPremiumPct,
        finalPrice: (unit as any).finalPrice,
        privateOpenSpaceSqFt: (unit as any).privateOpenSpaceSqFt,
        cornerUnit: (unit as any).cornerUnit,
        floorsType: (unit as any).floorsType,
        parkingSlots: (unit as any).parkingSlots,
        privateGardenSqFt: (unit as any).privateGardenSqFt,
        availability: unit.availability,
        areaSqFt: area?.areaSqFt,
        carpetSqFt: area?.carpetSqFt,
        builtUpSqFt: area?.builtUpSqFt,
        price: pricing?.basePrice ?? pricing?.allInclusivePrice,
        floor: floorInfo?.number,
        facing: unit.facing,
        media: unit.media,
        ...(area ? { area } : null),
        ...(pricing ? { pricing } : null),
        ...(floorInfo ? { floorInfo } : null),
        createdAt: now,
        updatedAt: now
      } as UnitDoc;

      const strictErrors = validateUnitStrict(unitDoc);
      if (Object.keys(strictErrors).length > 0) {
        throw new Error(`Row ${index + 2}: ${Object.values(strictErrors)[0]}`);
      }
      assertNoStrictUnitDuplicate({
        units: existingUnits,
        candidate: unitDoc,
        batchSeen,
        rowNumber: index + 2
      });

      tx.set(unitRef, deepStripUndefined(unitDoc));
      const delta = countDelta(undefined, unit.availability);
      totalDelta += delta.totalDelta;
      availableDelta += delta.availableDelta;
      existingUnits.push(unitDoc);
    });

    if (totalDelta || availableDelta) {
      tx.set(
        projectRef,
        {
          counts: {
            totalUnits: admin.firestore.FieldValue.increment(totalDelta),
            availableUnits: admin.firestore.FieldValue.increment(availableDelta)
          },
          updatedAt: now
        },
        { merge: true }
      );
    }
  });

  if (projectVisibility?.state === "published") {
    const unitDocs = await Promise.all(unitRefs.map((ref) => ref.get()));
    for (const snap of unitDocs) {
      if (snap.exists) {
        await syncPublicUnit(snap.data() as UnitDoc);
      }
    }
    await syncPublicProject(tenantId, input.projectId);
    const availableCount = payload.units.filter((unit) => unit.availability === "available").length;
    if (availableCount > 0) {
      await adjustBuilderUsageCacheCounters({
        tenantId,
        unitDelta: availableCount
      });
    }
  }

  return { ids: unitRefs.map((ref) => ref.id) };
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
  const builderScopeApplies = await shouldApplyBuilderMonetization({
    tenantId,
    user: input.user
  });
  if (env.monetizationBuilderEnforce && builderScopeApplies) {
    await assertBuilderSubscriptionEntitlement({
      tenantId,
      user: input.user,
      operation: "unit_update"
    });
  }
  const patch = UnitUpdateSchema.parse(input.body);
  ensureUnitMediaPathsSafe(tenantId, patch.media);

  const projectRef = projectsCollection(tenantId).doc(input.projectId);
  const unitRef = unitsCollection(tenantId, input.projectId).doc(input.unitId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  let projectVisibility: ProjectDoc["visibility"] | undefined;
  let availableDelta = 0;

  if (env.monetizationBuilderEnforce && builderScopeApplies) {
    const [projectSnap, unitSnap] = await Promise.all([projectRef.get(), unitRef.get()]);
    if (!projectSnap.exists || !unitSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    const unit = unitSnap.data() as UnitDoc;
    const nextAvailability = patch.availability ?? unit.availability;
    if (
      isBuilderPublishedProject(project as any) &&
      unit.availability !== "available" &&
      nextAvailability === "available"
    ) {
      await assertBuilderUnitCap({
        tenantId,
        user: input.user,
        incrementBy: 1
      });
    }
  }

  await firestore.runTransaction(async (tx) => {
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists) throw new Error("Not found");
    const project = projectSnap.data() as ProjectDoc;
    projectVisibility = project.visibility;

    const unitSnap = await tx.get(unitRef);
    if (!unitSnap.exists) throw new Error("Not found");
    const existing = unitSnap.data() as UnitDoc;
    const existingUnitsSnap = await tx.get(unitsCollection(tenantId, input.projectId));
    const existingUnits = existingUnitsSnap.docs.map((doc) => doc.data() as UnitDoc);

    const strictValidation = validateUnitMergedStrict({
      existing,
      patchInput: patch
    });
    if (!strictValidation.ok) {
      throw new Error(Object.values(strictValidation.errors)[0]);
    }
    assertNoStrictUnitDuplicate({
      units: existingUnits,
      candidate: {
        id: existing.id,
        type: strictValidation.unit.type,
        unitNumber: strictValidation.unit.unitNumber
      }
    });

    const nextAvailability = patch.availability ?? existing.availability;
    const delta = countDelta(existing.availability, nextAvailability);
    availableDelta = delta.availableDelta;

    tx.set(
      unitRef,
      deepStripUndefined({
        ...strictValidation.unit,
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
    if (availableDelta !== 0) {
      await adjustBuilderUsageCacheCounters({
        tenantId,
        unitDelta: availableDelta
      });
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
  let availableDelta = 0;

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
    availableDelta = delta.availableDelta;
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
    if (availableDelta !== 0) {
      await adjustBuilderUsageCacheCounters({
        tenantId,
        unitDelta: availableDelta
      });
    }
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
  const normalizedCity = parsed.city ? slugify(parsed.city, 80) : "";
  const lifecycleStatus = parsed.lifecycleStatus || parsed.status;
  const sort = parsed.sort || "newest";
  let ref: FirebaseFirestore.Query = publicProjectsCollection();
  if (parsed.city) ref = ref.where("citySlug", "==", normalizedCity);
  if (parsed.type) ref = ref.where("type", "==", parsed.type);
  if (lifecycleStatus) ref = ref.where("lifecycleStatus", "==", lifecycleStatus);
  ref = ref.orderBy("updatedAt", "desc");
  ref = ref.orderBy(FieldPath.documentId(), "desc");

  const limit = Math.min(Number(parsed.limit || 50), 100);
  const cursor = parseCursor(parsed.cursor);
  if (cursor) {
    ref = ref.startAfter(cursor.updatedAt, cursor.id);
  }
  const snap = await ref.limit(limit).get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (parsed.city && items.length === 0 && !parsed.cursor) {
    let fallbackRef: FirebaseFirestore.Query = publicProjectsCollection();
    fallbackRef = fallbackRef.orderBy("updatedAt", "desc").orderBy(FieldPath.documentId(), "desc");
    const fallbackSnap = await fallbackRef.limit(200).get();
    items = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items = items.filter((item: any) => {
      const cityValue = item?.citySlug || item?.location?.citySlug || slugify(item?.location?.city || "", 80);
      if (cityValue !== normalizedCity) return false;
      if (parsed.type && item.type !== parsed.type) return false;
      if (lifecycleStatus && (item.lifecycleStatus || item.status) !== lifecycleStatus) return false;
      return true;
    });
  }

  items = items.filter((item: any) => {
    if (!item.visibility?.state) return true;
    return item.visibility.state === "published";
  });

  items = items.filter((item: any) => {
    const recordStatus = item.recordStatus || "active";
    return recordStatus === "active";
  });

  if (parsed.q) {
    const q = parsed.q.toLowerCase();
    items = items.filter((item: any) => {
      return (
        item.name?.toLowerCase().includes(q) ||
        item.slug?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.location?.city?.toLowerCase().includes(q) ||
        item.location?.area?.toLowerCase().includes(q)
      );
    });
  }

  if (parsed.minPrice || parsed.maxPrice) {
    const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
    const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
    items = items.filter((item: any) => {
      const priceMin = item.minPrice ?? item.priceRange?.min ?? item.priceRange?.max;
      const priceMax = item.maxPrice ?? item.priceRange?.max ?? item.priceRange?.min;
      if (min && priceMax !== undefined && priceMax < min) return false;
      if (max && priceMin !== undefined && priceMin > max) return false;
      return true;
    });
  }

  if (parsed.bhk) {
    const target = Number(parsed.bhk);
    if (!Number.isNaN(target)) {
      items = items.filter((item: any) => {
        const list = item.bhkTypes || [];
        return Array.isArray(list) ? list.includes(target) : false;
      });
    }
  }

  if (sort === "priceLowHigh") {
    items = items.sort((a: any, b: any) => {
      const av = a.startingPrice ?? a.minPrice ?? a.maxPrice ?? Number.POSITIVE_INFINITY;
      const bv = b.startingPrice ?? b.minPrice ?? b.maxPrice ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  } else if (sort === "priceHighLow") {
    items = items.sort((a: any, b: any) => {
      const av = a.startingPrice ?? a.maxPrice ?? a.minPrice ?? 0;
      const bv = b.startingPrice ?? b.maxPrice ?? b.minPrice ?? 0;
      return bv - av;
    });
  } else if (sort === "availability") {
    items = items.sort((a: any, b: any) => (b.availableUnits ?? 0) - (a.availableUnits ?? 0));
  }

  items = items.map((item: any) => {
    const explain: string[] = [];
    if (parsed.city && (item.citySlug || item.location?.citySlug)) explain.push("matches city");
    if (parsed.q) explain.push("matches keyword");
    if (parsed.bhk) explain.push(`${parsed.bhk} BHK available`);
    if (parsed.minPrice || parsed.maxPrice) explain.push("within budget");
    return { ...item, explain };
  });

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor = last ? toCursor(last.get("updatedAt"), last.id) : undefined;
  return { items, nextCursor };
}

export async function publicGetProject(slug: string) {
  const snap = await publicProjectsCollection()
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) throw new Error("Not found");
  const doc = snap.docs[0];
  const data = doc.data() as any;
  if (data?.visibility?.state && data.visibility.state !== "published") {
    throw new Error("Not found");
  }
  return { id: doc.id, ...data };
}

export async function publicListProjectUnits(slug: string, query?: unknown) {
  const parsed = PublicProjectUnitsQuerySchema.parse(query ?? {});
  const project = await publicGetProject(slug);
  let ref: FirebaseFirestore.Query = publicProjectUnitsCollection().where("projectId", "==", project.id);
  if (parsed.availability) {
    ref = ref.where("availability", "==", parsed.availability);
  }
  const snap = await ref.get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const availability = parsed.availability || "available";
  items = items.filter((item: any) => {
    if (!availability) return true;
    return item.availability === availability;
  });

  if (parsed.bhk) {
    const target = Number(parsed.bhk);
    if (!Number.isNaN(target)) {
      items = items.filter((item: any) => {
        const bhk = item.bhk ?? parseBhkFromType(item.type);
        return bhk === target;
      });
    }
  }

  if (parsed.minPrice || parsed.maxPrice) {
    const min = parsed.minPrice ? Number(parsed.minPrice) : undefined;
    const max = parsed.maxPrice ? Number(parsed.maxPrice) : undefined;
    items = items.filter((item: any) => {
      const price = item.priceNumber ?? item.price ?? item.pricing?.basePrice ?? item.pricing?.allInclusivePrice;
      if (min != null && price != null && price < min) return false;
      if (max != null && price != null && price > max) return false;
      return true;
    });
  }

  if (parsed.sort === "priceLowHigh") {
    items = items.sort((a: any, b: any) => {
      const av = a.priceNumber ?? a.price ?? Number.POSITIVE_INFINITY;
      const bv = b.priceNumber ?? b.price ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  } else if (parsed.sort === "priceHighLow") {
    items = items.sort((a: any, b: any) => {
      const av = a.priceNumber ?? a.price ?? 0;
      const bv = b.priceNumber ?? b.price ?? 0;
      return bv - av;
    });
  }

  items = items.map((item: any) => {
    const price = item.priceNumber ?? item.price ?? item.pricing?.basePrice ?? item.pricing?.allInclusivePrice;
    const area = item.areaSqFtNumber ?? item.areaSqFt ?? item.area?.areaSqFt;
    return {
      ...item,
      priceNumber: price ?? null,
      areaSqFtNumber: area ?? null,
      priceLabel: price ? `₹${Math.round(price).toLocaleString("en-IN")}` : null,
      areaLabel: area ? `${Math.round(area)} sq ft` : null,
      configurationLabel: item.configurationLabel || item.type
    };
  });

  return { items };
}
