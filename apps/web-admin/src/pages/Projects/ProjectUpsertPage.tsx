import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminSectionCard from "../../components/admin/AdminSectionCard";
import AdminStepTabs from "../../components/admin/AdminStepTabs";
import AdminWorkspaceHero from "../../components/admin/AdminWorkspaceHero";
import MediaManager from "../../components/MediaManager";
import ErrorBanner from "../../components/ErrorBanner";
import EmptyState from "../../components/EmptyState";
import MapPickerModal from "../../components/MapPickerModal";
import {
  createAdminProject,
  getAdminProject,
  getAdminProjectPublishChecklist,
  listings,
  signGetMedia,
  signPutMedia,
  updateAdminProject,
  publishAdminProject,
  unpublishAdminProject
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import { useDocumentLockerEntitlement } from "../../hooks/useDocumentLockerEntitlement";
import { isPlatformAdminRole, isTenantAdminRole } from "../../utils/roles";

type MediaItem = { objectPath: string; contentType?: string; fileName?: string; kind?: "image" | "video" };
type PublishChecklistIssue = {
  code: string;
  message: string;
  field?: string;
  severity?: "error" | "warning";
  blocking?: boolean;
  meta?: Record<string, unknown>;
};

const STEPS = ["Basics", "Location", "Pricing", "Amenities", "Media", "Review"];
function parseCoordinate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function toNumOrUndef(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function toIntOrUndef(value: string) {
  const num = toNumOrUndef(value);
  return num == null ? undefined : Math.trunc(num);
}

function toBoolOrUndef(value: string) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function trimOrUndef(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function hasMeaningfulValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function stripEmpty<T extends Record<string, unknown>>(obj: T) {
  const next: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (hasMeaningfulValue(value)) next[key] = value;
  });
  return Object.keys(next).length ? (next as T) : undefined;
}

function isValidLatitude(value: number) {
  return value >= -90 && value <= 90;
}

function isValidLongitude(value: number) {
  return value >= -180 && value <= 180;
}

function formatChecklistField(field?: string) {
  if (!field) return "Project";
  return field
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" / ");
}

