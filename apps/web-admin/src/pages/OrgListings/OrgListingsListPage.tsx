import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrgListing, getMyPrincipals, listOrgListings } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";

const PROPERTY_TYPES = ["Flat", "House", "Plot", "Land", "Commercial"];
const LISTING_TYPES = ["sale", "rent"];
const STATES = ["all", "draft", "review", "approved", "published", "unpublished", "archived"];

export default function OrgListingsListPage() {
  const { tenantId } = useAuth();
  const [principals, setPrincipals] = useState<any[]>([]);
  const [selectedPrincipalId, setSelectedPrincipalId] = useState<string>("");
  const [selectedPrincipalType, setSelectedPrincipalType] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [items, setItems] = useState<any[]>([]);
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
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const emptyState = useMemo(() => (!loading && items.length === 0 ? "No org listings yet." : null), [loading, items]);

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setError(null);
      setItems([]);
      return () => {
        active = false;
      };
    }
    getMyPrincipals(tenantId)
      .then((data) => {
        const orgPrincipals = (data.principals || []).filter(
          (p: any) => p.type === "agent" || p.type === "agency" || p.type === "enterprise"
        );
        if (active) {
          setPrincipals(orgPrincipals);
          const stored = localStorage.getItem("orgListings.selectedPrincipal");
          if (stored && !selectedPrincipalId) {
            const [type, id] = stored.split(":");
            const exists = orgPrincipals.find((p: any) => p.type === type && p.id === id);
            if (exists) {
              setSelectedPrincipalType(type);
              setSelectedPrincipalId(id);
              return;
            }
          }
          if (!selectedPrincipalId && orgPrincipals[0]) {
            setSelectedPrincipalId(orgPrincipals[0].id);
            setSelectedPrincipalType(orgPrincipals[0].type);
          }
        }
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load principals");
      });
    return () => {
      active = false;
    };
  }, [tenantId, selectedPrincipalId]);

  useEffect(() => {
    let active = true;
    if (!tenantId || !selectedPrincipalId || !selectedPrincipalType) return () => {
      active = false;
    };
    localStorage.setItem("orgListings.selectedPrincipal", `${selectedPrincipalType}:${selectedPrincipalId}`);
    setLoading(true);
    setError(null);
    const params: any = {
      principalType: selectedPrincipalType,
      principalId: selectedPrincipalId
    };
    if (stateFilter !== "all") params.lifecycleState = stateFilter;
    listOrgListings(tenantId, params)
      .then((data) => {
        if (active) setItems(data.items || []);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load listings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, selectedPrincipalId, selectedPrincipalType, stateFilter]);

  const submitCreate = async () => {
    if (!tenantId || !selectedPrincipalId || !selectedPrincipalType) return;
    if (!form.title.trim() || !form.city.trim()) {
      setError("Title and city are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        principalType: selectedPrincipalType,
        principalId: selectedPrincipalId,
        title: form.title.trim(),
        propertyType: form.propertyType,
        listingType: form.listingType,
        location: {
          city: form.city.trim(),
          area: form.area.trim() || undefined
        },
        pricing: form.totalPrice ? { totalPrice: Number(form.totalPrice), currency: "INR" } : undefined,
        description: form.description.trim() || undefined
      };
      const created = await createOrgListing(tenantId, payload);
      setForm({
        title: "",
        propertyType: "Land",
        listingType: "sale",
        city: "",
        area: "",
        totalPrice: "",
        description: ""
      });
      if (created?.id) navigate(`/org-listings/${created.id}`);
      const data = await listOrgListings(tenantId, {
        principalType: selectedPrincipalType,
        principalId: selectedPrincipalId,
        lifecycleState: stateFilter !== "all" ? stateFilter : undefined
      });
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to create listing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Org Listings</h1>
          <p className="text-sm text-secondary">Create and manage org listings by principal.</p>
        </div>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : principals.length === 0 ? (
        <div className="text-sm text-secondary">
          No org principal available. Join an agency/enterprise or use agent principal.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 rounded-xl card-glass border border-theme bg-surface p-3 shadow-sm">
            <select
              value={`${selectedPrincipalType}:${selectedPrincipalId}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(":");
                setSelectedPrincipalType(type);
                setSelectedPrincipalId(id);
              }}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              {principals.map((p) => (
                <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                  {p.label} ({p.type})
                </option>
              ))}
            </select>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state === "all" ? "All states" : state}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Listing title"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <select
                value={form.propertyType}
                onChange={(e) => setForm((prev) => ({ ...prev, propertyType: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
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
              />
              <input
                value={form.area}
                onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                placeholder="Area"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <input
                value={form.totalPrice}
                onChange={(e) => setForm((prev) => ({ ...prev, totalPrice: e.target.value }))}
                placeholder="Total Price"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                rows={3}
              />
            </div>
            <button
              onClick={submitCreate}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Listing"}
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No org listings yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Property</th>
                    <th className="px-4 py-2">Listing</th>
                    <th className="px-4 py-2">State</th>
                    <th className="px-4 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/org-listings/${item.id}`)}
                      className="cursor-pointer hover:bg-surface"
                    >
                      <td className="px-4 py-2 font-semibold text-primary">{item.title}</td>
                      <td className="px-4 py-2 text-secondary">{item.propertyType}</td>
                      <td className="px-4 py-2 text-secondary">{item.listingType}</td>
                      <td className="px-4 py-2 text-secondary">
                        <StatusBadge tone={toneForStatus(item.lifecycleState)}>{item.lifecycleState}</StatusBadge>
                      </td>
                      <td className="px-4 py-2 text-secondary">{item.updatedAt || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}



