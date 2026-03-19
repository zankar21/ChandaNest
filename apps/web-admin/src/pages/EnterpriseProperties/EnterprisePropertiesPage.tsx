import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingReviewDrawer from "../../components/listings/ListingReviewDrawer";
import {
  badgeClass,
  formatDealIntentLabel,
  getExpiryInfo,
  getPublishState,
  getWorkflowLabel,
  resolveListingPrice,
  roleLabel
} from "../../components/listings/listingWorkflow";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { useDocumentLockerEntitlement } from "../../hooks/useDocumentLockerEntitlement";
import {
  createListing,
  listings,
  publishListing,
  unpublishListing,
  updateListing
} from "../../services/apiClient";

function formatINR(value?: number | null) {
  if (typeof value !== "number") return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: any) {
  if (!value) return "-";
  const date = value?.seconds
    ? new Date(value.seconds * 1000)
    : value?._seconds
      ? new Date(value._seconds * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function buildDuplicatePayload(item: any) {
  return {
    mode: item.mode,
    dealIntent: item.dealIntent,
    category: item.category,
    categoryType: item.categoryType,
    propertyType: item.propertyType,
    title: item.title ? `Copy of ${item.title}` : "Copy of Listing",
    description: item.description,
    brokeragePartnerId: item.brokeragePartnerId,
    saleDetails: item.saleDetails,
    rentalDetails: item.rentalDetails,
    amenities: item.amenities,
    location: item.location,
    specs: item.specs,
    plotInfo: item.plotInfo,
    landRecord: item.landRecord,
    area: item.area,
    contact: item.contact,
    mediaItems: item.mediaItems,
    coverMediaId: item.coverMediaId,
    documents: item.documents,
    projectId: item.projectId,
    unitType: item.unitType,
    unit: item.unit,
    availability: item.availability,
    enterpriseId: item.enterpriseId,
    publishState: "draft",
    recordStatus: "active",
    assignedToUid: item.assignedToUid,
    leadPriority: item.leadPriority,
    tags: item.tags,
    source: item.source
  };
}

function getPropertyMeta(item: any) {
  const parts = [
    item?.categoryType || item?.category,
    item?.propertyType,
    item?.location?.locality,
    item?.location?.city || item?.location?.citySlug
  ].filter(Boolean);
  return parts.join(" • ") || "-";
}

function getPropertySubtitle(item: any) {
  const parts = [
    item?.location?.landmark,
    item?.location?.area,
    item?.location?.state
  ].filter(Boolean);
  return parts.join(", ") || null;
}

function StatCard({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "premium";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "warning"
      ? "border-amber-300 bg-amber-50"
      : tone === "danger"
      ? "border-rose-300 bg-rose-50"
      : tone === "premium"
      ? "border-sky-300 bg-sky-50"
      : "border-slate-200 bg-slate-50/80";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-600">{helper}</div> : null}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border border-amber-300 bg-amber-50 text-amber-700"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function SurfaceCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[26px] border border-theme bg-surface p-5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

type BulkAction = "" | "publish" | "unpublish" | "archive";

export default function EnterprisePropertiesPage() {
  const { tenantId, refreshToken } = useAuth();
  const { entitlement: documentLockerEntitlement } = useDocumentLockerEntitlement();
  const toast = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [searchText, setSearchText] = useState("");
  const [publishState, setPublishState] = useState("");
  const [recordStatus, setRecordStatus] = useState("");
  const [dealIntent, setDealIntent] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [preset, setPreset] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(searchText.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      await refreshToken();

      const data = await listings.list(tenantId, {
        q: q || undefined,
        publishState: publishState || undefined,
        recordStatus: recordStatus || undefined
      });

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setError(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [tenantId, refreshToken, q, publishState, recordStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    return (items || []).filter((item) => {
      if (dealIntent && item.dealIntent !== dealIntent) return false;
      if (propertyType && item.propertyType !== propertyType) return false;

      const expiry = getExpiryInfo(item?.expiresAt);
      const workflow = getWorkflowLabel(item);

      if (preset === "draft" && workflow !== "Draft") return false;
      if (preset === "published" && workflow !== "Published") return false;
      if (preset === "unpublished" && workflow !== "Unpublished") return false;
      if (preset === "expiring" && !(expiry && !expiry.expired && expiry.soon)) return false;
      if (preset === "expired" && !expiry?.expired) return false;

      return true;
    });
  }, [items, preset, propertyType, dealIntent]);

  const stats = useMemo(() => {
    let total = filteredItems.length;
    let draft = 0;
    let review = 0;
    let published = 0;
    let expiring = 0;
    let expired = 0;

    for (const item of filteredItems) {
      const workflow = getWorkflowLabel(item);
      const expiry = getExpiryInfo(item?.expiresAt);

      if (workflow === "Draft") draft += 1;
      if (workflow === "Published") published += 1;
      if (expiry?.soon && !expiry?.expired) expiring += 1;
      if (expiry?.expired) expired += 1;
    }

    return { total, draft, review, published, expiring, expired };
  }, [filteredItems]);

  const activeFilterCount = useMemo(() => {
    return [q, publishState, recordStatus, dealIntent, propertyType, preset].filter(Boolean).length;
  }, [q, publishState, recordStatus, dealIntent, propertyType, preset]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredItems.some((item) => item.id === id)));
  }, [filteredItems]);

  useEffect(() => {
    const onClick = () => setOpenMenuId(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((value) => value !== id);
    });
  };

  const clearFilters = () => {
    setSearchText("");
    setQ("");
    setPublishState("");
    setRecordStatus("");
    setDealIntent("");
    setPropertyType("");
    setPreset("");
  };

  const togglePublish = async (item: any) => {
    if (!tenantId) return;

    setRowBusyId(item.id);
    setOpenMenuId(null);

    try {
      await refreshToken();

      const state = getPublishState(item);
      if (state === "published") {
        await unpublishListing(tenantId, item.id);
        toast.push({ tone: "success", title: "Listing unpublished" });
      } else {
        await publishListing(tenantId, item.id);
        toast.push({ tone: "success", title: "Listing published" });
      }

      await load();
    } catch (err: any) {
      toast.push({
        tone: "error",
        title: "Publish update failed",
        message: err.message || "Please retry."
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const archive = async (item: any) => {
    if (!tenantId) return;

    setRowBusyId(item.id);
    setOpenMenuId(null);

    try {
      await refreshToken();
      await updateListing(tenantId, item.id, { recordStatus: "inactive" });
      toast.push({ tone: "success", title: "Listing archived" });
      await load();
    } catch (err: any) {
      toast.push({
        tone: "error",
        title: "Archive failed",
        message: err.message || "Please retry."
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const duplicate = async (item: any) => {
    if (!tenantId) return;

    setRowBusyId(item.id);
    setOpenMenuId(null);

    try {
      await refreshToken();
      const result = await createListing(tenantId, buildDuplicatePayload(item));
      toast.push({ tone: "success", title: "Listing duplicated" });
      navigate(`/enterprise-properties/${result.listingId}/edit`);
    } catch (err: any) {
      toast.push({
        tone: "error",
        title: "Duplicate failed",
        message: err.message || "Please retry."
      });
    } finally {
      setRowBusyId(null);
    }
  };

  const runBulkAction = async () => {
    if (!tenantId || !bulkAction || selectedIds.length === 0) return;

    setBulkBusy(true);
    let success = 0;
    let failed = 0;

    try {
      await refreshToken();

      for (const id of selectedIds) {
        try {
          if (bulkAction === "publish") await publishListing(tenantId, id);
          if (bulkAction === "unpublish") await unpublishListing(tenantId, id);
          if (bulkAction === "archive") await updateListing(tenantId, id, { recordStatus: "inactive" });
          success += 1;
        } catch {
          failed += 1;
        }
      }

      await load();
      setSelectedIds([]);
      setBulkAction("");

      toast.push({
        tone: failed > 0 ? "warning" : "success",
        title: "Bulk action completed",
        message: `${success} succeeded${failed ? `, ${failed} failed` : ""}.`
      });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-theme bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(25,35,58,0.92))] px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.14)] md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              Enterprise Property Workspace
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">
                Enterprise Properties
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-8 text-slate-200">
                Review, publish, archive, and manage direct listings from one premium control desk.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Visible now</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">Published</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.published}</div>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">Action needed</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.expiring + stats.expired + stats.review}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <button
              type="button"
              onClick={() => navigate("/enterprise-properties/new")}
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              + New Property
            </button>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {activeFilterCount > 0
                ? `${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"} applied`
                : "No active filters applied"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Listings" value={stats.total} helper="Current result set" />
        <StatCard label="Draft" value={stats.draft} helper="Not yet submitted" />
        <StatCard label="Under Review" value={stats.review} helper="Needs workflow action" tone="warning" />
        <StatCard label="Published" value={stats.published} helper="Live on marketplace" tone="success" />
        <StatCard label="Expiring Soon" value={stats.expiring} helper="Requires timely renewal" tone="premium" />
        <StatCard label="Expired" value={stats.expired} helper="No longer active" tone="danger" />
      </div>

      <SurfaceCard className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filters & Search</div>
            <div className="mt-2 text-xl font-semibold text-slate-900">Find the right property quickly</div>
            <div className="mt-1 text-sm text-slate-600">
              Search by title or location and narrow by workflow, publish state, deal type, and property type.
            </div>
          </div>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300"
            placeholder="Search title, locality, city"
          />

          <select
            value={publishState}
            onChange={(e) => setPublishState(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none"
          >
            <option value="">All publish states</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>

          <select
            value={recordStatus}
            onChange={(e) => setRecordStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none"
          >
            <option value="">All record status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={dealIntent}
            onChange={(e) => setDealIntent(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none"
          >
            <option value="">All deal intents</option>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
            <option value="lease">Lease</option>
            <option value="joint_venture">Joint Venture</option>
          </select>

          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none"
          >
            <option value="">All property types</option>
            <option value="flat">Flat</option>
            <option value="house">House</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="land">Land</option>
            <option value="shop">Shop</option>
            <option value="office">Office</option>
            <option value="warehouse">Warehouse</option>
            <option value="showroom">Showroom</option>
            <option value="pg">PG</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["draft", "Draft"],
            ["published", "Published"],
            ["unpublished", "Unpublished"],
            ["expiring", "Expiring Soon"],
            ["expired", "Expired"]
          ].map(([value, label]) => (
            <FilterChip
              key={value}
              active={preset === value}
              label={label}
              onClick={() => setPreset((prev) => (prev === value ? "" : value))}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredItems.length}</span> result
            {filteredItems.length === 1 ? "" : "s"}
          </div>
          <div className="text-sm text-slate-600">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : "No rows selected"}
          </div>
        </div>
      </SurfaceCard>

      {selectedIds.length > 0 ? (
        <div className="sticky top-3 z-20 rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-slate-900">{selectedIds.length} selected</div>

            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as BulkAction)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800 outline-none"
            >
              <option value="">Bulk actions</option>
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="archive">Archive</option>
            </select>

            <button
              type="button"
              onClick={() => void runBulkAction()}
              disabled={!bulkAction || bulkBusy}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {bulkBusy ? "Applying..." : "Apply"}
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <SurfaceCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => setSelectedIds(e.target.checked ? filteredItems.map((item) => item.id) : [])}
                  />
                </th>
                <th className="px-4 py-4">Property</th>
                <th className="px-4 py-4">Deal</th>
                <th className="px-4 py-4">Workflow</th>
                <th className="px-4 py-4">Publish</th>
                <th className="px-4 py-4">Expiry</th>
                <th className="px-4 py-4">Owner/Agent</th>
                <th className="px-4 py-4">Created</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Loading listings...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-md space-y-3">
                      <div className="text-base font-semibold text-slate-900">No listings found</div>
                      <div className="text-sm text-slate-600">
                        Try adjusting filters or create a new property to get started.
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate("/enterprise-properties/new")}
                          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
                        >
                          Create Property
                        </button>
                        {activeFilterCount > 0 ? (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            Clear Filters
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const workflowLabel = getWorkflowLabel(item);
                  const expiry = getExpiryInfo(item?.expiresAt);
                  const busy = rowBusyId === item.id;
                  const isMenuOpen = openMenuId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-slate-200 transition hover:bg-slate-50/60 ${
                        expiry?.expired ? "bg-rose-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => toggleSelection(item.id, e.target.checked)}
                        />
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold uppercase text-slate-500">
                            {String(item?.propertyType || item?.categoryType || "P").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <button type="button" onClick={() => setDrawerId(item.id)} className="text-left">
                              <div className="truncate text-base font-semibold text-slate-900">
                                {item.title || "Untitled"}
                              </div>
                            </button>
                            <div className="mt-1 text-xs text-slate-600">{getPropertyMeta(item)}</div>
                            {getPropertySubtitle(item) ? (
                              <div className="mt-1 truncate text-xs text-slate-500">{getPropertySubtitle(item)}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-xs font-medium text-slate-700">
                        {formatDealIntentLabel(item.dealIntent)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(workflowLabel)}`}>
                          {workflowLabel}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          {getPublishState(item)}
                        </span>
                      </td>

                      <td className="px-4 py-4 align-top text-xs text-slate-600">{expiry?.label || "-"}</td>
                      <td className="px-4 py-4 align-top text-xs text-slate-600">{roleLabel(item)}</td>
                      <td className="px-4 py-4 align-top text-xs text-slate-600">{formatDate(item.createdAt)}</td>

                      <td className="px-4 py-4 align-top">
                        <div className="text-sm font-semibold text-slate-900">{formatINR(resolveListingPrice(item))}</div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawerId(item.id)}
                            disabled={busy}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                          >
                            Review
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/enterprise-properties/${item.id}/edit`)}
                            disabled={busy}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                          >
                            Edit
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                              }}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                            >
                              {busy ? "Working..." : "More"}
                            </button>

                            {isMenuOpen ? (
                              <div
                                className="absolute right-0 top-11 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {documentLockerEntitlement.enabled ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(`/documents?entityType=property&entityId=${encodeURIComponent(item.id)}`)
                                    }
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Documents
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => void duplicate(item)}
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Duplicate
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void togglePublish(item)}
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  {getPublishState(item) === "published" ? "Unpublish" : "Publish"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void archive(item)}
                                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                >
                                  Archive
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <ListingReviewDrawer
        open={Boolean(drawerId)}
        listingId={drawerId}
        onClose={() => setDrawerId(null)}
        onChanged={load}
      />
    </div>
  );
}