import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMyPrincipals,
  getOrgListing,
  patchOrgListing,
  transitionOrgListing
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import ErrorBanner from "../../components/ErrorBanner";
import { formatINR } from "../../utils/format";

const PROPERTY_TYPES = ["Flat", "House", "Plot", "Land", "Commercial"];
const LISTING_TYPES = ["sale", "rent"];

function normalizeDescription(input: any) {
  if (!input) return "";
  if (typeof input === "string") return input;
  const user = typeof input.user === "string" ? input.user : "";
  const ai = typeof input.ai === "string" ? input.ai : "";
  if (input.active === "ai") return ai || user;
  return user || ai;
}

export default function OrgListingDetailPage() {
  const { tenantId, role } = useAuth();
  const { orgListingId } = useParams();
  const [listing, setListing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    propertyType: "Land",
    listingType: "sale",
    city: "",
    area: "",
    totalPrice: "",
    description: ""
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [principalRole, setPrincipalRole] = useState<string | null>(null);
  const [mandateError, setMandateError] = useState(false);
  const [ownerFields, setOwnerFields] = useState({ ownerUid: "", ownerListingId: "" });
  const canAdmin = role === "tenant_admin" || role === "platform_admin";

  const canEdit = listing?.lifecycleState !== "published";

  const actionVisibility = useMemo(() => {
    const state = listing?.lifecycleState;
    const principalType = listing?.principalType;
    const actions: Record<string, boolean> = {
      submit: false,
      approve: false,
      publish: false,
      unpublish: false,
      archive: false
    };
    if (canAdmin) {
      if (state === "draft") actions.submit = true;
      if (state === "review") actions.approve = true;
      if (state === "approved" || state === "unpublished") actions.publish = true;
      if (state === "published") actions.unpublish = true;
      if (["draft", "review", "approved", "unpublished"].includes(state)) actions.archive = true;
      return actions;
    }
    if (principalType === "agency") {
      if (principalRole === "agency_agent") {
        if (state === "draft") actions.submit = true;
      }
      if (principalRole === "agency_admin" || principalRole === "agency_manager") {
        if (state === "draft") actions.submit = true;
        if (state === "review") actions.approve = true;
        if (state === "approved" || state === "unpublished") actions.publish = true;
        if (state === "published") actions.unpublish = true;
        if (["draft", "review", "approved", "unpublished"].includes(state)) actions.archive = true;
      }
    }
    if (principalType === "enterprise") {
      if (principalRole === "enterprise_compliance") {
        if (state === "review") actions.approve = true;
      }
      if (principalRole === "enterprise_admin" || principalRole === "enterprise_listing_manager") {
        if (state === "draft") actions.submit = true;
        if (state === "approved" || state === "unpublished") actions.publish = true;
        if (state === "published") actions.unpublish = true;
        if (["draft", "review", "approved", "unpublished"].includes(state)) actions.archive = true;
      }
    }
    if (principalType === "agent") {
      if (state === "draft") actions.submit = true;
      if (state === "approved" || state === "unpublished") actions.publish = true;
      if (state === "published") actions.unpublish = true;
      if (["draft", "review", "approved", "unpublished"].includes(state)) actions.archive = true;
    }
    return actions;
  }, [listing, principalRole, canAdmin]);

  const loadListing = async () => {
    if (!tenantId || !orgListingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrgListing(tenantId, orgListingId);
      setListing(data);
      setForm({
        title: data.title || "",
        propertyType: data.propertyType || "Land",
        listingType: data.listingType || "sale",
        city: data.location?.city || "",
        area: data.location?.area || "",
        totalPrice: data.pricing?.totalPrice?.toString() || "",
        description: normalizeDescription(data.description)
      });
      setOwnerFields({
        ownerUid: data.ownerUid || "",
        ownerListingId: data.ownerListingId || ""
      });
    } catch (err: any) {
      setError(err.message || "Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId || !orgListingId) return;
    loadListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, orgListingId]);

  useEffect(() => {
    let active = true;
    if (!tenantId || !listing) return () => {
      active = false;
    };
    if (canAdmin) {
      setPrincipalRole("tenant_admin");
      return () => {
        active = false;
      };
    }
    getMyPrincipals(tenantId)
      .then((data) => {
        const principal = data.principals?.find(
          (p) => p.type === listing.principalType && p.id === listing.principalId
        );
        if (active) setPrincipalRole(principal?.role || null);
      })
      .catch(() => {
        if (active) setPrincipalRole(null);
      });
    return () => {
      active = false;
    };
  }, [tenantId, listing, canAdmin]);

  return (
    <div className="space-y-3">
      <Link to="/org-listings" className="text-sm text-secondary hover:text-primary">
        ← Back to Org Listings
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-primary">{listing?.title || "Org Listing"}</h1>
        <p className="text-sm text-secondary">
          {listing?.principalType} • {listing?.principalId}
        </p>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : listing ? (
        <>
          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <StatusBadge tone={toneForStatus(listing.lifecycleState)}>{listing.lifecycleState}</StatusBadge>
              {listing.mandateId && (
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  mandate: {listing.mandateId}
                </span>
              )}
            </div>
            {!canEdit && (
              <div className="text-xs text-amber-200">
                Published listings must be unpublished before editing.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              />
              <select
                value={form.propertyType}
                onChange={(e) => setForm((prev) => ({ ...prev, propertyType: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              >
                {PROPERTY_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <select
                value={form.listingType}
                onChange={(e) => setForm((prev) => ({ ...prev, listingType: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              >
                {LISTING_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="City"
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              />
              <input
                value={form.area}
                onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                placeholder="Area"
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              />
              <input
                value={form.totalPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, totalPrice: e.target.value }))}
                placeholder="Total Price"
                className="rounded-md input-glass px-3 py-2 text-sm"
                disabled={!canEdit}
              />
              <div className="text-xs text-muted sm:col-span-2">
                {form.totalPrice ? `Formatted: ${formatINR(Number(form.totalPrice))}` : "Formatted: -"}
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                rows={3}
                disabled={!canEdit}
              />
            </div>
            <button
              disabled={!canEdit || saving}
              onClick={async () => {
                if (!tenantId || !orgListingId) return;
                setSaving(true);
                setError(null);
                try {
                  await patchOrgListing(tenantId, orgListingId, {
                    title: form.title.trim(),
                    propertyType: form.propertyType,
                    listingType: form.listingType,
                    location: {
                      city: form.city.trim(),
                      area: form.area.trim() || undefined
                    },
                    pricing: form.totalPrice ? { totalPrice: Number(form.totalPrice), currency: "INR" } : undefined,
                    description: form.description.trim() || undefined
                  });
                  await loadListing();
                } catch (err: any) {
                  setError(err.message || "Failed to save listing");
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              Save Changes
            </button>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note for transition (optional)"
                className="rounded-md input-glass px-3 py-2 text-sm flex-1"
              />
              {actionVisibility.submit && (
                <button
                  onClick={async () => {
                    if (!tenantId || !orgListingId) return;
                    try {
                      setMandateError(false);
                      await transitionOrgListing(tenantId, orgListingId, { action: "submit", note });
                      await loadListing();
                    } catch (err: any) {
                      setError(err.message || "Submit failed");
                    }
                  }}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Submit
                </button>
              )}
              {actionVisibility.approve && (
                <button
                  onClick={async () => {
                    if (!tenantId || !orgListingId) return;
                    try {
                      setMandateError(false);
                      await transitionOrgListing(tenantId, orgListingId, { action: "approve", note });
                      await loadListing();
                    } catch (err: any) {
                      setError(err.message || "Approve failed");
                    }
                  }}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Approve
                </button>
              )}
              {actionVisibility.publish && (
                <button
                  onClick={async () => {
                    if (!tenantId || !orgListingId) return;
                    try {
                      setMandateError(false);
                      await transitionOrgListing(tenantId, orgListingId, { action: "publish", note });
                      await loadListing();
                    } catch (err: any) {
                      if (err.code === "MANDATE_REQUIRED") {
                        setMandateError(true);
                      } else {
                        setError(err.message || "Publish failed");
                      }
                    }
                  }}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Publish
                </button>
              )}
              {actionVisibility.unpublish && (
                <button
                  onClick={async () => {
                    if (!tenantId || !orgListingId) return;
                    try {
                      setMandateError(false);
                      await transitionOrgListing(tenantId, orgListingId, { action: "unpublish", note });
                      await loadListing();
                    } catch (err: any) {
                      setError(err.message || "Unpublish failed");
                    }
                  }}
                  className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                >
                  Unpublish
                </button>
              )}
              {actionVisibility.archive && (
                <button
                  onClick={async () => {
                    if (!tenantId || !orgListingId) return;
                    try {
                      setMandateError(false);
                      await transitionOrgListing(tenantId, orgListingId, { action: "archive", note });
                      await loadListing();
                    } catch (err: any) {
                      setError(err.message || "Archive failed");
                    }
                  }}
                  className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-secondary"
                >
                  Archive
                </button>
              )}
            </div>
          </div>

          {mandateError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-3">
              <div>
                This listing references an owner property and needs an active mandate before publishing.
              </div>
              {listing.ownerUid && listing.ownerListingId ? (
                <div>Mandate not approved yet. Please approve a mandate for this owner listing.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={ownerFields.ownerUid}
                    onChange={(e) => setOwnerFields((prev) => ({ ...prev, ownerUid: e.target.value }))}
                    placeholder="Owner UID"
                    className="rounded-md border border-amber-500/30 px-3 py-2 text-sm"
                  />
                  <input
                    value={ownerFields.ownerListingId}
                    onChange={(e) => setOwnerFields((prev) => ({ ...prev, ownerListingId: e.target.value }))}
                    placeholder="Owner Listing ID"
                    className="rounded-md border border-amber-500/30 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {!listing.ownerUid || !listing.ownerListingId ? (
                  <button
                    onClick={async () => {
                      if (!tenantId || !orgListingId) return;
                      try {
                        await patchOrgListing(tenantId, orgListingId, {
                          ownerUid: ownerFields.ownerUid.trim(),
                          ownerListingId: ownerFields.ownerListingId.trim()
                        });
                        await loadListing();
                      } catch (err: any) {
                        setError(err.message || "Failed to set owner fields");
                      }
                    }}
                    className="rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    Save Owner Fields
                  </button>
                ) : null}
                <Link to="/mandates" className="rounded-md border border-amber-500/30 px-3 py-2 text-sm font-semibold">
                  Open Mandates
                </Link>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-secondary">Listing not found.</div>
      )}
    </div>
  );
}



