import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createEnterpriseProject,
  getEnterprise,
  getMyPrincipals,
  listEnterpriseProjects
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import { formatDateTime } from "../../utils/format";

export default function EnterpriseProjectsPage() {
  const { tenantId, role } = useAuth();
  const { enterpriseId } = useParams();
  const [enterpriseName, setEnterpriseName] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    status: "active",
    reraId: ""
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const canManageByRole = role === "tenant_admin" || role === "platform_admin";
  const emptyState = useMemo(() => (!loading && items.length === 0 ? "No projects yet." : null), [loading, items]);

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setError(null);
      setItems([]);
      return () => {
        active = false;
      };
    }
    if (!enterpriseId) {
      setError("Missing enterprise.");
      return () => {
        active = false;
      };
    }
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

  useEffect(() => {
    let active = true;
    if (!tenantId || !enterpriseId) return () => {
      active = false;
    };
    setLoading(true);
    setError(null);
    getEnterprise(tenantId, enterpriseId)
      .then((data) => {
        if (active) setEnterpriseName(data?.name || null);
      })
      .catch(() => {
        if (active) setEnterpriseName(null);
      });
    listEnterpriseProjects(tenantId, enterpriseId)
      .then((data) => {
        if (active) setItems(data.items || []);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load projects");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, enterpriseId]);

  const submitCreate = async () => {
    if (!tenantId || !enterpriseId) return;
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createEnterpriseProject(tenantId, enterpriseId, {
        name: form.name.trim(),
        city: form.city.trim() || undefined,
        status: form.status,
        reraId: form.reraId.trim() || undefined
      });
      setForm({ name: "", city: "", status: "active", reraId: "" });
      const data = await listEnterpriseProjects(tenantId, enterpriseId);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            Projects {enterpriseName ? `— ${enterpriseName}` : ""}
          </h1>
          <p className="text-sm text-secondary">Enterprise projects and inventory buckets.</p>
        </div>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : (
        <>
          {canManage && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Project name"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <input
                  value={form.reraId}
                  onChange={(e) => setForm((prev) => ({ ...prev, reraId: e.target.value }))}
                  placeholder="RERA ID"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={submitCreate}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Project"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No projects yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm table-surface rounded-xl overflow-hidden">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">City</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">RERA</th>
                    <th className="px-4 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/enterprises/${enterpriseId}/projects/${project.id}`)}
                      className="cursor-pointer hover:bg-surface"
                    >
                      <td className="px-4 py-2 font-semibold text-primary">{project.name || "Untitled"}</td>
                      <td className="px-4 py-2 text-secondary">{project.city || "-"}</td>
                      <td className="px-4 py-2 text-secondary">{project.status || "active"}</td>
                      <td className="px-4 py-2 text-secondary">{project.reraId || "-"}</td>
                      <td className="px-4 py-2 text-secondary">{formatDateTime(project.updatedAt)}</td>
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




