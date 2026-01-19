import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MediaManager from "../components/MediaManager";
import { CHANDRAPUR_TALUKAS, DEFAULT_DISTRICT } from "../constants/maharashtra";
import { useAuth } from "../hooks/useAuth";
import {
  createListing,
  createProjectApi,
  fetchMetaEnums,
  getBillingSubscription,
  listProjects,
  signPutMedia,
  submitListing,
  updateListing
} from "../services/apiClient";

const PARTNER_ID = "Chandrapur Real Estate Solutions Pvt Ltd";

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function toNumber(value: string) {
  if (value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function formatInr(value?: number) {
  if (value === undefined) return "";
  return INR_FORMATTER.format(value);
}

function formatNumber(value?: number) {
  if (value === undefined) return "";
  return NUMBER_FORMATTER.format(value);
}

function toSqM(sqFt: number) {
  return sqFt / 10.7639;
}

function toAcres(sqFt: number) {
  return sqFt / 43560;
}

function resolveSectionId(mode: "independent" | "project" | "project_unit", path: (string | number)[]) {
  const key = path.join(".");
  if (key.startsWith("title") || key.startsWith("name")) return "section-title";
  if (key.startsWith("location")) return "section-location";
  if (key.startsWith("specs") || key.startsWith("unit")) return "section-area";
  if (key.startsWith("landRecord") || key.startsWith("plotInfo") || key.startsWith("area")) {
    return "section-land-records";
  }
  if (key.startsWith("pricing")) return "section-pricing";
  if (key.startsWith("projectId") || key.startsWith("unitType") || key.startsWith("availability")) {
    return mode === "project_unit" ? "section-project-unit" : "section-project";
  }
  if (key.startsWith("media")) return "section-media";
  if (mode === "project") return "section-project";
  if (mode === "project_unit") return "section-project-unit";
  return "section-title";
}

function buildIssues(err: any, mode: "independent" | "project" | "project_unit"): ValidationIssue[] {
  const rawIssues = Array.isArray(err?.issues) ? err.issues : [];
  if (rawIssues.length === 0 && err?.message) {
    return [{ path: [], message: err.message, sectionId: resolveSectionId(mode, []) }];
  }
  return rawIssues.map((issue: any) => ({
    path: Array.isArray(issue.path) ? issue.path : [],
    message: issue.message || "Validation error",
    sectionId: resolveSectionId(mode, Array.isArray(issue.path) ? issue.path : [])
  }));
}

type MetaEnums = {
  listingDealType: string[];
  propertyType: string[];
  projectType: string[];
  projectStatus: string[];
  unitType: string[];
  availability: string[];
};

type MediaItem = { objectPath: string; contentType?: string };
type LandDocument = { objectPath: string; fileName?: string; contentType?: string };
type LandDocuments = {
  extract712?: LandDocument | null;
  naOrder?: LandDocument | null;
  other?: LandDocument | null;
};

type ValidationIssue = {
  path: (string | number)[];
  message: string;
  sectionId: string;
};

function stripMediaItem(item: any): MediaItem | undefined {
  if (!item?.objectPath) return undefined;
  return { objectPath: item.objectPath, contentType: item.contentType };
}

function sanitizeMedia(media: any) {
  if (!media) return undefined;
  const hero = stripMediaItem(media.hero);
  const gallery = Array.isArray(media.gallery) ? media.gallery.map(stripMediaItem).filter(Boolean) : [];
  return { hero, gallery };
}

const LAND_DOC_SLOTS: { key: keyof LandDocuments; label: string }[] = [
  { key: "extract712", label: "7/12 Extract (PDF/Image)" },
  { key: "naOrder", label: "NA Order (PDF/Image)" },
  { key: "other", label: "Other Document (PDF/Image)" }
];

type AddPropertyPageProps = {
  mode?: "project" | "project_unit";
};

export default function AddPropertyPage({ mode: modeProp }: AddPropertyPageProps) {
  const { tenantId, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"independent" | "project" | "project_unit">(modeProp || "project");
  const [meta, setMeta] = useState<MetaEnums | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [independentId, setIndependentId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectMedia, setProjectMedia] = useState<{ hero?: MediaItem | null; gallery?: MediaItem[] }>({});
  const [inheritProjectMedia, setInheritProjectMedia] = useState(true);
  const [unitTitleMode, setUnitTitleMode] = useState<"auto" | "manual">("auto");
  const [tenantType, setTenantType] = useState<string | null>(null);
  const [landDocs, setLandDocs] = useState<LandDocuments>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const [independent, setIndependent] = useState({
    title: "",
    type: "sale",
    propertyType: "land",
    citySlug: "",
    locality: "",
    areaValue: "",
    areaUnit: "sqft",
    landMouza: "",
    landSurvey: "",
    landWard: "",
    landTaluka: "",
    landDistrict: DEFAULT_DISTRICT,
    plotLayoutApproved: "",
    plotCornerPlot: "",
    plotFacing: "",
    pricePerSqFt: "",
    totalPrice: ""
  });
  const isEnterprise = tenantType === "enterprise";
  const isLand = independent.propertyType === "land";
  const canUploadLandDocs = isEnterprise && isLand;

  const [project, setProject] = useState({
    name: "",
    developerName: "",
    projectType: "plotted",
    status: "launching",
    citySlug: "",
    locality: "",
    mouza: ""
  });

  const [projectUnit, setProjectUnit] = useState({
    projectId: "",
    unitType: "plot",
    title: "",
    availability: "available",
    plotAreaSqFt: "",
    unitNo: "",
    pricePerSqFt: "",
    totalPrice: ""
  });

  useEffect(() => {
    async function loadMeta() {
      try {
        const data = await fetchMetaEnums();
        setMeta(data);
      } catch {
        setMeta(null);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      if (!tenantId) return;
      try {
        await refreshToken();
        const data = await listProjects(tenantId);
        setProjects(data.items || []);
      } catch {
        setProjects([]);
      }
    }
    loadProjects();
  }, [tenantId, refreshToken]);

  useEffect(() => {
    async function loadTenant() {
      if (!tenantId) return;
      try {
        await refreshToken();
        const data = await getBillingSubscription(tenantId);
        setTenantType(data?.tenant?.type || null);
      } catch {
        setTenantType(null);
      }
    }
    loadTenant();
  }, [tenantId, refreshToken]);

  useEffect(() => {
    if (independent.propertyType !== "land") return;
    if (independent.landDistrict.trim()) return;
    setIndependent((prev) =>
      prev.landDistrict.trim() ? prev : { ...prev, landDistrict: DEFAULT_DISTRICT }
    );
  }, [independent.landDistrict, independent.propertyType]);

  useEffect(() => {
    if (!scrollTargetId) return;
    const node = document.getElementById(scrollTargetId);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setScrollTargetId(null);
  }, [scrollTargetId]);

  useEffect(() => {
    setIssues([]);
    setError(null);
    setMessage(null);
  }, [mode]);

  const listingDealTypes = meta?.listingDealType || ["sale", "rent", "lease"];
  const propertyTypes = meta?.propertyType || ["land", "plot", "flat", "apartment"];
  const projectTypes = meta?.projectType || ["plotted", "apartment", "mixed"];
  const projectStatuses = meta?.projectStatus || ["launching", "under_construction", "ready"];
  const unitTypes = meta?.unitType || ["plot", "flat", "villa"];
  const availability = meta?.availability || ["available", "hold", "sold"];

  const selectedProject = useMemo(
    () => projects.find((p) => (p.id || p.projectId) === projectUnit.projectId),
    [projects, projectUnit.projectId]
  );
  const selectedProjectHasMedia = Boolean(
    selectedProject?.media?.hero?.objectPath ||
      (Array.isArray(selectedProject?.media?.gallery) &&
        selectedProject?.media?.gallery?.some((item: any) => item?.objectPath))
  );

  const independentAreaValue = toNumber(independent.areaValue);
  const independentPricePerSqFt = toNumber(independent.pricePerSqFt);
  const independentTotalPrice = toNumber(independent.totalPrice);
  const independentComputedTotal =
    independentAreaValue && independentPricePerSqFt ? Math.round(independentAreaValue * independentPricePerSqFt) : undefined;
  const independentComputedRate =
    independentAreaValue && independentTotalPrice ? independentTotalPrice / independentAreaValue : undefined;
  const independentAreaHelper = independentAreaValue && independent.areaUnit === "sqft"
    ? `~${formatNumber(toSqM(independentAreaValue))} sq.m${
        independentAreaValue >= 43560 ? ` | ${formatNumber(toAcres(independentAreaValue))} acres` : ""
      }`
    : "";

  const unitAreaSqFt = toNumber(projectUnit.plotAreaSqFt);
  const unitPricePerSqFt = toNumber(projectUnit.pricePerSqFt);
  const unitTotalPrice = toNumber(projectUnit.totalPrice);
  const unitComputedTotal = unitAreaSqFt && unitPricePerSqFt ? Math.round(unitAreaSqFt * unitPricePerSqFt) : undefined;
  const unitComputedRate = unitAreaSqFt && unitTotalPrice ? unitTotalPrice / unitAreaSqFt : undefined;
  const unitAreaHelper = unitAreaSqFt
    ? `~${formatNumber(toSqM(unitAreaSqFt))} sq.m${unitAreaSqFt >= 43560 ? ` | ${formatNumber(toAcres(unitAreaSqFt))} acres` : ""}`
    : "";

  const autoUnitTitle = useMemo(() => {
    if (!selectedProject?.name) return "";
    const parts = [selectedProject.name];
    if (projectUnit.unitType) parts.push(projectUnit.unitType.replace(/_/g, " "));
    if (projectUnit.unitNo) parts.push(`#${projectUnit.unitNo}`);
    return parts.join(" - ");
  }, [projectUnit.unitNo, projectUnit.unitType, selectedProject?.name]);

  useEffect(() => {
    if (unitTitleMode !== "auto") return;
    if (!autoUnitTitle) return;
    setProjectUnit((prev) => (prev.title === autoUnitTitle ? prev : { ...prev, title: autoUnitTitle }));
  }, [autoUnitTitle, unitTitleMode]);

  useEffect(() => {
    if (!projectUnit.projectId) return;
    if (!projectUnit.title) setUnitTitleMode("auto");
  }, [projectUnit.projectId, projectUnit.title]);

  const independentChecklist = useMemo<ChecklistItem[]>(
    () => [
      {
        key: "title",
        label: "Title",
        ok: Boolean(independent.title && independent.title.trim().length >= 3),
        sectionId: "section-title"
      },
      {
        key: "location",
        label: "Location (city + locality)",
        ok: Boolean(independent.citySlug && independent.locality),
        sectionId: "section-location"
      },
      {
        key: "area",
        label: "Area (value + unit)",
        ok:
          independent.propertyType === "land" || independent.propertyType === "plot"
            ? Boolean(independentAreaValue && independent.areaUnit)
            : true,
        sectionId: "section-land-records"
      },
      {
        key: "pricing",
        label: "Pricing (total or rate)",
        ok: Boolean(independentTotalPrice || independentPricePerSqFt || independentComputedTotal),
        sectionId: "section-pricing"
      },
      ...(independent.propertyType === "land"
        ? [
            {
              key: "land-records",
              label: "Land records (Mouza, Survey / Gat No, Tehsil, District)",
              ok: Boolean(
                independent.landMouza &&
                  independent.landSurvey &&
                  independent.landTaluka &&
                  independent.landDistrict
              ),
              sectionId: "section-land-records"
            }
          ]
        : [])
    ],
    [
      independent.title,
      independent.citySlug,
      independent.locality,
      independent.propertyType,
      independentAreaValue,
      independent.areaUnit,
      independent.landMouza,
      independent.landSurvey,
      independent.landTaluka,
      independent.landDistrict,
      independentTotalPrice,
      independentPricePerSqFt,
      independentComputedTotal
    ]
  );

  const projectChecklist = useMemo<ChecklistItem[]>(
    () => [
      {
        key: "name",
        label: "Project name",
        ok: Boolean(project.name && project.name.trim().length >= 2),
        sectionId: "section-project"
      },
      {
        key: "developer",
        label: "Developer",
        ok: Boolean(project.developerName && project.developerName.trim().length >= 2),
        sectionId: "section-project"
      },
      {
        key: "type",
        label: "Type + status",
        ok: Boolean(project.projectType && project.status),
        sectionId: "section-project"
      },
      {
        key: "location",
        label: "Location (city + locality)",
        ok: Boolean(project.citySlug && project.locality),
        sectionId: "section-location"
      }
    ],
    [project.name, project.developerName, project.projectType, project.status, project.citySlug, project.locality]
  );

  const unitChecklist = useMemo<ChecklistItem[]>(
    () => [
      {
        key: "project",
        label: "Project selected",
        ok: Boolean(projectUnit.projectId),
        sectionId: "section-project-unit"
      },
      {
        key: "unitType",
        label: "Unit type",
        ok: Boolean(projectUnit.unitType),
        sectionId: "section-project-unit"
      },
      {
        key: "title",
        label: "Unit title",
        ok: Boolean(projectUnit.title && projectUnit.title.trim().length >= 3),
        sectionId: "section-title"
      },
      {
        key: "availability",
        label: "Availability",
        ok: Boolean(projectUnit.availability),
        sectionId: "section-project-unit"
      },
      {
        key: "unitNo",
        label: "Unit / Plot no",
        ok:
          projectUnit.unitType === "plot" || projectUnit.unitType === "flat"
            ? Boolean(projectUnit.unitNo)
            : true,
        sectionId: "section-project-unit"
      },
      {
        key: "area",
        label: "Area",
        ok: projectUnit.unitType ? Boolean(unitAreaSqFt) : false,
        sectionId: "section-area"
      },
      {
        key: "pricing",
        label: "Pricing (total or rate)",
        ok: Boolean(unitTotalPrice || unitPricePerSqFt || unitComputedTotal),
        sectionId: "section-pricing"
      }
    ],
    [
      projectUnit.projectId,
      projectUnit.unitType,
      projectUnit.title,
      projectUnit.availability,
      projectUnit.unitNo,
      unitAreaSqFt,
      unitTotalPrice,
      unitPricePerSqFt,
      unitComputedTotal
    ]
  );

  const saveIndependent = async (submit?: boolean) => {
    if (!tenantId) {
      setError("Tenant missing");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    setIssues([]);
    if (submit) {
      const missing = independentChecklist.filter((item) => !item.ok);
      if (missing.length > 0) {
        setIssues(
          missing.map((item) => ({
            path: [],
            message: `${item.label} is required`,
            sectionId: item.sectionId
          }))
        );
        setScrollTargetId(missing[0].sectionId);
        setError("Please complete required fields before submitting.");
        setSaving(false);
        return;
      }
    }
    try {
      await refreshToken();
      const totalPriceValue = independentTotalPrice ?? independentComputedTotal;
      const payload: any = {
        mode: "independent",
        type: independent.type,
        propertyType: independent.propertyType,
        title: independent.title,
        brokeragePartnerId: PARTNER_ID,
        location: { citySlug: independent.citySlug, locality: independent.locality },
        area:
          independentAreaValue && independent.areaUnit
            ? { value: independentAreaValue, unit: independent.areaUnit }
            : undefined,
        landRecord:
          independent.propertyType === "land"
            ? {
                mouza: independent.landMouza || undefined,
                surveyOrGatNo: independent.landSurvey || undefined,
                wardOrWarg: independent.landWard || undefined,
                taluka: independent.landTaluka || undefined,
                district: independent.landDistrict || undefined
              }
            : undefined,
        plotInfo:
          independent.propertyType === "plot"
            ? {
                layoutApproved: independent.plotLayoutApproved === "yes" ? true : independent.plotLayoutApproved === "no" ? false : undefined,
                cornerPlot: independent.plotCornerPlot === "yes" ? true : independent.plotCornerPlot === "no" ? false : undefined,
                facing: independent.plotFacing || undefined
              }
            : undefined,
        pricing:
          totalPriceValue || independentPricePerSqFt
            ? {
                totalPrice: totalPriceValue,
                pricePerSqFt: independentPricePerSqFt
              }
            : {}
      };
      let id = independentId;
      if (!id) {
        const created = await createListing(tenantId, payload);
        id = created.listingId;
        setIndependentId(id);
      } else {
        await updateListing(tenantId, id, payload);
      }
      if (submit && id) {
        await submitListing(tenantId, id);
        setMessage("Submitted for review");
      } else {
        setMessage("Saved draft");
      }
    } catch (err: any) {
      const parsed = buildIssues(err, "independent");
      setIssues(parsed);
      if (submit && parsed.length) setScrollTargetId(parsed[0].sectionId);
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const buildDocObjectPath = (slot: string, fileName: string) => {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    return `tenants/${tenantId}/listings/${independentId}/docs/land/${slot}-${Date.now()}-${safeName}`;
  };

  const uploadLandDoc = async (slot: keyof LandDocuments, file: File) => {
    if (!tenantId || !independentId) return;
    setUploadingSlot(slot);
    setError(null);
    try {
      const objectPath = buildDocObjectPath(slot, file.name);
      const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
      await fetch(sign.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      const nextDoc = { objectPath, fileName: file.name, contentType: file.type || undefined };
      const nextDocs = { ...landDocs, [slot]: nextDoc };
      await updateListing(tenantId, independentId, { documents: { land: nextDocs } });
      setLandDocs(nextDocs);
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeLandDoc = async (slot: keyof LandDocuments) => {
    if (!tenantId || !independentId) return;
    setUploadingSlot(slot);
    setError(null);
    try {
      const nextDocs = { ...landDocs, [slot]: null };
      await updateListing(tenantId, independentId, { documents: { land: nextDocs } });
      setLandDocs(nextDocs);
    } catch (err: any) {
      setError(err.message || "Failed to remove document");
    } finally {
      setUploadingSlot(null);
    }
  };

  const saveProject = async () => {
    if (!tenantId) {
      setError("Tenant missing");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    setIssues([]);
    try {
      await refreshToken();
      const created = await createProjectApi(tenantId, {
        name: project.name,
        developerName: project.developerName,
        projectType: project.projectType,
        status: project.status,
        brokeragePartnerId: PARTNER_ID,
        location: {
          citySlug: project.citySlug,
          locality: project.locality,
          mouza: project.mouza
        },
        legal:
          project.projectType === "plotted" || project.projectType === "mixed"
            ? {
                surveyOrGatNo: "pending",
                totalLandAreaSqFt: 1,
                naStatus: "applied",
                layoutApprovalStatus: "in_process"
              }
            : undefined
      });
      setProjectId(created.id);
      setProjectMedia({});
      const data = await listProjects(tenantId);
      setProjects(data.items || []);
      setMessage("Project saved. You can now add inventory units.");
    } catch (err: any) {
      const parsed = buildIssues(err, "project");
      setIssues(parsed);
      setError(err.message || "Project save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveProjectUnit = async (submit?: boolean) => {
    if (!tenantId) {
      setError("Tenant missing");
      return;
    }
    if (!projectUnit.projectId) {
      setError("Select a project");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    setIssues([]);
    try {
      await refreshToken();
      const totalPriceValue = unitTotalPrice ?? unitComputedTotal;
      const inheritedMedia = inheritProjectMedia ? sanitizeMedia(selectedProject?.media) : undefined;
      const payload: any = {
        mode: "project_unit",
        type: totalPriceValue || unitPricePerSqFt ? "sale" : listingDealTypes[0],
        propertyType: projectUnit.unitType === "flat" ? "apartment" : projectUnit.unitType === "plot" ? "land" : "villa",
        title: projectUnit.title,
        brokeragePartnerId: PARTNER_ID,
        projectId: projectUnit.projectId,
        unitType: projectUnit.unitType,
        availability: projectUnit.availability,
        unit: {
          plot: projectUnit.unitType === "plot" ? { plotAreaSqFt: Number(projectUnit.plotAreaSqFt || 0) } : undefined,
          flat: projectUnit.unitType === "flat" ? { carpetAreaSqFt: Number(projectUnit.plotAreaSqFt || 0), bhk: 1 } : undefined,
          unitNo: projectUnit.unitNo
        },
        pricing:
          totalPriceValue || unitPricePerSqFt
            ? {
                totalPrice: totalPriceValue,
                pricePerSqFt: unitPricePerSqFt
              }
            : {},
        media: inheritedMedia
      };
      const created = await createListing(tenantId, payload);
      if (submit) {
        await submitListing(tenantId, created.listingId);
        setMessage("Unit submitted for review");
      } else {
        setMessage("Unit saved as draft");
      }
    } catch (err: any) {
      const parsed = buildIssues(err, "project_unit");
      setIssues(parsed);
      if (submit && parsed.length) setScrollTargetId(parsed[0].sectionId);
      setError(err.message || "Unit save failed");
    } finally {
      setSaving(false);
    }
  };

  const projectOptions = useMemo(() => projects.map((p) => ({ value: p.id || p.projectId, label: p.name })), [projects]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Add Property / Project</h1>
          <p className="text-sm text-secondary">Use modes to add independent listings, projects, or project units.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["independent", "project", "project_unit"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              if (m === "independent") {
                navigate("/listings/new");
                return;
              }
              setMode(m);
            }}
            className={`rounded-full px-3 py-2 text-sm font-semibold ${
              mode === m ? "bg-indigo-600 text-white" : "bg-surface border border-theme text-primary"
            }`}
          >
            {m === "independent" ? "Independent Listing" : m === "project" ? "Project" : "Project Unit"}
          </button>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="font-semibold">Please review the highlighted sections</div>
          <ul className="mt-2 space-y-1">
            {issues.map((issue, index) => (
              <li key={`${issue.sectionId}-${index}`}>
                <a href={`#${issue.sectionId}`} className="underline decoration-dotted">
                  {issue.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      {mode === "independent" && (
        <div className="rounded-xl card-glass border border-theme p-4 space-y-4">
          <section id="section-title" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Basics</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <input
                  value={independent.title}
                  onChange={(e) => setIndependent((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Deal type">
                <select
                  value={independent.type}
                  onChange={(e) => setIndependent((p) => ({ ...p, type: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {listingDealTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Property type">
                <select
                  value={independent.propertyType}
                  onChange={(e) => setIndependent((p) => ({ ...p, propertyType: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {propertyTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section id="section-location" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Location</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City slug">
                <input
                  value={independent.citySlug}
                  onChange={(e) => setIndependent((p) => ({ ...p, citySlug: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Locality">
                <input
                  value={independent.locality}
                  onChange={(e) => setIndependent((p) => ({ ...p, locality: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>

          {(independent.propertyType === "land" || independent.propertyType === "plot") && (
            <section id="section-land-records" className="space-y-3">
              <div className="text-sm font-semibold text-primary">
                {independent.propertyType === "land" ? "Land Records (Maharashtra)" : "Plot Details"}
              </div>
              {independent.propertyType === "land" && (
                <div className="rounded-lg input-glass bg-surface px-3 py-2 text-xs text-secondary">
                  Required to publish land listings.
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {independent.propertyType === "land" && (
                  <>
                    <Field label="Mouza *">
                      <input
                        value={independent.landMouza}
                        onChange={(e) => setIndependent((p) => ({ ...p, landMouza: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Survey / Gat No *">
                      <input
                        value={independent.landSurvey}
                        onChange={(e) => setIndependent((p) => ({ ...p, landSurvey: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Warg / Ward (optional)">
                      <input
                        value={independent.landWard}
                        onChange={(e) => setIndependent((p) => ({ ...p, landWard: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Tehsil (Taluka) *">
                      <input
                        list="chandrapur-taluka-list"
                        value={independent.landTaluka}
                        onChange={(e) => setIndependent((p) => ({ ...p, landTaluka: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="District *">
                      <input
                        value={independent.landDistrict}
                        onChange={(e) => setIndependent((p) => ({ ...p, landDistrict: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                    <datalist id="chandrapur-taluka-list">
                      {CHANDRAPUR_TALUKAS.map((taluka) => (
                        <option key={taluka} value={taluka} />
                      ))}
                    </datalist>
                  </>
                )}

                <Field
                  label={
                    independent.propertyType === "land" || independent.propertyType === "plot"
                      ? "Area value *"
                      : "Area value (optional)"
                  }
                  help={independentAreaHelper}
                >
                  <input
                    value={independent.areaValue}
                    onChange={(e) => setIndependent((p) => ({ ...p, areaValue: e.target.value }))}
                    className="w-full rounded-md input-glass px-3 py-2 text-sm"
                    type="number"
                  />
                </Field>
                <Field
                  label={
                    independent.propertyType === "land" || independent.propertyType === "plot"
                      ? "Area unit *"
                      : "Area unit (optional)"
                  }
                >
                  <select
                    value={independent.areaUnit}
                    onChange={(e) => setIndependent((p) => ({ ...p, areaUnit: e.target.value }))}
                    className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  >
                    {["sqft", "sqm", "acre", "hectare"].map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>

                {independent.propertyType === "plot" && (
                  <>
                    <Field label="Layout approved (optional)">
                      <select
                        value={independent.plotLayoutApproved}
                        onChange={(e) => setIndependent((p) => ({ ...p, plotLayoutApproved: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                    <Field label="Corner plot (optional)">
                      <select
                        value={independent.plotCornerPlot}
                        onChange={(e) => setIndependent((p) => ({ ...p, plotCornerPlot: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                    <Field label="Facing (optional)">
                      <input
                        value={independent.plotFacing}
                        onChange={(e) => setIndependent((p) => ({ ...p, plotFacing: e.target.value }))}
                        className="w-full rounded-md input-glass px-3 py-2 text-sm"
                      />
                    </Field>
                  </>
                )}
              </div>
            </section>
          )}

          {canUploadLandDocs && (
            <section className="space-y-3">
              <div className="text-sm font-semibold text-primary">Land Documents</div>
              <div className="text-xs text-secondary">Enterprise-only. PDF or image files.</div>
              {!independentId && (
                <div className="rounded-lg input-glass bg-surface px-3 py-2 text-xs text-secondary">
                  Save the listing before uploading documents.
                </div>
              )}
              <div className="grid gap-3">
                {LAND_DOC_SLOTS.map((slot) => {
                  const doc = landDocs?.[slot.key];
                  const busy = uploadingSlot === slot.key;
                  return (
                    <div key={slot.key} className="rounded-lg input-glass px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-primary">{slot.label}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          {doc?.objectPath && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-indigo-600"
                              onClick={async () => {
                                if (!tenantId) return;
                                const { signGetMedia } = await import("../services/apiClient");
                                const map = await signGetMedia([doc.objectPath]);
                                const url = map[doc.objectPath];
                                if (url) window.open(url, "_blank", "noopener,noreferrer");
                              }}
                            >
                              View
                            </button>
                          )}
                          {doc?.objectPath && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-rose-600"
                              disabled={busy}
                              onClick={() => removeLandDoc(slot.key)}
                            >
                              Remove
                            </button>
                          )}
                          <label className="inline-flex items-center text-xs font-semibold text-secondary">
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              disabled={!independentId || busy}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                void uploadLandDoc(slot.key, file);
                                e.currentTarget.value = "";
                              }}
                            />
                            <span className="cursor-pointer rounded-md input-glass px-2 py-1">
                              {busy ? "Uploading..." : doc?.objectPath ? "Replace" : "Upload"}
                            </span>
                          </label>
                        </div>
                      </div>
                      {doc?.objectPath && (
                        <div className="mt-2 text-xs text-secondary">
                          {doc.fileName || doc.objectPath.split("/").pop()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section id="section-pricing" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Pricing</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price per sq.ft" help={independentPricePerSqFt ? `${formatInr(independentPricePerSqFt)} per sq.ft` : ""}>
                <input
                  value={independent.pricePerSqFt}
                  onChange={(e) => setIndependent((p) => ({ ...p, pricePerSqFt: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  type="number"
                />
              </Field>
              <Field
                label="Total price"
                help={
                  independentTotalPrice
                    ? `${formatInr(independentTotalPrice)} total`
                    : independentComputedTotal
                    ? `Computed total: ${formatInr(independentComputedTotal)}`
                    : ""
                }
              >
                <input
                  value={independent.totalPrice}
                  onChange={(e) => setIndependent((p) => ({ ...p, totalPrice: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  type="number"
                />
              </Field>
              {independentComputedRate && (
                <div className="sm:col-span-2 text-xs text-muted">
                  Effective rate: {formatInr(independentComputedRate)} per sq.ft
                </div>
              )}
            </div>
          </section>

          <Checklist items={independentChecklist} />

          <div className="flex gap-2">
            <button
              onClick={() => saveIndependent(false)}
              disabled={saving}
              className="rounded-md btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveIndependent(true)}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {mode === "project" && (
        <div className="rounded-xl card-glass border border-theme p-4 space-y-4">
          <section id="section-project" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Project basics</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project name">
                <input
                  value={project.name}
                  onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Developer">
                <input
                  value={project.developerName}
                  onChange={(e) => setProject((p) => ({ ...p, developerName: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Type">
                <select
                  value={project.projectType}
                  onChange={(e) => setProject((p) => ({ ...p, projectType: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {projectTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={project.status}
                  onChange={(e) => setProject((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {projectStatuses.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section id="section-location" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Location</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City slug">
                <input
                  value={project.citySlug}
                  onChange={(e) => setProject((p) => ({ ...p, citySlug: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Locality">
                <input
                  value={project.locality}
                  onChange={(e) => setProject((p) => ({ ...p, locality: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Mouza (for plotted/mixed)">
                <input
                  value={project.mouza}
                  onChange={(e) => setProject((p) => ({ ...p, mouza: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>

          <section id="section-media" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Project media</div>
            {projectId && tenantId ? (
              <MediaManager
                projectId={projectId}
                tenantId={tenantId}
                media={projectMedia}
                onChange={(next) => setProjectMedia(next)}
              />
            ) : (
              <div className="rounded-md input-glass bg-surface p-3 text-sm text-secondary">
                Save the project to unlock media uploads.
              </div>
            )}
          </section>

          <Checklist items={projectChecklist} />

          <button
            onClick={saveProject}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save Project
          </button>
        </div>
      )}

      {mode === "project_unit" && (
        <div className="rounded-xl card-glass border border-theme p-4 space-y-4">
          <section id="section-project-unit" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Project unit details</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project">
                <select
                  value={projectUnit.projectId}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, projectId: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="">Select project</option>
                  {projectOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Unit type">
                <select
                  value={projectUnit.unitType}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, unitType: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {unitTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Availability">
                <select
                  value={projectUnit.availability}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, availability: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                >
                  {availability.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit / Plot no">
                <input
                  value={projectUnit.unitNo}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, unitNo: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input
                type="checkbox"
                checked={inheritProjectMedia}
                onChange={(e) => setInheritProjectMedia(e.target.checked)}
              />
              Inherit project images
            </label>
            {inheritProjectMedia && projectUnit.projectId && !selectedProjectHasMedia && (
              <div className="text-xs text-muted">Selected project has no media yet.</div>
            )}
          </section>

          <section id="section-title" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Title</div>
            <Field label="Unit title">
              <input
                value={projectUnit.title}
                onChange={(e) => {
                  setUnitTitleMode("manual");
                  setProjectUnit((p) => ({ ...p, title: e.target.value }));
                }}
                className="w-full rounded-md input-glass px-3 py-2 text-sm"
              />
              {autoUnitTitle && unitTitleMode === "manual" && (
                <button
                  type="button"
                  onClick={() => {
                    setUnitTitleMode("auto");
                    setProjectUnit((p) => ({ ...p, title: autoUnitTitle }));
                  }}
                  className="mt-2 text-xs font-semibold text-indigo-600"
                >
                  Use suggested title
                </button>
              )}
            </Field>
          </section>

          <section id="section-area" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Area</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Area (sq.ft)" help={unitAreaHelper}>
                <input
                  value={projectUnit.plotAreaSqFt}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, plotAreaSqFt: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  type="number"
                />
              </Field>
            </div>
          </section>

          <section id="section-pricing" className="space-y-3">
            <div className="text-sm font-semibold text-primary">Pricing</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price per sq.ft" help={unitPricePerSqFt ? `${formatInr(unitPricePerSqFt)} per sq.ft` : ""}>
                <input
                  value={projectUnit.pricePerSqFt}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, pricePerSqFt: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  type="number"
                />
              </Field>
              <Field
                label="Total price"
                help={
                  unitTotalPrice
                    ? `${formatInr(unitTotalPrice)} total`
                    : unitComputedTotal
                    ? `Computed total: ${formatInr(unitComputedTotal)}`
                    : ""
                }
              >
                <input
                  value={projectUnit.totalPrice}
                  onChange={(e) => setProjectUnit((p) => ({ ...p, totalPrice: e.target.value }))}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  type="number"
                />
              </Field>
              {unitComputedRate && (
                <div className="sm:col-span-2 text-xs text-muted">
                  Effective rate: {formatInr(unitComputedRate)} per sq.ft
                </div>
              )}
            </div>
          </section>

          <Checklist items={unitChecklist} />

          <div className="flex gap-2">
            <button
              onClick={() => saveProjectUnit(false)}
              disabled={saving}
              className="rounded-md btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              onClick={() => saveProjectUnit(true)}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ChecklistItem = { key: string; label: string; ok: boolean; sectionId: string };

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-secondary">
      <span className="text-xs text-muted">{label}</span>
      {children}
      {help ? <span className="text-[11px] text-muted">{help}</span> : null}
    </label>
  );
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="rounded-xl card-glass border border-theme p-4 space-y-2">
      <div className="text-sm font-semibold text-primary">Submit Checklist</div>
      <div className="text-xs text-muted">Fix items marked missing before submitting.</div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between">
            <a href={`#${item.sectionId}`} className="text-secondary hover:text-primary transition">
              {item.label}
            </a>
            <span className={item.ok ? "text-emerald-200" : "text-rose-200"}>
              {item.ok ? "OK" : "Missing"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}






