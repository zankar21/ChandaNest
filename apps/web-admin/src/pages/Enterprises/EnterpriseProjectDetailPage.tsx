import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createInventoryItem,
  getEnterpriseProject,
  getMyPrincipals,
  listEnterpriseProjects,
  listInventoryItems,
  patchInventoryStatus
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import { formatINR } from "../../utils/format";

const STATUS_OPTIONS = ["available", "hold", "booked", "sold"];
const TYPE_OPTIONS = ["unit", "plot", "shop", "office", "other"];

export default function EnterpriseProjectDetailPage() {
  const { tenantId, role } = useAuth();
  const { enterpriseId, projectId } = useParams();
  const [project, setProject] = useState<any | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [filters, setFilters] = useState({ status: "all", inventoryType: "all" });
  const [form, setForm] = useState({
    inventoryType: "plot",
    code: "",
    title: "",
    areaSqFt: "",
    priceTotal: ""
  });
  const [saving, setSaving] = useState(false);

  const canManageByRole = role === "tenant_admin" || role === "platform_admin";
  const emptyState = useMemo(
    () => (!loading && inventory.length === 0 ? "No inventory yet." : null),
    [loading, inventory]
  );

  useEffect(() => {
    let active = true;
    if (!tenantId || !enterpriseId) return () => {
      active = false;
    };
    const determinePermissions = async () => {
      if (canManageByRole) {
        if (active) setCanManage(true);
        return;
      }
      try {
        const data = await getMyPrincipals(tenantId);
        const principal = data.principals?.find((p) => p.type === "enterprise" && p.id === enterpriseId);
        const allowed = principal?.role === "enterprise_admin" || principal?.role === "enterprise_project_manager";
        if (active) setCanManage(Boolean(allowed));
      } catch {
        if (active) setCanManage(false);
      }
    };
    determinePermissions();
    return () => {
      active = false;
    };
  }, [tenantId, enterpriseId, canManageByRole]);

  const loadProject = async () => {
    if (!tenantId || !enterpriseId || !projectId) return;
    try {
      const data = await getEnterpriseProject(tenantId, enterpriseId, projectId);
      setProject(data);
    } catch {
      const data = await listEnterpriseProjects(tenantId, enterpriseId);
      const found = data.items.find((item: any) => item.id === projectId);
      setProject(found || null);
    }
  };

  const loadInventory = async () => {
    if (!tenantId || !enterpriseId || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.status !== "all") params.status = filters.status;
      if (filters.inventoryType !== "all") params.inventoryType = filters.inventoryType;
      const data = await listInventoryItems(tenantId, enterpriseId, projectId, params);
      setInventory(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId || !enterpriseId || !projectId) return;
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, enterpriseId, projectId]);

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, enterpriseId, projectId, filters.status, filters.inventoryType]);

  const submitInventory = async () => {
    if (!tenantId || !enterpriseId || !projectId) return;
    if (!form.code.trim() || !form.inventoryType) {
      setError("Inventory type and code are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createInventoryItem(tenantId, enterpriseId, projectId, {
        inventoryType: form.inventoryType,
        code: form.code.trim(),
        title: form.title.trim() || undefined,
        areaSqFt: form.areaSqFt ? Number(form.areaSqFt) : undefined,
        priceTotal: form.priceTotal ? Number(form.priceTotal) : undefined
      });
      setForm({ inventoryType: "plot", code: "", title: "", areaSqFt: "", priceTotal: "" });
      await loadInventory();
    } catch (err: any) {
      setError(err.message || "Failed to create inventory item");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (itemId: string, status: string) => {
    if (!tenantId || !enterpriseId || !projectId) return;
    try {
      await patchInventoryStatus(tenantId, enterpriseId, projectId, itemId, status);
      await loadInventory();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-3">
      <Link to={`/enterprises/${enterpriseId}/projects`} className="text-sm text-secondary hover:text-primary">
        ← Back to Projects
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-primary">{project?.name || "Project"}</h1>
        <p className="text-sm text-secondary">Inventory items and availability.</p>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl card-glass border border-theme bg-surface p-3 shadow-sm">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <select
              value={filters.inventoryType}
              onChange={(e) => setFilters((prev) => ({ ...prev, inventoryType: e.target.value }))}
              className="rounded-md input-glass px-2 py-1 text-sm"
            >
              <option value="all">All Types</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {project?.status && (
              <span className="text-xs uppercase text-muted">Status: {project.status}</span>
            )}
          </div>

          {canManage && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={form.inventoryType}
                  onChange={(e) => setForm((prev) => ({ ...prev, inventoryType: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Code"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Title (optional)"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.areaSqFt}
                  onChange={(e) => setForm((prev) => ({ ...prev, areaSqFt: e.target.value }))}
                  placeholder="Area (sq ft)"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.priceTotal}
                  onChange={(e) => setForm((prev) => ({ ...prev, priceTotal: e.target.value }))}
                  placeholder="Total price"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={submitInventory}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Inventory"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No inventory yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm table-surface rounded-xl overflow-hidden">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Title</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Area (sq ft)</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-semibold text-primary">{item.code}</td>
                      <td className="px-4 py-2 text-secondary">{item.title || "-"}</td>
                      <td className="px-4 py-2 text-secondary">{item.inventoryType}</td>
                      <td className="px-4 py-2 text-secondary">{item.areaSqFt ?? "-"}</td>
                      <td className="px-4 py-2 text-secondary">
                        {canManage ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={item.status}
                              onChange={(e) => updateStatus(item.id, e.target.value)}
                              className="rounded-md input-glass px-2 py-1 text-sm"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                          </div>
                        ) : (
                          <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-secondary">
                        {item.priceTotal ? formatINR(Number(item.priceTotal)) : "-"}
                      </td>
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




