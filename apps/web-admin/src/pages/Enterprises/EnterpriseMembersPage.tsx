import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addEnterpriseMember,
  getMyPrincipals,
  listEnterpriseMembers,
  patchEnterpriseMember
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import { formatDateTime } from "../../utils/format";

const ROLE_OPTIONS = [
  "enterprise_admin",
  "enterprise_project_manager",
  "enterprise_listing_manager",
  "enterprise_sales",
  "enterprise_compliance",
  "enterprise_analyst"
];

export default function EnterpriseMembersPage() {
  const { tenantId, role } = useAuth();
  const { enterpriseId } = useParams();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState({ userId: "", role: "enterprise_listing_manager", status: "active" });
  const [rowEdits, setRowEdits] = useState<Record<string, { role?: string; status?: string }>>({});

  const canManageByRole = role === "tenant_admin" || role === "platform_admin";
  const emptyState = useMemo(() => (!loading && members.length === 0 ? "No members yet." : null), [loading, members]);

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
        const allowed = principal?.role === "enterprise_admin";
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

  const loadMembers = async () => {
    if (!tenantId || !enterpriseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listEnterpriseMembers(tenantId, enterpriseId);
      const list = (data as any).items || (data as any).members || [];
      setMembers(list);
    } catch (err: any) {
      setError(err.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, enterpriseId]);

  const submitMember = async () => {
    if (!tenantId || !enterpriseId) return;
    if (!form.userId.trim()) {
      setError("User ID is required.");
      return;
    }
    try {
      await addEnterpriseMember(tenantId, enterpriseId, {
        userId: form.userId.trim(),
        role: form.role,
        status: form.status
      });
      setForm({ userId: "", role: "enterprise_listing_manager", status: "active" });
      await loadMembers();
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    }
  };

  const saveRow = async (membershipId: string) => {
    if (!tenantId || !enterpriseId) return;
    const patch = rowEdits[membershipId];
    if (!patch) return;
    try {
      await patchEnterpriseMember(tenantId, enterpriseId, membershipId, patch);
      setRowEdits((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
      await loadMembers();
    } catch (err: any) {
      setError(err.message || "Failed to update member");
    }
  };

  return (
    <div className="space-y-3">
      <Link to={`/enterprises/${enterpriseId}`} className="text-sm text-secondary hover:text-primary">
        ← Back to Enterprise
      </Link>
      <h1 className="text-2xl font-semibold text-primary">Enterprise Members</h1>
      <p className="text-sm text-secondary">Manage enterprise access roles.</p>
      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : (
        <>
          {canManage && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={form.userId}
                  onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
                  placeholder="User ID"
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
              <button
                onClick={submitMember}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Add Member
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-secondary">Loading...</div>
          ) : error ? (
            <ErrorBanner message={error} />
          ) : emptyState ? (
            <EmptyState title="No members yet." />
          ) : (
            <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
              <table className="min-w-full divide-y divide-white/10 text-sm table-surface rounded-xl overflow-hidden">
                <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                  <tr>
                    <th className="px-4 py-2">User ID</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Updated</th>
                    {canManage && <th className="px-4 py-2">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {members.map((member) => {
                    const edit = rowEdits[member.id] || {};
                    return (
                      <tr key={member.id}>
                        <td className="px-4 py-2 text-primary">{member.userId}</td>
                        <td className="px-4 py-2">
                          {canManage ? (
                            <select
                              value={edit.role ?? member.role}
                              onChange={(e) =>
                                setRowEdits((prev) => ({
                                  ...prev,
                                  [member.id]: { ...prev[member.id], role: e.target.value }
                                }))
                              }
                              className="rounded-md input-glass px-2 py-1 text-sm"
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-secondary">{member.role}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {canManage ? (
                            <select
                              value={edit.status ?? member.status}
                              onChange={(e) =>
                                setRowEdits((prev) => ({
                                  ...prev,
                                  [member.id]: { ...prev[member.id], status: e.target.value }
                                }))
                              }
                              className="rounded-md input-glass px-2 py-1 text-sm"
                            >
                              <option value="active">active</option>
                              <option value="suspended">suspended</option>
                            </select>
                          ) : (
                            <span className="text-secondary">{member.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-secondary">{formatDateTime(member.updatedAt)}</td>
                        {canManage && (
                          <td className="px-4 py-2">
                            <button
                              onClick={() => saveRow(member.id)}
                              className="text-indigo-600 font-semibold hover:underline"
                            >
                              Save
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}




