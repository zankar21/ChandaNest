import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { listMyListings, submitOwnerListing, unpublishOwnerListing, deleteOwnerListing } from "../../services/apiClient";
import { OWNER_TENANT_ID } from "../../constants/marketplace";
import { useOwnerAuth } from "../../hooks/useOwnerAuth";
import { hydrateOwnerSignedUrls } from "../../services/signedMedia";
import { getHeroObjectPath } from "../../utils/media";

export default function OwnerMyListingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useOwnerAuth();
  const navigate = useNavigate();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "unpublish" | "delete"; item: any } | null>(null);
  const location = useLocation();
  const justPublishedId = (location.state as any)?.justPublishedId as string | undefined;
  const [showJustPublished, setShowJustPublished] = useState(Boolean(justPublishedId));

  const formatPrice = (amount?: number, currency?: string) => {
    if (amount === null || amount === undefined) return "Price on request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyListings(OWNER_TENANT_ID);
      setItems(data.items || []);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError("Session expired or access denied. Please login again.");
      } else {
        setError(err.message || "Failed to load listings");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    async function signMedia() {
      if (items.length === 0) return;
      const heroPaths = Array.from(
        new Set(items.map((item) => getHeroObjectPath(item)).filter((p): p is string => Boolean(p)))
      );
      if (heroPaths.length === 0) return;
      const hydrated = await hydrateOwnerSignedUrls(heroPaths.map((objectPath) => ({ objectPath })));
      setMediaUrls((prev) => {
        const next = { ...prev };
        hydrated.forEach((item) => {
          next[item.objectPath] = item.signedUrl;
        });
        return next;
      });
    }
    signMedia();
  }, [items]);

  const handleUnpublish = async (item: any) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await unpublishOwnerListing(OWNER_TENANT_ID, item.id);
      setActionMessage("Listing unpublished.");
      await loadListings();
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setActionError("Session expired or access denied. Please login again.");
      } else {
        setActionError(err.message || "Failed to unpublish");
      }
    }
  };

  const handleDelete = async (item: any) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await deleteOwnerListing(OWNER_TENANT_ID, item.id);
      setActionMessage("Listing deleted.");
      await loadListings();
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setActionError("Session expired or access denied. Please login again.");
      } else if (err.status === 409) {
        setActionError("Unpublish before deleting.");
      } else {
        setActionError(err.message || "Failed to delete");
      }
    }
  };

  const handleSubmit = async (item: any) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await submitOwnerListing(OWNER_TENANT_ID, item.id);
      navigate(`/owner/my-listings/${item.id}/preview`);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setActionError("Session expired or access denied. Please login again.");
      } else {
        setActionError(err.message || "Submit failed");
      }
    }
  };

  useEffect(() => {
    if (!justPublishedId || loading) return;
    const el = document.getElementById(`listing-${justPublishedId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [justPublishedId, loading, items.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">My Listings</h1>
          <p className="text-sm text-secondary">Manage your independent listings.</p>
        </div>
        <Link
          to="/owner/post-property"
          className="rounded-md btn-primary px-4 py-2 text-sm font-semibold shadow-sm"
        >
          Post Property
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200 space-y-2">
          <div>{error}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="rounded-md btn-secondary px-3 py-1 text-xs font-semibold"
            >
              Logout
            </button>
            <Link to="/owner/login" className="text-xs font-semibold text-secondary">
              Go to login
            </Link>
          </div>
        </div>
      )}
      {showJustPublished && justPublishedId && (
        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          Listing published successfully.
        </div>
      )}
      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-theme bg-surface p-6 text-sm text-secondary">
          No listings yet. Post your first property.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              id={`listing-${item.id}`}
              className="rounded-2xl card-glass border border-theme bg-surface shadow-sm overflow-hidden"
            >
              {(() => {
                const heroPath = getHeroObjectPath(item);
                const heroUrl = heroPath ? mediaUrls[heroPath] : undefined;
                const statusLabel = item.visibility === "published"
                  ? "Published"
                  : item.listingStatus === "submitted"
                  ? "Submitted"
                  : "Draft";
                const isPublished = item.visibility === "published";
                const dealLabel = item.type === "rent" ? "For Rent" : "For Sale";
                const statusClass = isPublished
                  ? "bg-emerald-500 text-white"
                  : item.listingStatus === "submitted"
                  ? "bg-amber-500 text-white"
                  : "bg-surface-strong text-primary";
                const areaValue = item.area?.value ? `${item.area.value} ${item.area?.unit || ""}`.trim() : null;
                const bhkValue = item.specs?.flat?.bhk ?? item.specs?.house?.bhk ?? null;
                const facingValue = item.plotInfo?.facing || item.specs?.land?.facing || null;
                const facingOrBhk = bhkValue ? `${bhkValue} BHK` : facingValue ? String(facingValue) : null;
                const priceValue =
                  item.type === "rent"
                    ? formatPrice(item.pricing?.rentPerMonth, item.pricing?.currency)
                    : formatPrice(item.pricing?.totalPrice, item.pricing?.currency);
                return (
                  <>
                    <div className="relative h-40 bg-surface">
                      {heroUrl && (
                        <img src={heroUrl} alt={item.title || "Listing"} className="h-full w-full object-cover" />
                      )}
                      <div className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${statusClass}`}>
                        {statusLabel}
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-[11px] font-semibold text-secondary shadow-sm">
                        {dealLabel}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-primary truncate">
                          {item.title || "Untitled listing"}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {[item.location?.locality, item.location?.citySlug].filter(Boolean).join(", ") || "Location pending"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.propertyType && (
                          <span className="rounded-full border border-theme bg-surface px-3 py-1 text-[11px] font-semibold text-secondary">
                            {item.propertyType}
                          </span>
                        )}
                        {areaValue && (
                          <span className="rounded-full border border-theme bg-surface px-3 py-1 text-[11px] font-semibold text-secondary">
                            {areaValue}
                          </span>
                        )}
                        {facingOrBhk && (
                          <span className="rounded-full border border-theme bg-surface px-3 py-1 text-[11px] font-semibold text-secondary">
                            {facingOrBhk}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-primary">{priceValue}</div>
                      <div className="flex flex-wrap gap-2">
                        {isPublished ? (
                          <>
                            <button
                              onClick={() => setConfirmAction({ type: "unpublish", item })}
                              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                            >
                              Unpublish
                            </button>
                            <Link
                              to={`/p/${item.id}`}
                              className="rounded-full border border-theme px-4 py-2 text-xs font-semibold text-secondary"
                            >
                              View
                            </Link>
                            <button
                              className="rounded-full border border-theme px-4 py-2 text-xs font-semibold text-muted cursor-not-allowed"
                              title="Unpublish to edit this listing."
                              disabled
                            >
                              Edit
                            </button>
                          </>
                        ) : item.listingStatus === "submitted" ? (
                          <>
                            <Link
                              to={`/owner/my-listings/${item.id}/preview`}
                              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                            >
                              Preview
                            </Link>
                            <Link
                              to={`/owner/my-listings/${item.id}/edit`}
                              className="rounded-full border border-theme px-4 py-2 text-xs font-semibold text-secondary"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => setConfirmAction({ type: "delete", item })}
                              className="rounded-full border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-200"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to={`/owner/my-listings/${item.id}/edit`}
                              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => setConfirmAction({ type: "delete", item })}
                              className="rounded-full border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-200"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 space-y-3 shadow-lg">
            {confirmAction.type === "unpublish" ? (
              <>
                <div className="text-lg font-semibold text-primary">Hide this listing from buyers?</div>
                <div className="text-sm text-secondary">
                  Unpublishing will remove it from public search. You can re-publish after review.
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-primary">Delete permanently?</div>
                <div className="text-sm text-secondary">This cannot be undone.</div>
              </>
            )}
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  const item = confirmAction.item;
                  const type = confirmAction.type;
                  setConfirmAction(null);
                  if (type === "unpublish") {
                    await handleUnpublish(item);
                  } else {
                    await handleDelete(item);
                  }
                }}
              >
                {confirmAction.type === "unpublish" ? "Unpublish" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





