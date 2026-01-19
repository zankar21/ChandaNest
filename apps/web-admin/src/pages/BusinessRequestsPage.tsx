import React from "react";
import { useAuth } from "../hooks/useAuth";
import { approveBusinessRequest, listBusinessRequests, rejectBusinessRequest } from "../services/apiClient";
import type { BusinessRequest } from "../services/apiTypes";
import StatusBadge, { toneForStatus } from "../components/StatusBadge";
import ErrorBanner from "../components/ErrorBanner";
import Modal from "../components/Modal";
import { formatDateTime } from "../utils/format";
import { isPlatformAdminRole } from "../utils/roles";

const STATUS_TABS: Array<BusinessRequest["status"]> = ["pending", "approved", "rejected"];

function formatMaybeTimestamp(value?: any) {
  if (!value) return "-";
  if (typeof value === "string") return formatDateTime(value);
  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") {
    return formatDateTime(new Date(seconds * 1000).toISOString());
  }
  return "-";
}

export default function BusinessRequestsPage() {
  const { role } = useAuth();
  const isPlatformAdmin = isPlatformAdminRole(role);
  const [status, setStatus] = React.useState<BusinessRequest["status"]>("pending");
  const [items, setItems] = React.useState<BusinessRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<BusinessRequest | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [approveSubmitting, setApproveSubmitting] = React.useState(false);
  const [rejectSubmitting, setRejectSubmitting] = React.useState(false);
  const [approvePlan, setApprovePlan] = React.useState("trial");
  const [tenantSlug, setTenantSlug] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [tokenPanel, setTokenPanel] = React.useState<{ tenantId: string; inviteId: string; inviteToken: string } | null>(null);

  const load = React.useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listBusinessRequests(status);
      setItems(data.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [status, isPlatformAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!isPlatformAdmin) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        You do not have permission to view business requests.
      </div>
    );
  }

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const hay = [
      item.organizationName,
      item.contactPerson,
      item.email,
      item.phone,
      item.city,
      item.businessType
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(search.trim().toLowerCase());
  });

  const openApprove = (item: BusinessRequest) => {
    setSelected(item);
    setApprovePlan("trial");
    setTenantSlug("");
    setTokenPanel(null);
    setApproveOpen(true);
  };

  const openReject = (item: BusinessRequest) => {
    setSelected(item);
    setRejectReason("");
    setRejectOpen(true);
  };

  const submitApprove = async () => {
    if (!selected) return;
    setApproveSubmitting(true);
    setError(null);
    try {
      const data = await approveBusinessRequest(selected.id, {
        plan: approvePlan,
        tenantSlug: tenantSlug.trim() || undefined
      });
      setTokenPanel({
        tenantId: data.tenantId,
        inviteId: data.inviteId,
        inviteToken: data.inviteToken
      });
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Approval failed");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selected) return;
    if (rejectReason.trim().length < 5) return;
    setRejectSubmitting(true);
    setError(null);
    try {
      await rejectBusinessRequest(selected.id, rejectReason.trim());
      setRejectOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Rejection failed");
    } finally {
      setRejectSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary">Business Requests</h1>
        <div className="flex items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                status === tab ? "bg-indigo-600 text-white" : "bg-surface border border-theme text-secondary"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by org, contact, email, phone, city..."
          className="w-full max-w-sm rounded-lg input-glass px-3 py-2 text-sm"
        />
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      <div className="overflow-x-auto rounded-xl card-glass border border-theme bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-app text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted">
                  No requests found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{formatMaybeTimestamp(item.submittedAt)}</td>
                  <td className="px-4 py-3 font-medium text-primary">{item.organizationName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="blue">{item.businessType}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">{item.contactPerson}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.city}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(item)}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} title="Business request" onClose={() => setSelected(null)}>
        {selected ? (
          <div className="space-y-4 text-sm text-secondary">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted">Organization</div>
                <div className="font-medium text-primary">{selected.organizationName}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Type</div>
                <div className="font-medium text-primary">{selected.businessType}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Contact</div>
                <div className="font-medium text-primary">{selected.contactPerson}</div>
              </div>
              <div>
                <div className="text-xs text-muted">City</div>
                <div className="font-medium text-primary">{selected.city}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Email</div>
                <div className="font-medium text-primary">{selected.email}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Phone</div>
                <div className="font-medium text-primary">{selected.phone}</div>
              </div>
            </div>
            {selected.message ? (
              <div>
                <div className="text-xs text-muted">Message</div>
                <div className="text-primary">{selected.message}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {selected.status === "pending" ? (
                <>
                  <button
                    onClick={() => openApprove(selected)}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openReject(selected)}
                    className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </>
              ) : null}
              <button
                onClick={() => setSelected(null)}
                className="rounded-md input-glass px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={approveOpen} title="Approve request" onClose={() => setApproveOpen(false)}>
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-muted">Plan</label>
            <select
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
              value={approvePlan}
              onChange={(e) => setApprovePlan(e.target.value)}
            >
              <option value="trial">trial</option>
              <option value="starter">starter</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Tenant slug override (optional)</label>
            <input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
            />
          </div>
          {tokenPanel ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <div className="font-semibold">One-time invite token</div>
              <div className="mt-2 space-y-1">
                <div>Tenant ID: {tokenPanel.tenantId}</div>
                <div>Invite ID: {tokenPanel.inviteId}</div>
                <div className="break-all font-mono text-xs bg-surface/70 rounded p-2">{tokenPanel.inviteToken}</div>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(tokenPanel.inviteToken)}
                className="mt-2 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Copy token
              </button>
              <div className="mt-2 text-xs text-amber-200">Token shown once. Copy now.</div>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={submitApprove}
              disabled={approveSubmitting}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {approveSubmitting ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => setApproveOpen(false)}
              className="rounded-md input-glass px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={rejectOpen} title="Reject request" onClose={() => setRejectOpen(false)}>
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-muted">Reason</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitReject}
              disabled={rejectSubmitting || rejectReason.trim().length < 5}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {rejectSubmitting ? "Rejecting..." : "Reject"}
            </button>
            <button
              onClick={() => setRejectOpen(false)}
              className="rounded-md input-glass px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



