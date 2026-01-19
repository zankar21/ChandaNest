import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listListings, signGetMedia } from "../services/apiClient";
import { useAuth } from "../hooks/useAuth";

const PRICE_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

type ListingRow = any;

type NormalizedListing = {
  id: string;
  title: string;
  category: "residential" | "commercial" | "land";
  propertyType: string;
  subType?: string;
  type: "sale" | "rent";
  saleType?: string;
  locationLabel: string;
  totalPrice?: number;
  rentPerMonth?: number;
  visibility: string;
  status: "draft" | "pending" | "approved" | "rejected";
  updatedAt?: any;
  createdAt?: any;
  heroPath?: string;
  contactPhone?: string;
  hasGallery?: boolean;
  hasHero?: boolean;
};

function toMillis(value: any) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return 0;
}

function formatRelative(value: any) {
  const millis = toMillis(value);
  if (!millis) return "-";
  const diff = Date.now() - millis;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function inferCategory(propertyType?: string, category?: string) {
  if (category) return category as "residential" | "commercial" | "land";
  if (propertyType === "plot" || propertyType === "land") return "land";
  if (["shop", "office", "warehouse", "industrial_shed"].includes(propertyType || "")) return "commercial";
  return "residential";
}

function formatTypeLabel(propertyType: string, subType?: string) {
  if (propertyType === "flat" && subType === "studio") return "Studio Apartment";
  if (propertyType === "warehouse" && subType === "industrial_shed") return "Industrial Shed";
  switch (propertyType) {
    case "flat":
      return "Flat / Apartment";
    case "house":
      return "Independent House";
    case "villa":
      return "Villa / Bungalow";
    case "row_house":
      return "Row House";
    case "plot":
      return "Plot (Approved)";
    case "land":
      return "Land (Raw Land)";
    case "shop":
      return "Shop / Showroom";
    case "office":
      return "Office Space";
    case "warehouse":
      return "Godown / Warehouse";
    default:
      return propertyType || "Property";
  }
}

function formatSaleTypeLabel(value?: string) {
  if (!value) return "";
  return value === "resale" ? "Resale" : "New";
}

export default function DashboardPage() {
  const { refreshToken, tenantId } = useAuth();
  const [items, setItems] = useState<ListingRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated_desc");

  useEffect(() => {
    async function load() {
      try {
        if (!tenantId) throw new Error("Missing tenant");
        setLoading(true);
        setError(null);
        await refreshToken();
        const data = await listListings(tenantId);
        setItems(data.items || []);
        setLastRefreshedAt(Date.now());
      } catch (err: any) {
        setError(err.message || "Failed to load properties");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshToken, tenantId]);

  const normalized = useMemo<NormalizedListing[]>(() => {
    return (items || []).map((item) => {
      const listing = item.listing || item;
      const id = item.id || item.listingId || item.propertyId || listing.id || "";
      const location = listing.location || {};
      const locationLabel = [location.citySlug || location.city || listing.citySlug, location.locality || listing.locality]
        .filter(Boolean)
        .join(", ");
      const visibility = listing.visibility || item.visibility || "draft";
      const verification =
        item.moderation?.verificationStatus ||
        listing.moderation?.verificationStatus ||
        listing.verificationStatus ||
        listing.listingStatus ||
        "draft";
      const status: NormalizedListing["status"] =
        verification === "approved"
          ? "approved"
          : verification === "rejected"
            ? "rejected"
            : verification === "pending" || verification === "submitted"
              ? "pending"
              : "draft";
      const media = listing.media || {};
      const heroPath = media.hero?.objectPath;
      const gallery = media.gallery || [];
      return {
        id,
        title: listing.title || "Untitled listing",
        category: inferCategory(listing.propertyType, listing.category),
        propertyType: listing.propertyType || "flat",
        subType: listing.subType || listing.metadata?.subType,
        type: listing.type === "rent" ? "rent" : "sale",
        saleType: listing.saleType,
        locationLabel: locationLabel || "Location pending",
        totalPrice: listing.pricing?.totalPrice ?? listing.totalPrice,
        rentPerMonth: listing.pricing?.rentPerMonth ?? listing.rentPerMonth,
        visibility,
        status,
        updatedAt: listing.updatedAt || item.updatedAt,
        createdAt: listing.createdAt || item.createdAt,
        heroPath,
        contactPhone: listing.contact?.phone || listing.contactPhone,
        hasHero: Boolean(media.hero?.objectPath),
        hasGallery: Array.isArray(gallery) && gallery.length > 0
      };
    });
  }, [items]);

  useEffect(() => {
    async function hydrateThumbs() {
      const paths = normalized.map((item) => item.heroPath).filter(Boolean) as string[];
      if (!paths.length) return;
      try {
        const signed = await signGetMedia(Array.from(new Set(paths)));
        const map: Record<string, string> = {};
        Object.keys(signed || {}).forEach((key) => {
          map[key] = signed[key];
        });
        setThumbs(map);
      } catch {
        // ignore
      }
    }
    hydrateThumbs();
  }, [normalized]);

  const kpis = useMemo(() => {
    const total = normalized.length;
    const draft = normalized.filter((item) => item.status === "draft").length;
    const pending = normalized.filter((item) => item.status === "pending").length;
    const approved = normalized.filter((item) => item.status === "approved").length;
    const rejected = normalized.filter((item) => item.status === "rejected").length;
    const published = normalized.filter((item) => item.visibility === "published").length;
    return { total, draft, pending, approved, rejected, published };
  }, [normalized]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let data = normalized;
    if (statusFilter !== "all") data = data.filter((item) => item.status === statusFilter);
    if (visibilityFilter !== "all") data = data.filter((item) => item.visibility === visibilityFilter);
    if (categoryFilter !== "all") data = data.filter((item) => item.category === categoryFilter);
    if (query) {
      data = data.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.locationLabel.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      });
    }
    data = [...data].sort((a, b) => {
      if (sortBy === "created_desc") return toMillis(b.createdAt) - toMillis(a.createdAt);
      return toMillis(b.updatedAt) - toMillis(a.updatedAt);
    });
    return data;
  }, [normalized, search, statusFilter, visibilityFilter, categoryFilter, sortBy]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    visibilityFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "updated_desc";

  const applyKpi = (key: string) => {
    if (key === "total") {
      setStatusFilter("all");
      setVisibilityFilter("all");
      return;
    }
    if (key === "published") {
      setVisibilityFilter("published");
      setStatusFilter("all");
      return;
    }
    setStatusFilter(key);
  };

  return (
    <div className="bg-app min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="card-glass-strong border border-theme p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div>
                <h1 className="text-2xl font-semibold text-primary">Dashboard</h1>
                <p className="text-sm text-secondary">Track listings, approvals, and publishing at a glance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-secondary">
                  {tenantId ? `Tenant: ${tenantId}` : "Tenant"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/listings/new"
                  className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold"
                >
                  + New Listing
                </Link>
                <Link
                  to="/add?mode=project"
                  className="rounded-lg btn-secondary px-4 py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
                  title="Enterprise only"
                  aria-disabled
                  onClick={(e) => e.preventDefault()}
                >
                  New Project
                </Link>
              </div>
              <div className="text-xs text-muted">
                Last refreshed: {lastRefreshedAt ? formatRelative(lastRefreshedAt) : "just now"}
              </div>
            </div>
          </div>
        </div>

        <div className="card-glass border border-theme p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, locality, or ID"
              className="flex-1 min-w-[220px] rounded-lg input-glass px-3 py-2 text-sm"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg input-glass px-3 py-2 text-sm"
            >
              <option value="updated_desc">Updated (newest)</option>
              <option value="created_desc">Created (newest)</option>
            </select>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className="rounded-lg btn-secondary px-3 py-2 text-sm font-semibold"
            >
              Filters
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setVisibilityFilter("all");
                  setCategoryFilter("all");
                  setSortBy("updated_desc");
                }}
                className="rounded-lg btn-secondary px-3 py-2 text-sm font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
          {showFilters && (
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg input-glass px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="rounded-lg input-glass px-3 py-2 text-sm"
              >
                <option value="all">All visibility</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg input-glass px-3 py-2 text-sm"
              >
                <option value="all">All categories</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { key: "total", label: "Total", value: kpis.total },
            { key: "draft", label: "Draft", value: kpis.draft },
            { key: "pending", label: "Pending Review", value: kpis.pending },
            { key: "approved", label: "Approved", value: kpis.approved },
            { key: "rejected", label: "Rejected", value: kpis.rejected },
            { key: "published", label: "Published", value: kpis.published }
          ].map((card) => (
            <button
              key={card.key}
              onClick={() => applyKpi(card.key)}
              className="card-glass border border-theme p-4 text-left hover:border-strong"
              type="button"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-primary">{card.value}</div>
            </button>
          ))}
        </div>

        {error && <div className="text-sm text-rose-300">{error}</div>}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-60 card-glass border border-theme p-4">
                <div className="h-28 rounded-xl bg-surface/10 animate-pulse" />
                <div className="mt-4 h-4 w-3/4 rounded bg-surface/10 animate-pulse" />
                <div className="mt-2 h-3 w-1/2 rounded bg-surface/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-theme bg-surface p-8 text-center">
            <div className="text-lg font-semibold text-primary">No listings yet</div>
            <div className="mt-2 text-sm text-secondary">Create your first listing to get started.</div>
            <Link
              to="/listings/new"
              className="mt-4 inline-flex rounded-lg btn-primary px-4 py-2 text-sm font-semibold"
            >
              + New Listing
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-theme bg-surface p-8 text-center">
            <div className="text-lg font-semibold text-primary">No results found</div>
            <div className="mt-2 text-sm text-secondary">Try clearing filters or adjusting search.</div>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setVisibilityFilter("all");
                setCategoryFilter("all");
              }}
              className="mt-4 inline-flex rounded-lg btn-secondary px-4 py-2 text-sm font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const healthMissing = [
                !item.title?.trim() ? "title" : null,
                item.locationLabel === "Location pending" ? "location" : null,
                !item.contactPhone ? "contact" : null,
                !item.hasHero ? "hero" : null,
                !item.hasGallery ? "gallery" : null
              ].filter(Boolean).length;
              const healthLabel = healthMissing > 0 ? `Missing ${healthMissing}` : "Ready";
              const healthTone = healthMissing > 0 ? "bg-amber-400/20 text-amber-200" : "bg-emerald-400/20 text-emerald-200";
              const statusTone =
                item.status === "approved"
                  ? "bg-emerald-400/20 text-emerald-200"
                  : item.status === "rejected"
                    ? "bg-rose-400/20 text-rose-200"
                    : item.status === "pending"
                      ? "bg-amber-400/20 text-amber-200"
                      : "bg-surface/10 text-secondary";
              const visibilityTone =
                item.visibility === "published"
                  ? "bg-indigo-400/20 text-indigo-200"
                  : "bg-surface/10 text-secondary";
              const thumbUrl = item.heroPath ? thumbs[item.heroPath] : null;
              const priceLabel =
                item.type === "rent"
                  ? item.rentPerMonth
                    ? `${PRICE_FORMAT.format(item.rentPerMonth)} / mo`
                    : "Price on request"
                  : item.totalPrice
                    ? PRICE_FORMAT.format(item.totalPrice)
                    : "Price on request";

              return (
                <div key={item.id} className="rounded-2xl card-glass border border-theme bg-surface shadow-sm overflow-hidden">
                  <div className="relative h-36 bg-surface/10">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-base font-semibold text-primary line-clamp-1">{item.title}</div>
                    <div className="text-xs text-muted">
                      {formatTypeLabel(item.propertyType, item.subType)} -
                      {item.type === "rent" ? " Rent / Lease" : ` ${formatSaleTypeLabel(item.saleType || "new")}`}
                    </div>
                    <div className="text-xs text-muted line-clamp-1">{item.locationLabel}</div>
                    <div className="text-sm font-semibold text-primary">{priceLabel}</div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className={`rounded-full px-2.5 py-1 ${statusTone}`}>{item.status}</span>
                      <span className={`rounded-full px-2.5 py-1 ${visibilityTone}`}>{item.visibility}</span>
                      <span className={`rounded-full px-2.5 py-1 ${healthTone}`}>{healthLabel}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted pt-2">
                      <span>Updated {formatRelative(item.updatedAt || item.createdAt)}</span>
                      {item.visibility === "published" && (
                        <span className="text-indigo-200">Public link</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link
                        to={`/listings/${item.id}/edit`}
                        className="rounded-md btn-secondary px-3 py-1.5 text-xs font-semibold"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/submit/${item.id}`}
                        className="rounded-md btn-secondary px-3 py-1.5 text-xs font-semibold"
                      >
                        Submit
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}



