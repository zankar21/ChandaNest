import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyPrincipals, listMandates, requestMandate } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import { formatDate, formatDateTime } from "../../utils/format";

const STATUS_OPTIONS = ["all", "pending", "active", "rejected", "expired", "revoked"];
const ORG_TYPES = ["all", "agent", "agency"];

export default function MandatesListPage() {
  const { tenantId } = useAuth();
  const [principals, setPrincipals] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [orgIdFilter, setOrgIdFilter] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    orgType: "agency",
    orgId: "",
    ownerUid: "",
    ownerListingId: "",
    mandateType: "non_exclusive",
    validTo: "",
    orgIdMode: "custom"
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const emptyState = useMemo(() => (!loading && items.length === 0 ? "No mandates yet." : null), [loading, items]);

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
        if (active) setPrincipals(data.principals || []);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load principals");
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  useEffect(() => {
    let active = true;
    if (!tenantId) return () => {
      active = false;
    };
    setLoading(true);
    setError(null);
    const params: any = {};
    if (statusFilter !== "all") params.status = statusFilter;
    if (orgTypeFilter !== "all") params.orgType = orgTypeFilter;
    if (orgIdFilter.trim()) params.orgId = orgIdFilter.trim();
    listMandates(tenantId, params)
      .then((data) => {
        if (active) setItems(data.items || []);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load mandates");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, statusFilter, orgTypeFilter, orgIdFilter]);

  const orgOptions = principals.filter((p) => p.type === form.orgType);
  const shouldShowOrgSelect = form.orgType !== "agent" && orgOptions.length > 0;
  const shouldShowAgentSelect = form.orgType === "agent" && principals.some((p) => p.type === "agent");

  const submitRequest = async () => {
    if (!tenantId) return;
    const orgIdValue =
      form.orgType === "agent" && shouldShowAgentSelect && form.orgIdMode !== "custom"
        ? form.orgIdMode
        : form.orgId.trim();
    if (!orgIdValue || !form.ownerUid.trim() || !form.ownerListingId.trim()) {
      setError("orgId, ownerUid, and ownerListingId are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        orgType: form.orgType,
        orgId: orgIdValue,
        ownerUid: form.ownerUid.trim(),
        ownerListingId: form.ownerListingId.trim(),
        mandateType: form.mandateType,
        validTo: form.validTo || undefined
      };
      const created = await requestMandate(tenantId, payload);
      await listMandates(tenantId).then((data) => setItems(data.items || []));
      if (created?.mandateId) navigate(`/mandates/${created.mandateId}`);
    } catch (err: any) {
      setError(err.message || "Failed to request mandate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Mandates</h1>
          <p className="text-sm text-secondary">Request and review owner mandates.</p>
        </div>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : (
        <>
          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={form.orgType}
                onChange={(e) => setForm((prev) => ({ ...prev, orgType: e.target.value, orgId: "", orgIdMode: "custom" }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
              >
                <option value="agent">agent</option>
                <option value="agency">agency</option>
              </select>

              {shouldShowOrgSelect ? (
                <select
                  value={form.orgIdMode}
                  onChange={(e) => setForm((prev) => ({ ...prev, orgIdMode: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="custom">Custom orgId</option>
                  {orgOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.id})
                    </option>
                  ))}
                </select>
              ) : shouldShowAgentSelect ? (
                <select
                  value={form.orgIdMode}
                  onChange={(e) => setForm((prev) => ({ ...prev, orgIdMode: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="custom">Custom orgId</option>
                  {principals
                    .filter((p) => p.type === "agent")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.id})
                      </option>
                    ))}
                </select>
              ) : null}

              {(form.orgIdMode === "custom" || !shouldShowOrgSelect) && (
                <input
                  value={form.orgId}
                  onChange={(e) => setForm((prev) => ({ ...prev, orgId: e.target.value }))}
                  placeholder="orgId"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
              )}

              <input
                value={form.ownerUid}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerUid: e.target.value }))}
                placeholder="Owner UID"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <input
                value={form.ownerListingId}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerListingId: e.target.value }))}
                placeholder="Owner Listing ID"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <select
                value={form.mandateType}
                onChange={(e) => setForm((prev) => ({ ...prev, mandateType: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
              >
                <option value="non_exclusive">non_exclusive</option>
                <option value="exclusive">exclusive</option>
              </select>
              <input
                type="date"
                value={form.validTo}
                onChange={(e) => setForm((prev) => ({ ...prev, validTo: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={submitRequest}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? "Requesting..." : "Request Mandate"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 rounded-xl card-glass border border-theme bg-surface p-3 shadow-sm">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All status" : opt}
                </option>
              ))}
            </select>
            <select
              value={orgTypeFilter}
              onChange={(e) => setOrgTypeFilter(e.target.value)}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              {ORG_TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "all" ? "All org types" : opt}
                </option>
              ))}
            </select>
            <input
              value={orgIdFilter}
              onChange={(e) => setOrgIdFilter(e.target.value)}
              placeholder="orgId filter"
              className="rounded-md input-glass px-2 py-1 text-sm"
            />
          </div>

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No mandates yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">Org</th>
                    <th className="px-4 py-2">Listing</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Valid To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/mandates/${item.id}`)}
                      className="cursor-pointer hover:bg-surface"
                    >
                      <td className="px-4 py-2 text-secondary">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-2 text-secondary">{item.ownerUid}</td>
                      <td className="px-4 py-2 text-secondary">
                        {item.orgType}:{item.orgId}
                      </td>
                      <td className="px-4 py-2 text-secondary">{item.ownerListingId}</td>
                      <td className="px-4 py-2 text-secondary">
                        <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                      </td>
                      <td className="px-4 py-2 text-secondary">{formatDate(item.validTo)}</td>
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