export default function ProjectUpsertPage() {
  const { tenantId, role, refreshToken } = useAuth();
  const { entitlement: documentLockerEntitlement } = useDocumentLockerEntitlement();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [projectStatus, setProjectStatus] = useState<"draft" | "published">("draft");
  const [counts, setCounts] = useState<{ totalUnits: number; availableUnits: number } | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const creatingRef = useRef<Promise<string | null> | null>(null);
  const [template, setTemplate] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publishIssues, setPublishIssues] = useState<PublishChecklistIssue[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [linkedListings, setLinkedListings] = useState<any[]>([]);
  const [form, setForm] = useState({
    developerName: "",
    developer: {
      logo: null as MediaItem | null,
      experienceYears: "",
      completedProjectsCount: "",
      ongoingProjectsCount: ""
    },
    name: "",
    slug: "",
    category: "residential",
    type: "apartment",
    lifecycleStatus: "planning",
    recordStatus: "active",
    possessionStatus: "under_construction",
    possessionDate: "",
    launchDate: "",
    completionDate: "",
    totalUnitsPlanned: "",
    configurationMix: {
      bhk1: "",
      bhk2: "",
      bhk3: "",
      bhk4: ""
    },
    commercialMix: {
      shopUnits: "",
      kiosks: "",
      foodCourtUnits: "",
      anchorStores: "",
      officeUnits: ""
    },
    inventory: {
      towers: "",
      floors: "",
      parking: ""
    },
      plotDetails: {
        totalLandArea: "",
        totalLandAreaUnit: "acre",
        totalPlotsPlanned: "",
        plotInventories: [{ sizeValue: "", sizeUnit: "sq_ft", count: "", label: "", frontageFt: "", depthFt: "" }],
        approvals: { layoutApproved: false, naApproved: false, tpApproved: false },
        layoutApproval: { authority: "", approvalNo: "", approvalDate: "" },
        naOrder: { orderNo: "", orderDate: "" },
        tpApproval: { office: "", approvalNo: "" },
        revenue: {
          mouza: "",
          taluka: "",
          district: "",
          state: "Maharashtra",
          surveyNo: "",
          gatNo: "",
          hissaNo: "",
          plotNo: ""
        },
        infra: {
          internalRoadType: "",
          typicalRoadWidthFeet: "",
          roadWidthM: "",
          roadType: "",
          waterAvailable: "",
          electricityAvailable: "",
          drainageAvailable: "",
          waterConnection: "",
          electricityConnection: "",
          drainageConnection: "",
          streetLights: "",
          boundaryWall: "",
          sewageSystem: "",
          waterSource: ""
        },
        gatedCommunity: "",
        bankLoanApproved: "",
        bankLoanReady: "",
        titleClear: "",
        litigation: "",
        approvedBanks: "",
        possessionTimeline: "",
        possessionTimelineNote: ""
      },
    commercialDetails: {
      typicalUnitSizeMinSqFt: "",
      typicalUnitSizeMaxSqFt: "",
      parkingNotes: "",
      footfallEstimateMinPerDay: "",
      footfallEstimateMaxPerDay: "",
      frontageVisibility: "",
      mainRoadAccess: "",
      nearbyAnchor: ""
    },
    mixedUseIncludes: {
      residential: false,
      commercial: false,
      plotted: false
    },
    mixedDetails: {
      kind: "township",
      totalLandArea: "",
      landAreaUnit: "acre",
      phasesCount: "",
      sectorsCount: "",
      internalRoadType: "",
      internalRoadMinWidthM: "",
      openSpacePct: "",
      masterPlanNotes: "",
      buildingName: "",
      towersCount: "",
      totalFloors: "",
      podiumParking: "",
      retailFloors: "",
      residentialFloors: ""
    },
    approvals: {
      layoutApproved: false,
      naApproved: false,
      fireNocApproved: false,
      ocApproved: false,
      ccApproved: false,
      liftInspectionApproved: false,
      tradeLicenseReady: false
    },
    rera: {
      number: "",
      authority: ""
    },
    salesStatus: {
      preLaunch: false,
      bookingOpen: false,
      constructionLinkedPlan: false,
      subventionPlan: false
    },
    flags: {
      featured: false,
      verified: false,
      exclusivePartner: false,
      premiumPosition: ""
    },
    location: {
      city: "",
      area: "",
      addressLine: "",
      landmark: "",
      pincode: "",
      district: "",
      state: "",
      lat: "",
      lng: ""
    },
    priceRange: { min: "", max: "" },
    amenities: [] as string[],
    highlights: [] as string[],
    seo: {
      shortDescription: "",
      longDescription: "",
      metaTitle: "",
      metaDescription: ""
    },
    media: {
      cover: null as MediaItem | null,
      gallery: [] as MediaItem[],
      brochure: null as MediaItem | null
    }
  });
  const [amenityInput, setAmenityInput] = useState("");
  const [highlightInput, setHighlightInput] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>({});
  const [dragTarget, setDragTarget] = useState<null | "cover" | "gallery" | "videos" | "brochure" | "developerLogo">(null);

  const canAdmin = role === "client_admin" || isTenantAdminRole(role) || isPlatformAdminRole(role);
  const TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
    residential: [
      { value: "apartment", label: "Apartment" },
      { value: "villa", label: "Villa" },
      { value: "row_house", label: "Row house" }
    ],
    plotted: [
      { value: "plot_layout", label: "Plot layout" }
    ],
    commercial: [
      { value: "shop", label: "Shop" },
      { value: "office", label: "Office" },
      { value: "showroom", label: "Showroom" }
    ],
    mixed: [
      { value: "township", label: "Township" },
      { value: "mixed_building", label: "Mixed building" }
    ]
  };
  const typeFromCategory = (category: string) => TYPE_OPTIONS[category]?.[0]?.value || "apartment";
  const normalizeLegacyType = (value?: string) => {
    if (!value) return undefined;
    if (value === "plot") return "plot_layout";
    if (value === "commercial") return "shop";
    if (value === "mixed") return "township";
    if (value === "studio" || value === "penthouse") return "apartment";
    if (value === "na_plot" || value === "farm_plot" || value === "industrial_plot" || value === "gated_layout") {
      return "plot_layout";
    }
    if (value === "warehouse" || value === "commercial_plot" || value === "industrial_shed") return "shop";
    if (value === "integrated_layout") return "township";
    return value;
  };
  const inferCategoryFromType = (value?: string) => {
    const normalized = normalizeLegacyType(value);
    if (!normalized) return "residential";
    for (const [category, options] of Object.entries(TYPE_OPTIONS)) {
      if (options.some((opt) => opt.value === normalized)) return category;
    }
    return "residential";
  };
  const normalizePlotInventoryRows = (
    rows: Array<{
      sizeValue?: string;
      sizeUnit?: string;
      count?: string;
      label?: string;
      frontageFt?: string;
      depthFt?: string;
    }>
  ) =>
    (rows || [])
      .map((item) => {
        const sizeValue = item.sizeValue ? Number(item.sizeValue) : undefined;
        const sizeUnit = item.sizeUnit || (sizeValue != null ? "sq_ft" : undefined);
        const count = item.count ? Number(item.count) : undefined;
        const frontageFt = item.frontageFt ? Number(item.frontageFt) : undefined;
        const depthFt = item.depthFt ? Number(item.depthFt) : undefined;
        const label = item.label?.trim() || undefined;
        const isActive = Boolean(item.sizeValue || item.count || item.frontageFt || item.depthFt || item.label?.trim());
        const isValid = isActive && sizeValue != null && sizeValue > 0 && Boolean(sizeUnit) && count != null && count > 0;
        const sizeSqFt = sizeUnit === "sq_ft" && sizeValue != null ? sizeValue : undefined;
        return { sizeValue, sizeUnit, sizeSqFt, count, frontageFt, depthFt, label, isActive, isValid };
      })
      .filter((item) => item.isValid)
      .map(({ isActive, isValid, ...item }) => item);
  const isPlot = form.category === "plotted";
  const isResidential = form.category === "residential";
  const isCommercial = form.category === "commercial";
  const isMixed = form.category === "mixed";
  const showResidentialMix = isResidential || (isMixed && form.mixedUseIncludes.residential);
  const showCommercialMix = isCommercial || (isMixed && form.mixedUseIncludes.commercial);
  const showPlotSummary = isPlot || (isMixed && form.mixedUseIncludes.plotted);
  const showCommercialApprovals = isCommercial || (isMixed && form.mixedUseIncludes.commercial);
  const showReraWarning =
    isResidential && form.lifecycleStatus !== "planning" && !form.rera.number.trim();
  const statusOptions = isPlot
    ? [
        { value: "planning", label: "Planning" },
        { value: "layout_approved", label: "Layout approved" },
        { value: "na_approved", label: "NA approved" },
        { value: "ready_for_sale", label: "Ready for sale" }
      ]
    : [
        { value: "planning", label: "Planning" },
        { value: "under_construction", label: "Under construction" },
        { value: "ready", label: "Ready" }
      ];
  const statusLabel =
    statusOptions.find((option) => option.value === form.lifecycleStatus)?.label || form.lifecycleStatus;
  const isNew = !projectId && !createdId;
  const effectiveProjectId = projectId || createdId || undefined;
  const isReadOnly = projectStatus === "published" && !canAdmin;
  const latValue = form.location.lat.trim();
  const lngValue = form.location.lng.trim();
  const latNumber = parseCoordinate(form.location.lat);
  const lngNumber = parseCoordinate(form.location.lng);
  const latValid = !latValue || (latNumber != null && isValidLatitude(latNumber));
  const lngValid = !lngValue || (lngNumber != null && isValidLongitude(lngNumber));
  const latError = latValid ? null : "Latitude must be between -90 and 90.";
  const lngError = lngValid ? null : "Longitude must be between -180 and 180.";
  const hasLatLngError = Boolean(latError || lngError);
  const mapValue =
    latNumber != null && lngNumber != null && latValid && lngValid ? { lat: latNumber, lng: lngNumber } : undefined;
  useEffect(() => {
    if (!tenantId || !projectId) return;
    let active = true;
    setLoading(true);
    getAdminProject(tenantId, projectId)
      .then((res) => {
        const data = res.data;
        if (!active || !data) return;
        setProjectStatus(data.visibility?.state || "draft");
        setCounts(
          data.counts
            ? {
                totalUnits: data.counts.totalUnits ?? 0,
                availableUnits: data.counts.availableUnits ?? 0
              }
            : null
        );
        const legacyStatus = typeof (data as any).status === "string" ? (data as any).status : "";
        const legacyLifecycleStatuses = [
          "planning",
          "under_construction",
          "ready",
          "layout_approved",
          "na_approved",
          "ready_for_sale"
        ];
        const legacyLifecycle = legacyLifecycleStatuses.includes(legacyStatus) ? legacyStatus : "";
        const legacyRecord = legacyStatus === "active" || legacyStatus === "inactive" ? legacyStatus : "";
        const normalizedType = normalizeLegacyType(data.type) || "apartment";
        setForm({
          developerName: data.developerName || "",
          developer: {
            logo: (data.developer?.logo as MediaItem) || null,
            experienceYears: data.developer?.experienceYears != null ? String(data.developer.experienceYears) : "",
            completedProjectsCount:
              data.developer?.completedProjectsCount != null ? String(data.developer.completedProjectsCount) : "",
            ongoingProjectsCount:
              data.developer?.ongoingProjectsCount != null ? String(data.developer.ongoingProjectsCount) : ""
          },
          name: data.name || "",
          slug: data.slug || "",
          category: data.category || inferCategoryFromType(data.type),
          type: normalizedType,
          lifecycleStatus: (data as any).lifecycleStatus || legacyLifecycle || "planning",
          recordStatus: (data as any).recordStatus || legacyRecord || "active",
          possessionStatus: data.possessionStatus || "under_construction",
          possessionDate: data.possessionDate || "",
          launchDate: data.launchDate || "",
          completionDate: data.completionDate || "",
          totalUnitsPlanned: data.totalUnitsPlanned != null ? String(data.totalUnitsPlanned) : "",
          configurationMix: {
            bhk1: data.configurationMix?.bhk1 != null ? String(data.configurationMix.bhk1) : "",
            bhk2: data.configurationMix?.bhk2 != null ? String(data.configurationMix.bhk2) : "",
            bhk3: data.configurationMix?.bhk3 != null ? String(data.configurationMix.bhk3) : "",
            bhk4: data.configurationMix?.bhk4 != null ? String(data.configurationMix.bhk4) : ""
          },
          commercialMix: {
            shopUnits: data.commercialMix?.shopUnits != null ? String(data.commercialMix.shopUnits) : "",
            kiosks: data.commercialMix?.kiosks != null ? String(data.commercialMix.kiosks) : "",
            foodCourtUnits: data.commercialMix?.foodCourtUnits != null ? String(data.commercialMix.foodCourtUnits) : "",
            anchorStores: data.commercialMix?.anchorStores != null ? String(data.commercialMix.anchorStores) : "",
            officeUnits: data.commercialMix?.officeUnits != null ? String(data.commercialMix.officeUnits) : ""
          },
          inventory: {
            towers: data.inventory?.towers != null ? String(data.inventory.towers) : "",
            floors: data.inventory?.floors != null ? String(data.inventory.floors) : "",
            parking: data.inventory?.parking || ""
          },
          plotDetails: {
            totalLandArea: data.plotDetails?.totalLandArea != null ? String(data.plotDetails.totalLandArea) : "",
            totalLandAreaUnit: data.plotDetails?.totalLandAreaUnit || "acre",
            totalPlotsPlanned:
              data.plotDetails?.totalPlotsPlanned != null
                ? String(data.plotDetails.totalPlotsPlanned)
                : data.plotDetails?.plotCount != null
                  ? String(data.plotDetails.plotCount)
                  : "",
            plotInventories:
              data.plotDetails?.plotInventories?.length
                ? data.plotDetails.plotInventories.map((item) => ({
                    sizeValue:
                      item.sizeValue != null
                        ? String(item.sizeValue)
                        : item.sizeSqFt != null
                          ? String(item.sizeSqFt)
                          : "",
                    sizeUnit: item.sizeUnit || "sq_ft",
                    count: item.count != null ? String(item.count) : "",
                    label: (item as any).label || "",
                    frontageFt: item.frontageFt != null ? String(item.frontageFt) : "",
                    depthFt: item.depthFt != null ? String(item.depthFt) : ""
                  }))
                : [{ sizeValue: "", sizeUnit: "sq_ft", count: "", label: "", frontageFt: "", depthFt: "" }],
            approvals: {
              layoutApproved: Boolean(data.plotDetails?.approvals?.layoutApproved ?? data.approvals?.layoutApproved),
              naApproved: Boolean(data.plotDetails?.approvals?.naApproved ?? data.approvals?.naApproved),
              tpApproved: Boolean((data.plotDetails as any)?.approvals?.tpApproved)
            },
            layoutApproval: {
              authority:
                data.plotDetails?.layoutApproval?.authority ||
                data.plotDetails?.layoutAuthority ||
                "",
              approvalNo:
                data.plotDetails?.layoutApproval?.approvalNo ||
                data.plotDetails?.layoutApprovalNo ||
                "",
              approvalDate:
                data.plotDetails?.layoutApproval?.approvalDate ||
                data.plotDetails?.layoutApprovalDate ||
                ""
            },
            naOrder: {
              orderNo:
                data.plotDetails?.naOrder?.orderNo ||
                data.plotDetails?.naOrderNo ||
                "",
              orderDate:
                data.plotDetails?.naOrder?.orderDate ||
                data.plotDetails?.naOrderDate ||
                ""
            },
            tpApproval: {
              office:
                data.plotDetails?.tpApproval?.office ||
                data.plotDetails?.tpOffice ||
                "",
              approvalNo:
                data.plotDetails?.tpApproval?.approvalNo ||
                data.plotDetails?.tpApprovalNo ||
                ""
            },
            revenue: {
              mouza: data.plotDetails?.revenue?.mouza || data.plotDetails?.mouza || "",
              taluka: data.plotDetails?.revenue?.taluka || data.plotDetails?.taluka || "",
              district: data.plotDetails?.revenue?.district || data.plotDetails?.district || "",
              state: data.plotDetails?.revenue?.state || "Maharashtra",
              surveyNo: data.plotDetails?.revenue?.surveyNo || data.plotDetails?.surveyNo || "",
              gatNo: data.plotDetails?.revenue?.gatNo || data.plotDetails?.gatNo || "",
              hissaNo: data.plotDetails?.hissaNo || "",
              plotNo: data.plotDetails?.plotNo || ""
            },
            infra: {
              internalRoadType:
                data.plotDetails?.infra?.internalRoadType ||
                data.plotDetails?.internalRoadType ||
                "",
              typicalRoadWidthFeet:
                data.plotDetails?.infra?.typicalRoadWidthFeet != null
                  ? String(data.plotDetails?.infra?.typicalRoadWidthFeet)
                  : data.plotDetails?.roadWidthFeet != null
                    ? String(data.plotDetails?.roadWidthFeet)
                    : data.plotDetails?.roadWidthM != null
                      ? String(Math.round(data.plotDetails?.roadWidthM * 3.28084))
                      : "",
              roadWidthM:
                data.plotDetails?.roadWidthM != null
                  ? String(data.plotDetails.roadWidthM)
                  : data.plotDetails?.roadWidthFeet != null
                    ? String(Math.round(data.plotDetails.roadWidthFeet / 3.28084))
                    : "",
              roadType: data.plotDetails?.roadType || "",
              waterAvailable:
                data.plotDetails?.infra?.waterAvailable == null
                  ? data.plotDetails?.waterAvailable == null
                    ? ""
                    : data.plotDetails.waterAvailable
                      ? "yes"
                      : "no"
                  : data.plotDetails.infra.waterAvailable
                    ? "yes"
                    : "no",
              electricityAvailable:
                data.plotDetails?.infra?.electricityAvailable == null
                  ? data.plotDetails?.electricityAvailable == null
                    ? ""
                    : data.plotDetails.electricityAvailable
                      ? "yes"
                      : "no"
                  : data.plotDetails.infra.electricityAvailable
                    ? "yes"
                    : "no",
              drainageAvailable:
                data.plotDetails?.infra?.drainageAvailable == null
                  ? data.plotDetails?.sewageAvailable == null
                    ? ""
                    : data.plotDetails.sewageAvailable
                      ? "yes"
                      : "no"
                  : data.plotDetails.infra.drainageAvailable
                    ? "yes"
                    : "no",
              waterConnection:
                data.plotDetails?.waterConnection == null ? "" : data.plotDetails.waterConnection ? "yes" : "no",
              electricityConnection:
                data.plotDetails?.electricityConnection == null
                  ? ""
                  : data.plotDetails.electricityConnection
                    ? "yes"
                    : "no",
              drainageConnection:
                data.plotDetails?.drainageConnection == null ? "" : data.plotDetails.drainageConnection ? "yes" : "no",
              streetLights:
                data.plotDetails?.infra?.streetLights == null
                  ? ""
                  : data.plotDetails.infra.streetLights
                    ? "yes"
                    : "no",
              boundaryWall:
                data.plotDetails?.infra?.boundaryWall == null
                  ? data.plotDetails?.boundaryWall == null
                    ? ""
                    : data.plotDetails.boundaryWall
                      ? "yes"
                      : "no"
                  : data.plotDetails.infra.boundaryWall
                    ? "yes"
                    : "no",
              sewageSystem:
                data.plotDetails?.infra?.sewageSystem ||
                data.plotDetails?.sewageSystem ||
                "",
              waterSource:
                data.plotDetails?.infra?.waterSource ||
                data.plotDetails?.waterSource ||
                ""
            },
            gatedCommunity:
              data.plotDetails?.gatedCommunity == null ? "" : data.plotDetails.gatedCommunity ? "yes" : "no",
            bankLoanApproved:
              data.plotDetails?.bankLoanApproved == null ? "" : data.plotDetails.bankLoanApproved ? "yes" : "no",
            bankLoanReady:
              data.plotDetails?.bankLoanReady == null ? "" : data.plotDetails.bankLoanReady ? "yes" : "no",
            titleClear:
              (data.plotDetails as any)?.titleClear == null ? "" : (data.plotDetails as any).titleClear ? "yes" : "no",
            litigation:
              (data.plotDetails as any)?.litigation == null ? "" : (data.plotDetails as any).litigation ? "yes" : "no",
            approvedBanks: data.plotDetails?.approvedBanks?.join(", ") || "",
            possessionTimeline: data.plotDetails?.possessionTimeline || (data.plotDetails?.possessionTimelineNote ? "custom" : ""),
            possessionTimelineNote: data.plotDetails?.possessionTimelineNote || ""
          },
          commercialDetails: {
            typicalUnitSizeMinSqFt:
              data.commercialDetails?.typicalUnitSizeMinSqFt != null
                ? String(data.commercialDetails.typicalUnitSizeMinSqFt)
                : "",
            typicalUnitSizeMaxSqFt:
              data.commercialDetails?.typicalUnitSizeMaxSqFt != null
                ? String(data.commercialDetails.typicalUnitSizeMaxSqFt)
                : "",
            parkingNotes: data.commercialDetails?.parkingNotes || "",
            footfallEstimateMinPerDay:
              data.commercialDetails?.footfallEstimateMinPerDay != null
                ? String(data.commercialDetails.footfallEstimateMinPerDay)
                : "",
            footfallEstimateMaxPerDay:
              data.commercialDetails?.footfallEstimateMaxPerDay != null
                ? String(data.commercialDetails.footfallEstimateMaxPerDay)
                : "",
            frontageVisibility: data.commercialDetails?.frontageVisibility || "",
            mainRoadAccess:
              data.commercialDetails?.mainRoadAccess == null
                ? ""
                : data.commercialDetails.mainRoadAccess
                  ? "yes"
                  : "no",
            nearbyAnchor: data.commercialDetails?.nearbyAnchor || ""
          },
          mixedUseIncludes: {
            residential: Boolean(data.mixedUseIncludes?.residential ?? data.mixedIncludes?.residential),
            commercial: Boolean(data.mixedUseIncludes?.commercial ?? data.mixedIncludes?.commercial),
            plotted: Boolean(data.mixedUseIncludes?.plotted ?? data.mixedIncludes?.plotted)
          },
          mixedDetails: {
            kind: data.mixedDetails?.kind || (data.type === "mixed_building" ? "mixed_building" : "township"),
            totalLandArea:
              data.mixedDetails?.totalLandArea != null ? String(data.mixedDetails.totalLandArea) : "",
            landAreaUnit: data.mixedDetails?.landAreaUnit || "acre",
            phasesCount: data.mixedDetails?.phasesCount != null ? String(data.mixedDetails.phasesCount) : "",
            sectorsCount: data.mixedDetails?.sectorsCount != null ? String(data.mixedDetails.sectorsCount) : "",
            internalRoadType: data.mixedDetails?.internalRoads?.roadType || "",
            internalRoadMinWidthM:
              data.mixedDetails?.internalRoads?.minWidthM != null ? String(data.mixedDetails.internalRoads.minWidthM) : "",
            openSpacePct: data.mixedDetails?.openSpacePct != null ? String(data.mixedDetails.openSpacePct) : "",
            masterPlanNotes: data.mixedDetails?.masterPlanNotes || "",
            buildingName: data.mixedDetails?.buildingName || "",
            towersCount: data.mixedDetails?.towersCount != null ? String(data.mixedDetails.towersCount) : "",
            totalFloors: data.mixedDetails?.totalFloors != null ? String(data.mixedDetails.totalFloors) : "",
            podiumParking:
              data.mixedDetails?.podiumParking == null ? "" : data.mixedDetails.podiumParking ? "yes" : "no",
            retailFloors: data.mixedDetails?.retailFloors != null ? String(data.mixedDetails.retailFloors) : "",
            residentialFloors:
              data.mixedDetails?.residentialFloors != null ? String(data.mixedDetails.residentialFloors) : ""
          },
          approvals: {
            layoutApproved: Boolean(data.approvals?.layoutApproved),
            naApproved: Boolean(data.approvals?.naApproved),
            fireNocApproved: Boolean(data.approvals?.fireNocApproved),
            ocApproved: Boolean(data.approvals?.ocApproved),
            ccApproved: Boolean(data.approvals?.ccApproved),
            liftInspectionApproved: Boolean(data.approvals?.liftInspectionApproved),
            tradeLicenseReady: Boolean(data.approvals?.tradeLicenseReady)
          },
          rera: {
            number: data.rera?.number || "",
            authority: data.rera?.authority || ""
          },
          salesStatus: {
            preLaunch: Boolean(data.salesStatus?.preLaunch),
            bookingOpen: Boolean(data.salesStatus?.bookingOpen),
            constructionLinkedPlan: Boolean(data.salesStatus?.constructionLinkedPlan),
            subventionPlan: Boolean(data.salesStatus?.subventionPlan)
          },
          flags: {
            featured: Boolean(data.flags?.featured),
            verified: Boolean(data.flags?.verified),
            exclusivePartner: Boolean(data.flags?.exclusivePartner),
            premiumPosition: data.flags?.premiumPosition != null ? String(data.flags.premiumPosition) : ""
          },
          location: {
            city: data.location?.city || "",
            area: data.location?.area || "",
            addressLine: data.location?.addressLine || "",
            landmark: data.location?.landmark || "",
            pincode: data.location?.pincode || "",
            district: data.location?.district || "",
            state: data.location?.state || "",
            lat: data.location?.lat != null ? String(data.location.lat) : "",
            lng: data.location?.lng != null ? String(data.location.lng) : ""
          },
          priceRange: {
            min: data.priceRange?.min != null ? String(data.priceRange.min) : "",
            max: data.priceRange?.max != null ? String(data.priceRange.max) : ""
          },
          amenities: data.amenities || [],
          highlights: data.highlights || [],
          seo: {
            shortDescription: data.seo?.shortDescription || "",
            longDescription: data.seo?.longDescription || "",
            metaTitle: data.seo?.metaTitle || data.seo?.title || "",
            metaDescription: data.seo?.metaDescription || data.seo?.description || ""
          },
          media: {
            cover: (data.media?.cover as MediaItem) || null,
            gallery: (data.media?.gallery as MediaItem[]) || [],
            brochure: (data.media?.brochure as MediaItem) || null
          }
        });
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load project");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, projectId]);

  useEffect(() => {
    void refreshPublishChecklist();
  }, [tenantId, effectiveProjectId]);

  useEffect(() => {
    async function loadLinkedListings() {
      if (!tenantId || !effectiveProjectId) return;
      try {
        await refreshToken();
        const data = await listings.list(tenantId, { projectId: effectiveProjectId });
        setLinkedListings(data.items || []);
      } catch {
        setLinkedListings([]);
      }
    }
    loadLinkedListings();
  }, [tenantId, effectiveProjectId, refreshToken]);

  useEffect(() => {
    async function hydrateMedia() {
      const paths = [
        form.developer.logo?.objectPath || "",
        form.media.cover?.objectPath || "",
        ...(form.media.gallery || []).map((item) => item.objectPath)
      ].filter(Boolean);
      if (paths.length === 0) {
        setMediaPreviews({});
        return;
      }
      try {
        const map = await signGetMedia(paths);
        setMediaPreviews(map);
      } catch {
        setMediaPreviews({});
      }
    }
    hydrateMedia();
  }, [form.developer.logo, form.media.cover, form.media.gallery]);

  const buildPayload = () => {
    const min = toNumOrUndef(form.priceRange.min);
    const max = toNumOrUndef(form.priceRange.max);
    const lat = latValid ? latNumber : undefined;
    const lng = lngValid ? lngNumber : undefined;
    const totalUnitsPlanned = toNumOrUndef(form.totalUnitsPlanned);
    const normalizedPlotInventories = normalizePlotInventoryRows(form.plotDetails.plotInventories || []);
    const plotCountFromInventories = normalizedPlotInventories.reduce(
      (sum, row) => sum + (Number(row?.count) || 0),
      0
    );
    const manualTotalPlotsPlanned = toNumOrUndef(form.plotDetails.totalPlotsPlanned);
    const effectiveTotalUnitsPlanned = isPlot ? undefined : totalUnitsPlanned;
    const inventory =
      form.inventory.towers ||
      form.inventory.floors ||
      form.inventory.parking.trim()
        ? {
            towers: form.inventory.towers ? Number(form.inventory.towers) : undefined,
            floors: form.inventory.floors ? Number(form.inventory.floors) : undefined,
            parking: form.inventory.parking.trim() || undefined
          }
        : undefined;
    const plotDetails = showPlotSummary
      ? (() => {
          const approvals = stripEmpty({
            layoutApproved: form.plotDetails.approvals.layoutApproved || undefined,
            naApproved: form.plotDetails.approvals.naApproved || undefined,
            tpApproved: form.plotDetails.approvals.tpApproved || undefined
          });
          const layoutApproval = stripEmpty({
            authority: trimOrUndef(form.plotDetails.layoutApproval.authority),
            approvalNo: trimOrUndef(form.plotDetails.layoutApproval.approvalNo),
            approvalDate: form.plotDetails.layoutApproval.approvalDate || undefined
          });
          const naOrder = stripEmpty({
            orderNo: trimOrUndef(form.plotDetails.naOrder.orderNo),
            orderDate: form.plotDetails.naOrder.orderDate || undefined
          });
          const tpApproval = stripEmpty({
            office: trimOrUndef(form.plotDetails.tpApproval.office),
            approvalNo: trimOrUndef(form.plotDetails.tpApproval.approvalNo)
          });
          const revenue = stripEmpty({
            mouza: trimOrUndef(form.plotDetails.revenue.mouza),
            taluka: trimOrUndef(form.plotDetails.revenue.taluka),
            district: trimOrUndef(form.plotDetails.revenue.district),
            state: trimOrUndef(form.plotDetails.revenue.state),
            surveyNo: trimOrUndef(form.plotDetails.revenue.surveyNo),
            gatNo: trimOrUndef(form.plotDetails.revenue.gatNo)
          });
          const infra = stripEmpty({
            internalRoadType: trimOrUndef(form.plotDetails.infra.internalRoadType),
            typicalRoadWidthFeet: toNumOrUndef(form.plotDetails.infra.typicalRoadWidthFeet),
            waterAvailable: toBoolOrUndef(form.plotDetails.infra.waterAvailable),
            electricityAvailable: toBoolOrUndef(form.plotDetails.infra.electricityAvailable),
            drainageAvailable: toBoolOrUndef(form.plotDetails.infra.drainageAvailable),
            streetLights: toBoolOrUndef(form.plotDetails.infra.streetLights),
            boundaryWall: toBoolOrUndef(form.plotDetails.infra.boundaryWall),
            sewageSystem: trimOrUndef(form.plotDetails.infra.sewageSystem),
            waterSource: trimOrUndef(form.plotDetails.infra.waterSource)
          });
          const next = {
            totalLandArea: toNumOrUndef(form.plotDetails.totalLandArea),
            totalLandAreaUnit: form.plotDetails.totalLandAreaUnit || undefined,
            totalPlotsPlanned:
              plotCountFromInventories > 0 ? plotCountFromInventories : manualTotalPlotsPlanned,
            plotInventories: normalizedPlotInventories.length ? normalizedPlotInventories : undefined,
            approvals,
            layoutApproval,
            naOrder,
            tpApproval,
            revenue,
            infra,
            gatedCommunity: toBoolOrUndef(form.plotDetails.gatedCommunity),
            hissaNo: trimOrUndef(form.plotDetails.revenue.hissaNo),
            plotNo: trimOrUndef(form.plotDetails.revenue.plotNo),
            roadWidthM: toNumOrUndef(form.plotDetails.infra.roadWidthM),
            roadType: trimOrUndef(form.plotDetails.infra.roadType),
            waterConnection: toBoolOrUndef(form.plotDetails.infra.waterConnection),
            electricityConnection: toBoolOrUndef(form.plotDetails.infra.electricityConnection),
            drainageConnection: toBoolOrUndef(form.plotDetails.infra.drainageConnection),
            bankLoanApproved: toBoolOrUndef(form.plotDetails.bankLoanApproved),
            bankLoanReady: toBoolOrUndef(form.plotDetails.bankLoanReady),
            titleClear: toBoolOrUndef(form.plotDetails.titleClear),
            litigation: toBoolOrUndef(form.plotDetails.litigation),
            approvedBanks: form.plotDetails.approvedBanks
              ? form.plotDetails.approvedBanks.split(",").map((item) => item.trim()).filter(Boolean)
              : undefined,
            possessionTimeline:
              form.plotDetails.possessionTimeline && form.plotDetails.possessionTimeline !== "custom"
                ? form.plotDetails.possessionTimeline
                : undefined,
            possessionTimelineNote: form.plotDetails.possessionTimelineNote.trim() || undefined
          };
          return stripEmpty(next);
        })()
      : undefined;
    const developer = stripEmpty({
      logo: form.developer.logo
        ? stripEmpty({
            objectPath: trimOrUndef(form.developer.logo.objectPath || ""),
            contentType: trimOrUndef(form.developer.logo.contentType || "")
          })
        : undefined,
      experienceYears: toNumOrUndef(form.developer.experienceYears),
      completedProjectsCount: toIntOrUndef(form.developer.completedProjectsCount),
      ongoingProjectsCount: toIntOrUndef(form.developer.ongoingProjectsCount)
    });
    const salesStatus = stripEmpty({
      preLaunch: form.salesStatus.preLaunch || undefined,
      bookingOpen: form.salesStatus.bookingOpen || undefined,
      constructionLinkedPlan: form.salesStatus.constructionLinkedPlan || undefined,
      subventionPlan: form.salesStatus.subventionPlan || undefined
    });
    const flags = stripEmpty({
      featured: form.flags.featured || undefined,
      verified: form.flags.verified || undefined,
      exclusivePartner: form.flags.exclusivePartner || undefined,
      premiumPosition: toIntOrUndef(form.flags.premiumPosition)
    });
    const seo = stripEmpty({
      shortDescription: trimOrUndef(form.seo.shortDescription),
      longDescription: trimOrUndef(form.seo.longDescription),
      metaTitle: trimOrUndef(form.seo.metaTitle),
      metaDescription: trimOrUndef(form.seo.metaDescription),
      title: form.seo.metaTitle.trim().length >= 3 ? form.seo.metaTitle.trim() : undefined,
      description: form.seo.metaDescription.trim().length >= 10 ? form.seo.metaDescription.trim() : undefined
    });
    return {
      developerName: form.developerName.trim() || undefined,
      developer,
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      category: form.category || undefined,
      type: form.type,
      lifecycleStatus: form.lifecycleStatus,
      recordStatus: form.recordStatus,
      possessionStatus: isPlot ? undefined : form.possessionStatus || undefined,
      launchDate: form.launchDate || undefined,
      completionDate: form.completionDate || undefined,
      totalUnitsPlanned: effectiveTotalUnitsPlanned,
      configurationMix: showResidentialMix
        ? {
            bhk1: form.configurationMix.bhk1 ? Number(form.configurationMix.bhk1) : undefined,
            bhk2: form.configurationMix.bhk2 ? Number(form.configurationMix.bhk2) : undefined,
            bhk3: form.configurationMix.bhk3 ? Number(form.configurationMix.bhk3) : undefined,
            bhk4: form.configurationMix.bhk4 ? Number(form.configurationMix.bhk4) : undefined
          }
        : undefined,
      commercialMix: showCommercialMix
        ? {
            shopUnits: form.commercialMix.shopUnits ? Number(form.commercialMix.shopUnits) : undefined,
            kiosks: form.commercialMix.kiosks ? Number(form.commercialMix.kiosks) : undefined,
            foodCourtUnits: form.commercialMix.foodCourtUnits ? Number(form.commercialMix.foodCourtUnits) : undefined,
            anchorStores: form.commercialMix.anchorStores ? Number(form.commercialMix.anchorStores) : undefined,
            officeUnits: form.commercialMix.officeUnits ? Number(form.commercialMix.officeUnits) : undefined
          }
        : undefined,
      inventory,
      plotDetails,
      commercialDetails:
        showCommercialMix
          ? {
              typicalUnitSizeMinSqFt: toNumOrUndef(form.commercialDetails.typicalUnitSizeMinSqFt),
              typicalUnitSizeMaxSqFt: toNumOrUndef(form.commercialDetails.typicalUnitSizeMaxSqFt),
              parkingNotes: trimOrUndef(form.commercialDetails.parkingNotes),
              footfallEstimateMinPerDay: toNumOrUndef(form.commercialDetails.footfallEstimateMinPerDay),
              footfallEstimateMaxPerDay: toNumOrUndef(form.commercialDetails.footfallEstimateMaxPerDay),
              frontageVisibility: form.commercialDetails.frontageVisibility || undefined,
              mainRoadAccess: toBoolOrUndef(form.commercialDetails.mainRoadAccess),
              nearbyAnchor: trimOrUndef(form.commercialDetails.nearbyAnchor)
            }
          : undefined,
      mixedUseIncludes:
        form.category === "mixed"
          ? {
              residential: form.mixedUseIncludes.residential || undefined,
              commercial: form.mixedUseIncludes.commercial || undefined,
              plotted: form.mixedUseIncludes.plotted || undefined
            }
          : undefined,
      mixedDetails:
        form.category === "mixed"
          ? (() => {
              if (form.type === "mixed_building") {
                const next = {
                  kind: "mixed_building" as const,
                  buildingName: trimOrUndef(form.mixedDetails.buildingName),
                  towersCount: toNumOrUndef(form.mixedDetails.towersCount),
                  totalFloors: toNumOrUndef(form.mixedDetails.totalFloors),
                  podiumParking: toBoolOrUndef(form.mixedDetails.podiumParking),
                  retailFloors: toNumOrUndef(form.mixedDetails.retailFloors),
                  residentialFloors: toNumOrUndef(form.mixedDetails.residentialFloors)
                };
                const hasAny =
                  next.buildingName ||
                  next.towersCount != null ||
                  next.totalFloors != null ||
                  next.podiumParking != null ||
                  next.retailFloors != null ||
                  next.residentialFloors != null;
                return hasAny ? next : undefined;
              }
              const roadType = form.mixedDetails.internalRoadType || undefined;
              const roadMinWidth = toNumOrUndef(form.mixedDetails.internalRoadMinWidthM);
              const internalRoads =
                roadType || roadMinWidth != null
                  ? { roadType, minWidthM: roadMinWidth }
                  : undefined;
              const next = {
                kind: "township" as const,
                totalLandArea: toNumOrUndef(form.mixedDetails.totalLandArea),
                landAreaUnit: form.mixedDetails.landAreaUnit || undefined,
                phasesCount: toNumOrUndef(form.mixedDetails.phasesCount),
                sectorsCount: toNumOrUndef(form.mixedDetails.sectorsCount),
                internalRoads,
                openSpacePct: toNumOrUndef(form.mixedDetails.openSpacePct),
                masterPlanNotes: trimOrUndef(form.mixedDetails.masterPlanNotes)
              };
              const hasAny =
                next.totalLandArea != null ||
                next.landAreaUnit ||
                next.phasesCount != null ||
                next.sectorsCount != null ||
                next.internalRoads ||
                next.openSpacePct != null ||
                next.masterPlanNotes;
              return hasAny ? next : undefined;
            })()
          : undefined,
      approvals: isPlot
        ? undefined
        : {
            layoutApproved: form.approvals.layoutApproved || undefined,
            naApproved: form.approvals.naApproved || undefined,
            fireNocApproved: form.approvals.fireNocApproved || undefined,
            ocApproved: form.approvals.ocApproved || undefined,
            ccApproved: form.approvals.ccApproved || undefined,
            liftInspectionApproved: form.approvals.liftInspectionApproved || undefined,
            tradeLicenseReady: form.approvals.tradeLicenseReady || undefined
          },
      rera: {
        number: form.rera.number || undefined,
        authority: form.rera.authority || undefined
      },
      possessionDate: isPlot ? undefined : form.possessionDate || undefined,
      location: {
        city: form.location.city.trim(),
        area: form.location.area.trim() || undefined,
        addressLine: form.location.addressLine.trim() || undefined,
        landmark: form.location.landmark.trim() || undefined,
        pincode: form.location.pincode.trim() || undefined,
        district: form.location.district.trim() || undefined,
        state: form.location.state.trim() || undefined,
        lat,
        lng
      },
      priceRange: {
        min,
        max,
        currency: min || max ? "INR" : undefined
      },
      amenities: form.amenities.length ? form.amenities : undefined,
      highlights: form.highlights.length ? form.highlights : undefined,
      salesStatus,
      flags,
      seo,
      media: {
        cover: form.media.cover || undefined,
        gallery: form.media.gallery.length ? form.media.gallery : undefined,
        brochure: form.media.brochure || undefined
      }
    };
  };

  const saveProject = async () => {
    if (!tenantId) return;
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Enter a project name.";
    if (!form.category) nextErrors.category = "Select a project category.";
    if (!form.type) nextErrors.type = "Select a project type.";
    if (!form.lifecycleStatus) nextErrors.lifecycleStatus = "Select a project status.";
    if (!form.location.city.trim()) nextErrors.city = "Add a city.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Resolve highlighted fields before saving.");
      return;
    }
    if (hasLatLngError) {
      setError(latError || lngError || "Invalid coordinates.");
      return;
    }
    const premiumPosition = toIntOrUndef(form.flags.premiumPosition);
    if (premiumPosition != null && (premiumPosition < 1 || premiumPosition > 100)) {
      setError("Premium position must be between 1 and 100.");
      return;
    }
    if (form.seo.shortDescription.length > 160) {
      setError("Short description must be 160 characters or fewer.");
      return;
    }
    if (form.seo.metaTitle.length > 80) {
      setError("Meta title must be 80 characters or fewer.");
      return;
    }
    if (form.seo.metaDescription.length > 160) {
      setError("Meta description must be 160 characters or fewer.");
      return;
    }
    if (form.seo.longDescription.length > 20000) {
      setError("Long description must be 20000 characters or fewer.");
      return;
    }
    if (isPlot) {
      const rows = form.plotDetails.plotInventories || [];
      const invalidRow = rows.find((row) => {
        const hasAny =
          Boolean(row.sizeValue) ||
          Boolean(row.count) ||
          Boolean(row.frontageFt) ||
          Boolean(row.depthFt) ||
          Boolean(row.label?.trim());
        if (!hasAny) return false;
        const sizeValue = row.sizeValue ? Number(row.sizeValue) : undefined;
        const count = row.count ? Number(row.count) : undefined;
        if (sizeValue == null || sizeValue <= 0) return true;
        if (count == null || count <= 0 || !Number.isInteger(count)) return true;
        if (!row.sizeUnit) return true;
        return false;
      });
      if (invalidRow) {
        setError("Each plot size row needs a size, unit, and count.");
        return;
      }
    }
    if (showCommercialMix) {
      const sizeMin = form.commercialDetails.typicalUnitSizeMinSqFt
        ? Number(form.commercialDetails.typicalUnitSizeMinSqFt)
        : undefined;
      const sizeMax = form.commercialDetails.typicalUnitSizeMaxSqFt
        ? Number(form.commercialDetails.typicalUnitSizeMaxSqFt)
        : undefined;
      if (sizeMin != null && sizeMax != null && sizeMin > sizeMax) {
        setError("Typical size min must be less than or equal to max.");
        return;
      }
      const footfallMin = form.commercialDetails.footfallEstimateMinPerDay
        ? Number(form.commercialDetails.footfallEstimateMinPerDay)
        : undefined;
      const footfallMax = form.commercialDetails.footfallEstimateMaxPerDay
        ? Number(form.commercialDetails.footfallEstimateMaxPerDay)
        : undefined;
      if (footfallMin != null && footfallMax != null && footfallMin > footfallMax) {
        setError("Footfall min must be less than or equal to max.");
        return;
      }
    }
    if (isMixed) {
      const includesSelected =
        form.mixedUseIncludes.residential || form.mixedUseIncludes.commercial || form.mixedUseIncludes.plotted;
      if (!includesSelected) {
        setFieldErrors((prev) => ({ ...prev, mixedIncludes: "Select at least one category to include." }));
        setError("Select at least one mixed-use include.");
        return;
      }
      if (form.type === "township") {
        const landArea = toNumOrUndef(form.mixedDetails.totalLandArea);
        if (!landArea || landArea <= 0 || !form.mixedDetails.landAreaUnit) {
          setFieldErrors((prev) => ({ ...prev, mixedDetails: "Add total land area and unit for township." }));
          setError("Total land area is required for township.");
          return;
        }
        const openSpacePct = toNumOrUndef(form.mixedDetails.openSpacePct);
        if (openSpacePct != null && (openSpacePct < 0 || openSpacePct > 100)) {
          setError("Open space percentage must be between 0 and 100.");
          return;
        }
        const roadMinWidth = toNumOrUndef(form.mixedDetails.internalRoadMinWidthM);
        if (roadMinWidth != null && roadMinWidth <= 0) {
          setError("Internal road min width must be greater than 0.");
          return;
        }
      }
      if (form.type === "mixed_building") {
        const totalFloors = toNumOrUndef(form.mixedDetails.totalFloors);
        const retailFloors = toNumOrUndef(form.mixedDetails.retailFloors);
        const residentialFloors = toNumOrUndef(form.mixedDetails.residentialFloors);
        if (totalFloors != null && totalFloors <= 0) {
          setError("Total floors must be greater than 0.");
          return;
        }
        if (retailFloors != null && retailFloors < 0) {
          setError("Retail floors must be 0 or greater.");
          return;
        }
        if (residentialFloors != null && residentialFloors < 0) {
          setError("Residential floors must be 0 or greater.");
          return;
        }
        if (
          totalFloors != null &&
          retailFloors != null &&
          residentialFloors != null &&
          retailFloors + residentialFloors > totalFloors
        ) {
          setError("Retail + residential floors must be less than or equal to total floors.");
          return;
        }
        if (totalFloors != null && retailFloors != null && retailFloors > totalFloors) {
          setError("Retail floors must be less than or equal to total floors.");
          return;
        }
        if (totalFloors != null && residentialFloors != null && residentialFloors > totalFloors) {
          setError("Residential floors must be less than or equal to total floors.");
          return;
        }
      }
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (isNew) {
        const res = await createAdminProject(tenantId, payload);
        const id = res.data.id;
        if (id) {
          setCreatedId(id);
          setMessage("Draft created.");
          void refreshPublishChecklist(id);
          navigate(`/projects/${id}/edit`, { replace: true });
        }
      } else if (projectId) {
        await updateAdminProject(tenantId, projectId, payload);
        void refreshPublishChecklist(projectId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!tenantId || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      if (projectStatus === "published") {
        await unpublishAdminProject(tenantId, projectId);
        setProjectStatus("draft");
      } else {
        await publishAdminProject(tenantId, projectId);
        setProjectStatus("published");
        navigate("/projects");
      }
    } catch (err: any) {
      const issues = Array.isArray(err?.details?.issues) ? err.details.issues : [];
      if (issues.length > 0) {
        setPublishIssues(issues);
      }
      setError(err.message || "Failed to update visibility");
    } finally {
      setSaving(false);
    }
  };

  const refreshPublishChecklist = async (nextProjectId?: string | null) => {
    const targetProjectId = nextProjectId || effectiveProjectId;
    if (!tenantId || !targetProjectId) {
      setPublishIssues([]);
      return;
    }
    setChecklistLoading(true);
    try {
      const res = await getAdminProjectPublishChecklist(tenantId, targetProjectId);
      setPublishIssues(Array.isArray(res.data.issues) ? res.data.issues : []);
    } catch {
      setPublishIssues([]);
    } finally {
      setChecklistLoading(false);
    }
  };

  const ensureDraft = async () => {
    if (!tenantId) return null;
    if (effectiveProjectId) return effectiveProjectId;
    if (creatingRef.current) return creatingRef.current;
    if (!form.name.trim() || !form.type || !form.lifecycleStatus || !form.location.city.trim()) {
      setError("Fill Basics and Location before uploading media.");
      return null;
    }
    if (hasLatLngError) {
      setError(latError || lngError || "Invalid coordinates.");
      return null;
    }
    setMessage(null);
    const payload = buildPayload();
    creatingRef.current = createAdminProject(tenantId, payload)
      .then((res) => {
        const id = res.data.id;
        if (id) {
          setCreatedId(id);
          setMessage("Draft created. Uploading media...");
          navigate(`/projects/${id}/edit`, { replace: true });
        }
        return id || null;
      })
      .catch((err: any) => {
        setError(err.message || "Failed to create draft");
        return null;
      })
      .finally(() => {
        creatingRef.current = null;
      });
    return creatingRef.current;
  };

  const uploadBrochure = async (file: File) => {
    if (!tenantId) return;
    const id = await ensureDraft();
    if (!id) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const objectPath = `tenants/${tenantId}/projects/${id}/media/brochure-${Date.now()}-${file.name}`;
      const sign = await signPutMedia(objectPath, file.type);
      const putRes = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Upload failed");
      const brochure = { objectPath, contentType: file.type, fileName: file.name };
      setForm((prev) => ({ ...prev, media: { ...prev.media, brochure } }));
      await updateAdminProject(tenantId, id, { media: { brochure } });
    } catch (err: any) {
      setError(err.message || "Failed to upload brochure");
    } finally {
      setSaving(false);
    }
  };

  const uploadDeveloperLogo = async (file: File) => {
    if (!tenantId) return;
    const id = await ensureDraft();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const objectPath = `tenants/${tenantId}/projects/${id}/media/developer-logo/${Date.now()}-${safeName}`;
      const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
      const putRes = await fetch(sign.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      if (!putRes.ok) throw new Error("Upload failed");
      const logo = { objectPath, contentType: file.type, fileName: file.name };
      setForm((prev) => ({ ...prev, developer: { ...prev.developer, logo } }));
      await updateAdminProject(tenantId, id, { developer: { logo: { objectPath, contentType: file.type } } });
    } catch (err: any) {
      setError(err.message || "Failed to upload developer logo");
    } finally {
      setSaving(false);
    }
  };

  const addChip = (value: string, field: "amenities" | "highlights") => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm((prev) => ({
      ...prev,
      [field]: Array.from(new Set([...(prev[field] || []), trimmed]))
    }));
  };

  const removeChip = (value: string, field: "amenities" | "highlights") => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value)
    }));
  };

  const uploadCover = async (file: File) => {
    if (!effectiveProjectId) {
      setError("Save basics first to upload media.");
      return;
    }
    setError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const objectPath = `tenants/${tenantId}/projects/${effectiveProjectId}/media/cover/${Date.now()}-${safeName}`;
      const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
      const res = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed");
      setForm((prev) => ({
        ...prev,
        media: {
          ...prev.media,
          cover: { objectPath, contentType: file.type, fileName: file.name, kind: "image" }
        }
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload cover");
    }
  };

  const uploadGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!effectiveProjectId) {
      setError("Save basics first to upload media.");
      return;
    }
    setError("");
    try {
      const uploads: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const objectPath = `tenants/${tenantId}/projects/${effectiveProjectId}/media/gallery/${Date.now()}-${safeName}`;
        const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
        const res = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!res.ok) throw new Error("Upload failed");
        uploads.push({ objectPath, contentType: file.type, fileName: file.name, kind: "image" });
      }
      setForm((prev) => ({
        ...prev,
        media: { ...prev.media, gallery: [...prev.media.gallery, ...uploads] }
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload gallery");
    }
  };

  const uploadVideos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!effectiveProjectId) {
      setError("Save basics first to upload media.");
      return;
    }
    setError("");
    try {
      const uploads: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const objectPath = `tenants/${tenantId}/projects/${effectiveProjectId}/media/videos/${Date.now()}-${safeName}`;
        const sign = await signPutMedia(objectPath, file.type || "application/octet-stream");
        const res = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!res.ok) throw new Error("Upload failed");
        uploads.push({ objectPath, contentType: file.type, fileName: file.name, kind: "video" });
      }
      setForm((prev) => ({
        ...prev,
        media: { ...prev.media, gallery: [...prev.media.gallery, ...uploads] }
      }));
    } catch (err: any) {
      setError(err.message || "Failed to upload videos");
    }
  };

  const handleMapChange = (next: { lat?: number; lng?: number }) => {
    setMapError(null);
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        lat: next.lat != null ? String(next.lat) : "",
        lng: next.lng != null ? String(next.lng) : ""
      }
    }));
  };

  const handleClearPin = () => {
    setMapError(null);
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, lat: "", lng: "" }
    }));
  };

  const handleUseMyLocation = () => {
    if (isReadOnly) return;
    setMapError(null);
    if (!navigator.geolocation) {
      setMapError("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setMapError(err.message || "Unable to fetch current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirmLocation = (result: { lat: number; lng: number; formattedAddress?: string; locality?: string }) => {
    setForm((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        lat: String(result.lat),
        lng: String(result.lng),
        addressLine: prev.location.addressLine || result.formattedAddress || "",
        area: prev.location.area || result.locality || ""
      }
    }));
    setShowMapPicker(false);
  };

  const plotCountFromInventoriesUi =
    form.plotDetails.plotInventories?.reduce((sum, item) => {
      const sizeValue = item.sizeValue ? Number(item.sizeValue) : 0;
      const count = item.count ? Number(item.count) : 0;
      const isActive = Boolean(item.sizeValue || item.count || item.frontageFt || item.depthFt || item.label?.trim());
      if (isActive && sizeValue > 0 && Number.isInteger(count) && count > 0 && item.sizeUnit) {
        return sum + count;
      }
      return sum;
    }, 0) ?? 0;
  const totalUnitsPlannedNumber = form.totalUnitsPlanned ? Number(form.totalUnitsPlanned) : undefined;
  const totalPlotsPlannedNumber = form.plotDetails.totalPlotsPlanned ? Number(form.plotDetails.totalPlotsPlanned) : undefined;
  const configurationMixCount = [
    form.configurationMix.bhk1,
    form.configurationMix.bhk2,
    form.configurationMix.bhk3,
    form.configurationMix.bhk4
  ].some((value) => Number(value) > 0);
  const hasUnits = counts?.totalUnits ? counts.totalUnits > 0 : false;
  const hasPlotApprovals = form.plotDetails.approvals.layoutApproved || form.plotDetails.approvals.naApproved;
  const hasPlotInventory = plotCountFromInventoriesUi > 0 || Boolean(totalPlotsPlannedNumber && totalPlotsPlannedNumber > 0);
  const hasResidentialInventory = showResidentialMix
    ? Boolean(totalUnitsPlannedNumber || configurationMixCount || hasUnits)
    : false;
  const hasCommercialInventory = showCommercialMix
    ? Boolean(
        totalUnitsPlannedNumber ||
          hasUnits ||
          Number(form.commercialDetails.typicalUnitSizeMinSqFt) > 0 ||
          Number(form.commercialDetails.typicalUnitSizeMaxSqFt) > 0
      )
    : false;
  const hasMixedIncludes = Boolean(
    form.mixedUseIncludes.residential || form.mixedUseIncludes.commercial || form.mixedUseIncludes.plotted
  );
  const hasMixedDetails = isMixed
    ? form.type === "township"
      ? Boolean(form.mixedDetails.totalLandArea || form.mixedDetails.landAreaUnit)
      : Boolean(form.mixedDetails.buildingName || form.mixedDetails.towersCount || form.mixedDetails.totalFloors)
    : false;
  const hasTownshipLandArea = Boolean(form.mixedDetails.totalLandArea && form.mixedDetails.landAreaUnit);
  const mixedIncludesCount = [
    form.mixedUseIncludes.residential,
    form.mixedUseIncludes.commercial,
    form.mixedUseIncludes.plotted
  ].filter(Boolean).length;
  const publishChecklist = [
    { label: "Project name", ok: Boolean(form.name.trim()), step: 0 },
    { label: "Developer name", ok: Boolean(form.developerName.trim()), step: 0 },
    { label: "Category", ok: Boolean(form.category), step: 0 },
    { label: "Type", ok: Boolean(form.type), step: 0 },
    { label: "Lifecycle status", ok: Boolean(form.lifecycleStatus), step: 0 },
    { label: "Record status must be active", ok: form.recordStatus === "active", step: 0 },
    { label: "City", ok: Boolean(form.location.city.trim()), step: 1 },
    { label: "Area / locality", ok: Boolean(form.location.area.trim()), step: 1 },
    { label: "Cover image", ok: Boolean(form.media.cover?.objectPath), step: 4 },
    ...(isResidential
      ? [
          { label: "Possession status", ok: Boolean(form.possessionStatus), step: 0 },
          { label: "Inventory or configuration mix", ok: hasResidentialInventory, step: 0 }
        ]
      : []),
    ...(isCommercial
      ? [
          { label: "Possession status", ok: Boolean(form.possessionStatus), step: 0 },
          { label: "Inventory or typical size range", ok: hasCommercialInventory, step: 0 }
        ]
      : []),
    ...(isPlot
      ? [
          { label: "Layout or NA approval", ok: hasPlotApprovals, step: 0 },
          { label: "Total plots planned", ok: hasPlotInventory, step: 0 },
          { label: "Plot mouza", ok: Boolean(form.plotDetails.revenue.mouza.trim()), step: 0 },
          { label: "Plot taluka", ok: Boolean(form.plotDetails.revenue.taluka.trim()), step: 0 },
          { label: "Plot district", ok: Boolean(form.plotDetails.revenue.district.trim()), step: 0 },
          {
            label: "Layout approval no.",
            ok: !form.plotDetails.approvals.layoutApproved || Boolean(form.plotDetails.layoutApproval.approvalNo.trim()),
            step: 0
          },
          {
            label: "NA order no.",
            ok: !form.plotDetails.approvals.naApproved || Boolean(form.plotDetails.naOrder.orderNo.trim()),
            step: 0
          }
        ]
      : []),
    ...(isMixed
      ? [
          { label: "Mixed-use includes", ok: hasMixedIncludes, step: 0 },
          { label: "Mixed details", ok: hasMixedDetails, step: 0 },
          ...(form.type === "township" ? [{ label: "Township land area", ok: hasTownshipLandArea, step: 0 }] : [])
        ]
      : [])
  ];
  const recommendedPriceRange = Boolean(form.priceRange.min || form.priceRange.max);
  const recommendedItems = [
    { label: "Price range", ok: recommendedPriceRange, step: 2 },
    { label: "Units added", ok: hasUnits, step: 5 },
    ...(showReraWarning ? [{ label: "RERA number recommended", ok: false, step: 0 }] : []),
    ...(isPlot ? [{ label: "Layout plan / brochure", ok: Boolean(form.media.brochure?.objectPath), step: 4 }] : []),
    ...(isMixed ? [{ label: "Include at least 2 categories", ok: mixedIncludesCount >= 2, step: 0 }] : [])
  ];
  const backendBlockingIssues = publishIssues.filter((issue) => issue.blocking);
  const backendWarningIssues = publishIssues.filter((issue) => !issue.blocking);
  const reraIssue = publishIssues.find((issue) => issue.field === "rera.number");
  const canPublish = publishChecklist.every((item) => item.ok);

  const stepContent = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return (
          <div className="space-y-4">
            {isNew && (
              <div className="rounded-2xl border border-theme bg-surface p-4">
                <div className="text-sm font-semibold text-primary">Project template</div>
                <div className="mt-1 text-xs text-secondary">Prefill structure for common project types.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { key: "residential", label: "Residential", type: "apartment" },
                    { key: "plotted", label: "Plotted", type: "plot_layout" },
                    { key: "commercial", label: "Commercial", type: "shop" },
                    { key: "mixed", label: "Mixed", type: "township" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setTemplate(item.key);
                        setForm((prev) => ({
                          ...prev,
                          category: item.key,
                          type: item.type,
                          lifecycleStatus: "planning"
                        }));
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        template === item.key ? "bg-amber-100 text-amber-800" : "border border-theme text-secondary"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-secondary">Project name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`mt-2 w-full rounded-md input-glass px-3 py-2 text-sm ${
                    fieldErrors.name ? "border-rose-500/60" : ""
                  }`}
                  placeholder="Chandrapur Heights"
                  disabled={isReadOnly}
                />
                {fieldErrors.name && <div className="mt-1 text-[11px] text-rose-300">{fieldErrors.name}</div>}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Developer / Builder</label>
                <input
                  value={form.developerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, developerName: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="ChandaNest Realty"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Slug (optional)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="chandrapur-heights"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const next = e.target.value;
                    const nextType = typeFromCategory(next);
                    setForm((prev) => ({
                      ...prev,
                      category: next,
                      type: nextType,
                      mixedDetails:
                        next === "mixed"
                          ? {
                              ...prev.mixedDetails,
                              kind: nextType === "mixed_building" ? "mixed_building" : "township"
                            }
                          : prev.mixedDetails
                    }));
                  }}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                >
                  <option value="residential">Residential</option>
                  <option value="plotted">Plotted</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed</option>
                </select>
                {fieldErrors.category && (
                  <div className="mt-1 text-[11px] text-rose-300">{fieldErrors.category}</div>
                )}
                <div className="mt-1 text-[11px] text-muted">Choose a category first, then refine the type.</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      type: nextType,
                      mixedDetails:
                        prev.category === "mixed"
                          ? {
                              ...prev.mixedDetails,
                              kind: nextType === "mixed_building" ? "mixed_building" : "township"
                            }
                          : prev.mixedDetails
                    }));
                  }}
                  className={`mt-2 w-full rounded-md input-glass px-3 py-2 text-sm ${
                    fieldErrors.type ? "border-rose-500/60" : ""
                  }`}
                  disabled={isReadOnly}
                >
                  {(TYPE_OPTIONS[form.category] || TYPE_OPTIONS.residential).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.type && <div className="mt-1 text-[11px] text-rose-300">{fieldErrors.type}</div>}
                {isMixed && (
                  <div className="mt-1 text-[11px] text-muted">
                    Township spans multiple phases; mixed building is a single multi-use structure.
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Status *</label>
                <select
                  value={form.lifecycleStatus}
                  onChange={(e) => setForm((prev) => ({ ...prev, lifecycleStatus: e.target.value }))}
                  className={`mt-2 w-full rounded-md input-glass px-3 py-2 text-sm ${
                    fieldErrors.lifecycleStatus ? "border-rose-500/60" : ""
                  }`}
                  disabled={isReadOnly}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.lifecycleStatus && (
                  <div className="mt-1 text-[11px] text-rose-300">{fieldErrors.lifecycleStatus}</div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Record status</label>
                <select
                  value={form.recordStatus}
                  onChange={(e) => setForm((prev) => ({ ...prev, recordStatus: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="mt-1 text-[11px] text-muted">Use inactive to hide without deleting.</div>
              </div>
              {!isPlot && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Possession status</label>
                    <select
                      value={form.possessionStatus}
                      onChange={(e) => setForm((prev) => ({ ...prev, possessionStatus: e.target.value }))}
                      className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="under_construction">Under construction</option>
                      <option value="ready">Ready</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary">Possession date</label>
                    <input
                      type="date"
                      value={form.possessionDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, possessionDate: e.target.value }))}
                      className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold text-secondary">Launch date</label>
                <input
                  type="date"
                  value={form.launchDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, launchDate: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Completion date</label>
                <input
                  type="date"
                  value={form.completionDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, completionDate: e.target.value }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">
                  {isPlot ? "Total plots (planned)" : "Total units (planned)"}
                </label>
                <input
                  type="number"
                  value={isPlot ? (plotCountFromInventoriesUi > 0 ? String(plotCountFromInventoriesUi) : form.plotDetails.totalPlotsPlanned) : form.totalUnitsPlanned}
                  onChange={(e) =>
                    setForm((prev) =>
                      isPlot
                        ? { ...prev, plotDetails: { ...prev.plotDetails, totalPlotsPlanned: e.target.value } }
                        : { ...prev, totalUnitsPlanned: e.target.value }
                    )
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder={isPlot ? "e.g., 48" : "e.g., 120"}
                  disabled={isReadOnly || (isPlot && plotCountFromInventoriesUi > 0)}
                  readOnly={isPlot && plotCountFromInventoriesUi > 0}
                />
                {isPlot && (
                  <div className="mt-1 text-[11px] text-muted">Plot size buckets override this value when present.</div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">
                  RERA number
                  {reraIssue?.blocking ? (
                    <span className="ml-2 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">Required for publish</span>
                  ) : reraIssue ? (
                    <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">Warning</span>
                  ) : null}
                </label>
                <input
                  value={form.rera.number}
                  onChange={(e) => setForm((prev) => ({ ...prev, rera: { ...prev.rera, number: e.target.value } }))}
                  className={`mt-2 w-full rounded-md input-glass px-3 py-2 text-sm ${
                    reraIssue?.blocking ? "border border-rose-500/60" : ""
                  }`}
                  placeholder="P51800012345"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">RERA authority</label>
                <input
                  value={form.rera.authority}
                  onChange={(e) => setForm((prev) => ({ ...prev, rera: { ...prev.rera, authority: e.target.value } }))}
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="MahaRERA"
                  disabled={isReadOnly}
                />
              </div>
            </div>
            {(showReraWarning || reraIssue) && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  reraIssue?.blocking
                    ? "border border-rose-500/30 bg-rose-500/10 text-rose-100"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                {reraIssue?.message || "RERA number is recommended for residential projects once lifecycle moves beyond planning."}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {(!isPlot || showCommercialApprovals) && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                <div className="text-sm font-semibold text-primary">Approvals</div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-secondary">
                  {!isPlot && (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.layoutApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, layoutApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        Layout approved
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.naApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, naApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        NA approved
                      </label>
                    </>
                  )}
                  {showCommercialApprovals && (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.fireNocApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, fireNocApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        Fire NOC approved
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.ocApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, ocApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        OC approved
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.ccApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, ccApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        CC approved
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.liftInspectionApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, liftInspectionApproved: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        Lift inspection
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.approvals.tradeLicenseReady}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              approvals: { ...prev.approvals, tradeLicenseReady: e.target.checked }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        Trade license ready
                      </label>
                    </>
                  )}
                </div>
                </div>
              )}
              {showResidentialMix && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Configuration mix</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="1 BHK units"
                      value={form.configurationMix.bhk1}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          configurationMix: { ...prev.configurationMix, bhk1: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="2 BHK units"
                      value={form.configurationMix.bhk2}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          configurationMix: { ...prev.configurationMix, bhk2: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="3 BHK units"
                      value={form.configurationMix.bhk3}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          configurationMix: { ...prev.configurationMix, bhk3: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="4 BHK units"
                      value={form.configurationMix.bhk4}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          configurationMix: { ...prev.configurationMix, bhk4: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              )}
              {showCommercialMix && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Commercial mix</div>
                  <p className="mt-1 text-xs text-secondary">
                    Helps buyers understand unit distribution.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Shop units"
                      value={form.commercialMix.shopUnits}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialMix: { ...prev.commercialMix, shopUnits: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Kiosks"
                      value={form.commercialMix.kiosks}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialMix: { ...prev.commercialMix, kiosks: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Food court units"
                      value={form.commercialMix.foodCourtUnits}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialMix: { ...prev.commercialMix, foodCourtUnits: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Anchor stores"
                      value={form.commercialMix.anchorStores}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialMix: { ...prev.commercialMix, anchorStores: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Office units"
                      value={form.commercialMix.officeUnits}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialMix: { ...prev.commercialMix, officeUnits: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              )}
              {(!isPlot || isMixed) && (showResidentialMix || showCommercialMix) && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Inventory snapshot</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Towers"
                      value={form.inventory.towers}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inventory: { ...prev.inventory, towers: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Floors"
                      value={form.inventory.floors}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inventory: { ...prev.inventory, floors: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      placeholder="Parking / facilities"
                      value={form.inventory.parking}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          inventory: { ...prev.inventory, parking: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              )}
              {showCommercialMix && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Commercial details</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Typical size min (sq ft)"
                      value={form.commercialDetails.typicalUnitSizeMinSqFt}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, typicalUnitSizeMinSqFt: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Typical size max (sq ft)"
                      value={form.commercialDetails.typicalUnitSizeMaxSqFt}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, typicalUnitSizeMaxSqFt: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      placeholder="Parking / common facilities"
                      value={form.commercialDetails.parkingNotes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, parkingNotes: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Footfall min / day"
                      value={form.commercialDetails.footfallEstimateMinPerDay}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, footfallEstimateMinPerDay: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Footfall max / day"
                      value={form.commercialDetails.footfallEstimateMaxPerDay}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, footfallEstimateMaxPerDay: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.commercialDetails.frontageVisibility}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, frontageVisibility: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Frontage visibility</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                    <select
                      value={form.commercialDetails.mainRoadAccess}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, mainRoadAccess: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Main road access</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <input
                      placeholder="Nearby anchors (comma separated)"
                      value={form.commercialDetails.nearbyAnchor}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          commercialDetails: { ...prev.commercialDetails, nearbyAnchor: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              )}
              {isMixed && form.mixedUseIncludes.plotted && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Plotted summary</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Total land area"
                      value={form.plotDetails.totalLandArea}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, totalLandArea: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.plotDetails.totalLandAreaUnit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, totalLandAreaUnit: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="sq_m">Sq. m</option>
                      <option value="acre">Acre</option>
                      <option value="hectare">Hectare</option>
                    </select>
                    <div className="space-y-1">
                      <input
                        type="number"
                        placeholder="Total plots planned"
                        value={plotCountFromInventoriesUi > 0 ? String(plotCountFromInventoriesUi) : form.plotDetails.totalPlotsPlanned}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, totalPlotsPlanned: e.target.value }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        disabled={isReadOnly || plotCountFromInventoriesUi > 0}
                        readOnly={plotCountFromInventoriesUi > 0}
                      />
                      <div className="text-[11px] text-muted">
                        Plot size buckets override this value when present.
                      </div>
                      {plotCountFromInventoriesUi <= 0 && (
                        <div className="text-[11px] text-amber-300">Add total planned plots or at least one plot size bucket.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {isMixed && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Mixed-use includes</div>
                  <div className="mt-1 text-xs text-secondary">
                    Choose what this project contains. Township includes multiple categories across phases, mixed building
                    is a single multi-use structure.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-secondary">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.mixedUseIncludes.residential}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            mixedUseIncludes: { ...prev.mixedUseIncludes, residential: e.target.checked }
                          }))
                        }
                        disabled={isReadOnly}
                      />
                      Residential
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.mixedUseIncludes.commercial}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            mixedUseIncludes: { ...prev.mixedUseIncludes, commercial: e.target.checked }
                          }))
                        }
                        disabled={isReadOnly}
                      />
                      Commercial
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.mixedUseIncludes.plotted}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            mixedUseIncludes: { ...prev.mixedUseIncludes, plotted: e.target.checked }
                          }))
                        }
                        disabled={isReadOnly}
                      />
                      Plotted
                    </label>
                  </div>
                  {fieldErrors.mixedIncludes && (
                    <div className="mt-2 text-[11px] text-rose-300">{fieldErrors.mixedIncludes}</div>
                  )}
                </div>
              )}
              {isMixed && form.type === "township" && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Township details</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      placeholder="Total land area"
                      value={form.mixedDetails.totalLandArea}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, totalLandArea: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.mixedDetails.landAreaUnit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, landAreaUnit: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="sqft">Sq. ft</option>
                      <option value="acre">Acre</option>
                      <option value="hectare">Hectare</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Phases count"
                      value={form.mixedDetails.phasesCount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, phasesCount: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Sectors count"
                      value={form.mixedDetails.sectorsCount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, sectorsCount: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.mixedDetails.internalRoadType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, internalRoadType: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Internal road type</option>
                      <option value="cc">CC</option>
                      <option value="asphalt">Asphalt</option>
                      <option value="paver">Paver</option>
                      <option value="gravel">Gravel</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Road min width (m)"
                      value={form.mixedDetails.internalRoadMinWidthM}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, internalRoadMinWidthM: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Open space %"
                      value={form.mixedDetails.openSpacePct}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, openSpacePct: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <textarea
                      placeholder="Master plan notes"
                      value={form.mixedDetails.masterPlanNotes}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, masterPlanNotes: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                      rows={3}
                      disabled={isReadOnly}
                    />
                  </div>
                  {fieldErrors.mixedDetails && (
                    <div className="mt-2 text-[11px] text-rose-300">{fieldErrors.mixedDetails}</div>
                  )}
                </div>
              )}
              {isMixed && form.type === "mixed_building" && (
                <div className="rounded-2xl border border-theme bg-surface p-4">
                  <div className="text-sm font-semibold text-primary">Building details</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      placeholder="Building name"
                      value={form.mixedDetails.buildingName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, buildingName: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Towers count"
                      value={form.mixedDetails.towersCount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, towersCount: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Total floors"
                      value={form.mixedDetails.totalFloors}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, totalFloors: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.mixedDetails.podiumParking}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, podiumParking: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Podium parking</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Retail floors"
                      value={form.mixedDetails.retailFloors}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, retailFloors: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                    <input
                      type="number"
                      placeholder="Residential floors"
                      value={form.mixedDetails.residentialFloors}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          mixedDetails: { ...prev.mixedDetails, residentialFloors: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  {fieldErrors.mixedDetails && (
                    <div className="mt-2 text-[11px] text-rose-300">{fieldErrors.mixedDetails}</div>
                  )}
                </div>
              )}
            </div>
            {isPlot && (
              <div className="rounded-2xl border border-theme bg-surface p-4 space-y-4">
<div className="rounded-xl border border-theme bg-white/60 p-3 space-y-3">
                  <div className="text-xs font-semibold text-secondary">Layout summary</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="number"
                      value={form.plotDetails.totalLandArea}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, totalLandArea: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Total land area"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.plotDetails.totalLandAreaUnit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, totalLandAreaUnit: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="sq_ft">Sq ft</option>
                      <option value="sq_m">Sq m</option>
                      <option value="acre">Acre</option>
                      <option value="hectare">Hectare</option>
                    </select>
                    <div className="space-y-1">
                      <input
                        type="number"
                        value={plotCountFromInventoriesUi > 0 ? String(plotCountFromInventoriesUi) : form.plotDetails.totalPlotsPlanned}
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Total plots planned"
                        disabled={isReadOnly || plotCountFromInventoriesUi > 0}
                        readOnly={plotCountFromInventoriesUi > 0}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, totalPlotsPlanned: e.target.value }
                          }))
                        }
                      />
                      <div className="text-[11px] text-muted">
                        Plot size buckets override this value when present.
                      </div>
                      {plotCountFromInventoriesUi <= 0 && (
                        <div className="text-[11px] text-amber-300">Add total planned plots or at least one plot size bucket.</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-theme bg-surface p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-secondary">
                      <span>Plot size buckets</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: {
                              ...prev.plotDetails,
                              plotInventories: [
                                ...prev.plotDetails.plotInventories,
                                { sizeValue: "", sizeUnit: "sq_ft", count: "", label: "", frontageFt: "", depthFt: "" }
                              ]
                            }
                          }))
                        }
                        className="text-xs text-primary underline underline-offset-2"
                        disabled={isReadOnly}
                      >
                        Add size
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {form.plotDetails.plotInventories.map((item, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-5">
                          <input
                            value={item.sizeValue}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                plotDetails: {
                                  ...prev.plotDetails,
                                  plotInventories: prev.plotDetails.plotInventories.map((entry, idx) =>
                                    idx === index ? { ...entry, sizeValue: e.target.value } : entry
                                  )
                                }
                              }))
                            }
                            className="rounded-md input-glass px-3 py-2 text-sm"
                            placeholder="Size"
                            disabled={isReadOnly}
                          />
                          <select
                            value={item.sizeUnit}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                plotDetails: {
                                  ...prev.plotDetails,
                                  plotInventories: prev.plotDetails.plotInventories.map((entry, idx) =>
                                    idx === index ? { ...entry, sizeUnit: e.target.value } : entry
                                  )
                                }
                              }))
                            }
                            className="rounded-md input-glass px-3 py-2 text-sm"
                            disabled={isReadOnly}
                          >
                            <option value="sq_ft">Sq ft</option>
                            <option value="sq_m">Sq m</option>
                            <option value="acre">Acre</option>
                            <option value="hectare">Hectare</option>
                          </select>
                          <input
                            value={item.count}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                plotDetails: {
                                  ...prev.plotDetails,
                                  plotInventories: prev.plotDetails.plotInventories.map((entry, idx) =>
                                    idx === index ? { ...entry, count: e.target.value } : entry
                                  )
                                }
                              }))
                            }
                            className="rounded-md input-glass px-3 py-2 text-sm"
                            placeholder="Count"
                            disabled={isReadOnly}
                          />
                          <input
                            value={item.label || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                plotDetails: {
                                  ...prev.plotDetails,
                                  plotInventories: prev.plotDetails.plotInventories.map((entry, idx) =>
                                    idx === index ? { ...entry, label: e.target.value } : entry
                                  )
                                }
                              }))
                            }
                            className="rounded-md input-glass px-3 py-2 text-sm"
                            placeholder="Label (optional)"
                            disabled={isReadOnly}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                plotDetails: {
                                  ...prev.plotDetails,
                                  plotInventories: prev.plotDetails.plotInventories.filter((_, idx) => idx !== index)
                                }
                              }))
                            }
                            className="rounded-md border border-theme px-3 py-2 text-xs text-secondary"
                            disabled={isReadOnly || form.plotDetails.plotInventories.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-theme bg-white/60 p-3 space-y-3">
                    <div className="text-xs font-semibold text-secondary">Approvals & legal</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2 text-xs text-secondary">
                        <input
                          type="checkbox"
                          checked={form.plotDetails.approvals.layoutApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              plotDetails: {
                                ...prev.plotDetails,
                                approvals: { ...prev.plotDetails.approvals, layoutApproved: e.target.checked }
                              }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        Layout approved
                      </label>
                      <label className="flex items-center gap-2 text-xs text-secondary">
                        <input
                          type="checkbox"
                          checked={form.plotDetails.approvals.naApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              plotDetails: {
                                ...prev.plotDetails,
                                approvals: { ...prev.plotDetails.approvals, naApproved: e.target.checked }
                              }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        NA approved
                      </label>
                      <label className="flex items-center gap-2 text-xs text-secondary">
                        <input
                          type="checkbox"
                          checked={form.plotDetails.approvals.tpApproved}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              plotDetails: {
                                ...prev.plotDetails,
                                approvals: { ...prev.plotDetails.approvals, tpApproved: e.target.checked }
                              }
                            }))
                          }
                          disabled={isReadOnly}
                        />
                        TP approved
                      </label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={form.plotDetails.layoutApproval.authority}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: {
                              ...prev.plotDetails,
                              layoutApproval: { ...prev.plotDetails.layoutApproval, authority: e.target.value }
                            }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Layout authority"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.layoutApproval.approvalNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: {
                              ...prev.plotDetails,
                              layoutApproval: { ...prev.plotDetails.layoutApproval, approvalNo: e.target.value }
                            }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Layout approval no"
                        disabled={isReadOnly}
                      />
                      <input
                        type="date"
                        value={form.plotDetails.layoutApproval.approvalDate}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: {
                              ...prev.plotDetails,
                              layoutApproval: { ...prev.plotDetails.layoutApproval, approvalDate: e.target.value }
                            }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.naOrder.orderNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, naOrder: { ...prev.plotDetails.naOrder, orderNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="NA order no"
                        disabled={isReadOnly}
                      />
                      <input
                        type="date"
                        value={form.plotDetails.naOrder.orderDate}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, naOrder: { ...prev.plotDetails.naOrder, orderDate: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.tpApproval.office}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, tpApproval: { ...prev.plotDetails.tpApproval, office: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="TP office"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.tpApproval.approvalNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, tpApproval: { ...prev.plotDetails.tpApproval, approvalNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="TP approval no"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-theme bg-white/60 p-3 space-y-3">
                    <div className="text-xs font-semibold text-secondary">Revenue (layout master)</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={form.plotDetails.revenue.mouza}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, mouza: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Mouza"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.taluka}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, taluka: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Taluka"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.district}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, district: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="District"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.state}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, state: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="State"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.surveyNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, surveyNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Survey no (optional)"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.gatNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, gatNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Gat no (optional)"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.hissaNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, hissaNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Hissa no"
                        disabled={isReadOnly}
                      />
                      <input
                        value={form.plotDetails.revenue.plotNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            plotDetails: { ...prev.plotDetails, revenue: { ...prev.plotDetails.revenue, plotNo: e.target.value } }
                          }))
                        }
                        className="rounded-md input-glass px-3 py-2 text-sm"
                        placeholder="Plot no / series"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-theme bg-white/60 p-3 space-y-3">
                  <div className="text-xs font-semibold text-secondary">Infrastructure</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={form.plotDetails.gatedCommunity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, gatedCommunity: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Gated community</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.internalRoadType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, internalRoadType: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Internal road type</option>
                      <option value="cc">CC</option>
                      <option value="asphalt">Asphalt</option>
                      <option value="wbm">WBM</option>
                      <option value="paver">Paver</option>
                    </select>
                    <input
                      value={form.plotDetails.infra.typicalRoadWidthFeet}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, typicalRoadWidthFeet: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Typical road width (ft)"
                      disabled={isReadOnly}
                    />
                    <input
                      value={form.plotDetails.infra.roadWidthM}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, roadWidthM: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Road width (m)"
                      disabled={isReadOnly}
                    />
                    <input
                      value={form.plotDetails.infra.roadType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, roadType: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Road type"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.plotDetails.infra.waterSource}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, waterSource: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Water source</option>
                      <option value="borewell">Borewell</option>
                      <option value="municipal">Municipal</option>
                      <option value="both">Both</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.sewageSystem}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, sewageSystem: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Sewage system</option>
                      <option value="septic">Septic</option>
                      <option value="underground_drainage">Underground drainage</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.waterAvailable}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, waterAvailable: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Water available</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.electricityAvailable}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, electricityAvailable: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Electricity available</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.drainageAvailable}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, drainageAvailable: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Drainage available</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.waterConnection}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, waterConnection: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Water connection</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.electricityConnection}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, electricityConnection: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Electricity connection</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.drainageConnection}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: {
                            ...prev.plotDetails,
                            infra: { ...prev.plotDetails.infra, drainageConnection: e.target.value }
                          }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Drainage connection</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.streetLights}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, streetLights: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Street lights</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.infra.boundaryWall}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, infra: { ...prev.plotDetails.infra, boundaryWall: e.target.value } }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Boundary wall</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-theme bg-white/60 p-3 space-y-3">
                  <div className="text-xs font-semibold text-secondary">Financing & possession</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={form.plotDetails.bankLoanApproved}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, bankLoanApproved: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Bank loan approved</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.bankLoanReady}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, bankLoanReady: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Bank loan ready</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.titleClear}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, titleClear: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Title clear</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <select
                      value={form.plotDetails.litigation}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, litigation: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Litigation</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <input
                      value={form.plotDetails.approvedBanks}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, approvedBanks: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Approved banks (comma separated)"
                      disabled={isReadOnly}
                    />
                    <select
                      value={form.plotDetails.possessionTimeline}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, possessionTimeline: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      disabled={isReadOnly}
                    >
                      <option value="">Possession timeline</option>
                      <option value="ready">Ready</option>
                      <option value="6_months">6 months</option>
                      <option value="12_months">12 months</option>
                      <option value="18_months">18 months</option>
                      <option value="2_years">2 years</option>
                      <option value="3_years">3 years</option>
                      <option value="custom">Custom</option>
                    </select>
                    <input
                      value={form.plotDetails.possessionTimelineNote}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          plotDetails: { ...prev.plotDetails, possessionTimelineNote: e.target.value }
                        }))
                      }
                      className="rounded-md input-glass px-3 py-2 text-sm"
                      placeholder="Custom possession note"
                      disabled={isReadOnly || form.plotDetails.possessionTimeline !== "custom"}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-secondary">City *</label>
                <input
                  value={form.location.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, city: e.target.value } }))
                  }
                  className={`mt-2 w-full rounded-md input-glass px-3 py-2 text-sm ${
                    fieldErrors.city ? "border-rose-500/60" : ""
                  }`}
                  placeholder="Chandrapur"
                  disabled={isReadOnly}
                />
                {fieldErrors.city && <div className="mt-1 text-[11px] text-rose-300">{fieldErrors.city}</div>}
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Area</label>
                <input
                  value={form.location.area}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, area: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Ramnagar"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Landmark</label>
                <input
                  value={form.location.landmark}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, landmark: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Near highway"
                  disabled={isReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-secondary">Address line</label>
                <input
                  value={form.location.addressLine}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, addressLine: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Near City Center, Chandrapur"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Pincode</label>
                <input
                  value={form.location.pincode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, pincode: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="442401"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">District</label>
                <input
                  value={form.location.district}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, district: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Chandrapur"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">State</label>
                <input
                  value={form.location.state}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, state: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Maharashtra"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Latitude</label>
                <input
                  value={form.location.lat}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, lat: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="19.95"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary">Longitude</label>
                <input
                  value={form.location.lng}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: { ...prev.location, lng: e.target.value } }))
                  }
                  className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="79.30"
                  disabled={isReadOnly}
                />
              </div>
              {(latError || lngError) && (
                <div className="md:col-span-2 text-xs text-rose-300">
                  {latError || lngError}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-theme bg-surface/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">Map pin (optional)</div>
                  <div className="text-xs text-secondary">Drop a pin to capture lat/lng and confirm.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs font-semibold"
                    onClick={() => setShowMapPicker(true)}
                    disabled={isReadOnly}
                  >
                    Pick on map
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs font-semibold"
                    onClick={handleUseMyLocation}
                    disabled={isReadOnly}
                  >
                    Use my location
                  </button>
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs font-semibold"
                    onClick={handleClearPin}
                    disabled={isReadOnly}
                  >
                    Clear pin
                  </button>
                </div>
              </div>
              {mapError ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {mapError}
                </div>
              ) : null}
              <div className="rounded-xl border border-theme bg-white/60 px-4 py-3 text-xs text-secondary">
                {mapValue ? `lat ${mapValue.lat.toFixed(6)}, lng ${mapValue.lng.toFixed(6)}` : "No pin set"}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-secondary">Min price (INR)</label>
              <input
                value={form.priceRange.min}
                onChange={(e) => setForm((prev) => ({ ...prev, priceRange: { ...prev.priceRange, min: e.target.value } }))}
                className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                placeholder="3500000"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Max price (INR)</label>
              <input
                value={form.priceRange.max}
                onChange={(e) => setForm((prev) => ({ ...prev, priceRange: { ...prev.priceRange, max: e.target.value } }))}
                className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
                placeholder="8500000"
                disabled={isReadOnly}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-secondary">Amenities</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.amenities.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-secondary">
                    {item}
                    <button type="button" onClick={() => removeChip(item, "amenities")} className="text-muted" disabled={isReadOnly}>
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Gym, Garden, Clubhouse"
                  disabled={isReadOnly}
                />
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    addChip(amenityInput, "amenities");
                    setAmenityInput("");
                  }}
                  disabled={isReadOnly}
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary">Highlights</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.highlights.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-secondary">
                    {item}
                    <button type="button" onClick={() => removeChip(item, "highlights")} className="text-muted" disabled={isReadOnly}>
                      x
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Near highway, Premium amenities"
                  disabled={isReadOnly}
                />
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    addChip(highlightInput, "highlights");
                    setHighlightInput("");
                  }}
                  disabled={isReadOnly}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            {!tenantId ? (
              <EmptyState title="Loading tenant..." />
            ) : (
              <div className={isReadOnly ? "pointer-events-none opacity-60" : ""}>
                <MediaManager
                  projectId={effectiveProjectId}
                  tenantId={tenantId}
                  media={{ hero: form.media.cover, gallery: form.media.gallery }}
                  onChange={(next) =>
                    setForm((prev) => ({
                      ...prev,
                      media: { ...prev.media, cover: next.hero || null, gallery: next.gallery || [] }
                    }))
                  }
                  allowVideo={true}
                  requireHeroImage={true}
                  onEnsureId={ensureDraft}
                />
              </div>
            )}
            <div className="rounded-2xl card-glass border border-theme p-4 text-sm text-secondary">
              <div className="font-semibold text-primary">Brochure (optional)</div>
              <p className="text-xs text-muted">Upload a PDF brochure for buyers and sales teams.</p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadBrochure(file);
                  }}
                  className="text-xs text-secondary"
                />
                {form.media.brochure && (
                  <span className="text-xs text-secondary">{form.media.brochure.fileName || "Brochure uploaded"}</span>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4 text-sm text-secondary">
            <div className="text-base font-semibold text-primary">Review</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-theme bg-surface p-4">
                <div className="text-xs text-muted">Project name</div>
                <div className="mt-1 text-sm font-semibold text-primary">{form.name || "Untitled"}</div>
              </div>
              <div className="rounded-xl border border-theme bg-surface p-4">
                <div className="text-xs text-muted">Type</div>
                <div className="mt-1 text-sm font-semibold text-primary">{form.type}</div>
              </div>
              <div className="rounded-xl border border-theme bg-surface p-4">
                <div className="text-xs text-muted">Lifecycle</div>
                <div className="mt-1 text-sm font-semibold text-primary">{statusLabel}</div>
              </div>
              <div className="rounded-xl border border-theme bg-surface p-4">
                <div className="text-xs text-muted">City</div>
                <div className="mt-1 text-sm font-semibold text-primary">{form.location.city || "Not set"}</div>
              </div>
              <div className="rounded-xl border border-theme bg-surface p-4 md:col-span-2">
                <div className="text-xs text-muted">Cover media</div>
                <div className="mt-1 text-sm font-semibold text-primary">{form.media.cover ? "Uploaded" : "Missing"}</div>
              </div>
            </div>
          </div>
        );
    }
  }, [form, stepIndex, tenantId, projectId, amenityInput, highlightInput, isReadOnly, effectiveProjectId, linkedListings]);

  if (!tenantId) return <div className="text-sm text-secondary">Loading tenant...</div>;

  return (
    <div className="space-y-5">
      <AdminWorkspaceHero
        eyebrow="Project Listing Workspace"
        title={isNew ? "New Project" : "Edit Project"}
        description="Create and manage a project listing with a premium admin workflow built for public-ready project truth."
        stats={[
          { label: "Category", value: form.category || "-" },
          { label: "Type", value: form.type || "-" },
          { label: "Blocking Issues", value: backendBlockingIssues.length, tone: backendBlockingIssues.length ? "warning" : "success" }
        ]}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl btn-secondary px-4 py-3 text-sm font-semibold"
            >
              Back
            </button>
            {!isNew && effectiveProjectId && documentLockerEntitlement.enabled ? (
              <Link
                to={`/documents?entityType=project&entityId=${encodeURIComponent(effectiveProjectId)}`}
                className="rounded-xl btn-secondary px-4 py-3 text-sm font-semibold"
              >
                Project Documents
              </Link>
            ) : null}
            <button
              className="rounded-xl btn-secondary px-4 py-3 text-sm font-semibold disabled:opacity-60"
              onClick={saveProject}
              disabled={saving || isReadOnly}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            {!isNew ? (
              <button
                className="rounded-xl btn-primary px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePublish}
                disabled={saving || !canAdmin || (projectStatus !== "published" && (!canPublish || backendBlockingIssues.length > 0))}
                title={
                  !canAdmin
                    ? "Admin only"
                    : projectStatus !== "published" && (!canPublish || backendBlockingIssues.length > 0)
                      ? backendBlockingIssues[0]?.message || "Complete required fields"
                      : undefined
                }
              >
                {projectStatus === "published" ? "Unpublish" : "Publish"}
              </button>
            ) : null}
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Workspace State</div>
            <div className="text-sm leading-6 text-slate-200">
              Use the review step to confirm publishing readiness before going live on public surfaces.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
              {projectStatus === "published"
                ? "This project is live. Admin access is required for updates."
                : `${publishChecklist.filter((item) => item.ok).length} of ${publishChecklist.length} publish checks are ready.`}
            </div>
          </div>
        }
      />

      {message && (
        <div className="rounded-md border border-theme bg-surface px-4 py-2 text-sm text-secondary">{message}</div>
      )}
      {error && <ErrorBanner message={error} />}
      {(checklistLoading || publishIssues.length > 0) && (
        <div className="rounded-[22px] card-glass border border-theme px-4 py-3 text-sm">
          <div className="font-semibold text-primary">Backend publish checklist</div>
          {checklistLoading ? (
            <div className="mt-1 text-xs text-secondary">Refreshing checklist...</div>
          ) : (
            <div className="mt-2 space-y-2">
              {publishIssues.map((issue) => (
                <div
                  key={`${issue.code}-${issue.field || "general"}`}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    issue.blocking
                      ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  <div className="font-semibold">{issue.code}</div>
                  <div>{issue.message}</div>
                  <div className="text-[11px] opacity-80">{formatChecklistField(issue.field)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {isReadOnly && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          This project is published. Admin access is required to make changes.
        </div>
      )}

      <AdminStepTabs
        activeIndex={stepIndex}
        onSelect={setStepIndex}
        steps={STEPS.map((label, idx) => ({
          label,
          detail:
            idx === STEPS.length - 1
              ? `${backendBlockingIssues.length} blocker(s)`
              : publishChecklist.some((item) => item.step === idx && !item.ok)
              ? "Needs work"
              : "Ready"
        }))}
      />

      <AdminSectionCard>
        {loading ? <div className="text-sm text-secondary">Loading...</div> : stepContent}
      </AdminSectionCard>
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleConfirmLocation}
        initialLat={mapValue?.lat ?? latNumber ?? null}
        initialLng={mapValue?.lng ?? lngNumber ?? null}
      />

      {stepIndex === 5 && (
        <AdminSectionCard title="Publish Readiness" className="space-y-2">
          <div className="space-y-2 text-sm text-secondary">
            {publishChecklist.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStepIndex(item.step)}
                className="flex items-center gap-2 text-left hover:text-primary"
              >
                <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                <span>{item.label}</span>
              </button>
            ))}
            {recommendedItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-muted">
                <span className={`h-2 w-2 rounded-full ${item.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span>{item.ok ? item.label : `${item.label} recommended`}</span>
              </div>
            ))}
            {publishIssues.map((issue) => (
              <button
                key={`${issue.code}-${issue.field || "issue"}`}
                type="button"
                onClick={() => setStepIndex(issue.field === "rera.number" ? 0 : 5)}
                className="flex items-start gap-2 text-left"
              >
                <span className={`mt-1 h-2 w-2 rounded-full ${issue.blocking ? "bg-rose-400" : "bg-amber-400"}`} />
                <span>
                  {issue.code}: {issue.message}
                </span>
              </button>
            ))}
          </div>
          <div className="pt-2">
            <button
              className="btn-primary px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handlePublish}
              disabled={!canAdmin || (projectStatus !== "published" && (!canPublish || backendBlockingIssues.length > 0)) || projectStatus === "published"}
              title={
                !canAdmin
                  ? "Admin only"
                  : projectStatus !== "published" && (!canPublish || backendBlockingIssues.length > 0)
                    ? backendBlockingIssues[0]?.message || "Complete required fields"
                    : undefined
              }
            >
              {projectStatus === "published" ? "Published" : "Publish project"}
            </button>
          </div>
        </AdminSectionCard>
      )}

      <div className="flex items-center justify-between">
        <button
          className="rounded-md border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          disabled={stepIndex === 0}
        >
          Back
        </button>
        <button
          className="rounded-md border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
          disabled={stepIndex === STEPS.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

