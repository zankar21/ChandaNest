import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEnterprise, listEnterprises } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import { formatDateTime } from "../../utils/format";

export default function EnterprisesListPage() {
  const { tenantId, role } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    email: "",
    phone: "",
    reraId: "",
    addressLine: ""
  });
  const navigate = useNavigate();
  const canCreate = role === "tenant_admin" || role === "platform_admin";
  const emptyState = useMemo(() => (!loading && items.length === 0 ? "No enterprises yet." : null), [loading, items]);

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setError(null);
      setItems([]);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    listEnterprises(tenantId)
      .then((data) => {
        const list = (data as any).items || (data as any).enterprises || [];
        if (active) setItems(list);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load enterprises");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  const submitCreate = async () => {
    if (!tenantId) return;
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      reraId: form.reraId.trim() || undefined,
      addressLine: form.addressLine.trim() || undefined
    };
    try {
      const created = await createEnterprise(tenantId, payload);
      setShowCreate(false);
      setForm({ name: "", city: "", email: "", phone: "", reraId: "", addressLine: "" });
      const data = await listEnterprises(tenantId);
      setItems((data as any).items || (data as any).enterprises || []);
      if (created?.enterpriseId) navigate(`/enterprises/${created.enterpriseId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create enterprise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Enterprises</h1>
          <p className="text-sm text-secondary">Manage enterprise clients and projects.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Create Enterprise
          </button>
        )}
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : (
        <>
          {showCreate && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enterprise name"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.reraId}
                  onChange={(e) => setForm((prev) => ({ ...prev, reraId: e.target.value }))}
                  placeholder="RERA ID"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  value={form.addressLine}
                  onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                  placeholder="Address line"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={submitCreate}
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Save Enterprise"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-md input-glass px-3 py-2 text-sm text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No enterprises yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm table-surface rounded-xl overflow-hidden">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">City</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((enterprise) => (
                    <tr
                      key={enterprise.id}
                      onClick={() => navigate(`/enterprises/${enterprise.id}`)}
                      className="cursor-pointer hover:bg-surface"
                    >
                      <td className="px-4 py-2 font-semibold text-primary">{enterprise.name || "Untitled"}</td>
                      <td className="px-4 py-2 text-secondary">{enterprise.city || "-"}</td>
                      <td className="px-4 py-2 text-secondary">{enterprise.email || "-"}</td>
                      <td className="px-4 py-2 text-secondary">{formatDateTime(enterprise.createdAt)}</td>
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




