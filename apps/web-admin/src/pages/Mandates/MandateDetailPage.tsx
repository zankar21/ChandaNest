import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { approveMandate, getMandate, rejectMandate, revokeMandate } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import ErrorBanner from "../../components/ErrorBanner";
import { formatDate } from "../../utils/format";

export default function MandateDetailPage() {
  const { tenantId, role, user } = useAuth();
  const { mandateId } = useParams();
  const [mandate, setMandate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveForm, setApproveForm] = useState({ validFrom: "", validTo: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [saving, setSaving] = useState(false);

  const canAdmin = role === "tenant_admin" || role === "platform_admin";
  const canDecide = useMemo(() => {
    if (canAdmin) return true;
    if (!mandate?.ownerUid || !user?.uid) return false;
    return mandate.ownerUid === user.uid;
  }, [canAdmin, mandate, user]);

  const loadMandate = async () => {
    if (!tenantId || !mandateId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMandate(tenantId, mandateId);
      setMandate(data);
    } catch (err: any) {
      setError(err.message || "Failed to load mandate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId || !mandateId) return;
    loadMandate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, mandateId]);

  return (
    <div className="space-y-3">
      <Link to="/mandates" className="text-sm text-secondary hover:text-primary">
        ← Back to Mandates
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-primary">Mandate {mandateId}</h1>
        <p className="text-sm text-secondary">Review and decide mandate status.</p>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : mandate ? (
        <>
          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge tone={toneForStatus(mandate.status)}>{mandate.status}</StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-secondary">
              <div>
                <div className="text-xs uppercase text-muted">Owner UID</div>
                <div>{mandate.ownerUid}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Org</div>
                <div>
                  {mandate.orgType}:{mandate.orgId}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Owner Listing</div>
                <div>{mandate.ownerListingId}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Type</div>
                <div>{mandate.mandateType}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Valid From</div>
                <div>{formatDate(mandate.validFrom)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Valid To</div>
                <div>{formatDate(mandate.validTo)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Requested By</div>
                <div>{mandate.requestedBy?.uid || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted">Decided By</div>
                <div>{mandate.decidedBy?.uid || "-"}</div>
              </div>
            </div>
          </div>

          {actionError && <div className="text-sm text-rose-600">{actionError}</div>}

          {mandate.status === "pending" && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="text-xs uppercase text-muted">Approve</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={approveForm.validFrom}
                  onChange={(e) => setApproveForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={approveForm.validTo}
                  onChange={(e) => setApproveForm((prev) => ({ ...prev, validTo: e.target.value }))}
                  className="rounded-md input-glass px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={async () => {
                  if (!tenantId || !mandateId) return;
                  setSaving(true);
                  setActionError(null);
                  try {
                    await approveMandate(tenantId, mandateId, {
                      validFrom: approveForm.validFrom || undefined,
                      validTo: approveForm.validTo || undefined
                    });
                    await loadMandate();
                  } catch (err: any) {
                    if (err?.status === 403) {
                      setActionError("You don’t have permission to perform this action.");
                    } else {
                      setActionError(err.message || "Failed to approve mandate");
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                Approve
              </button>
              <div className="text-xs text-muted">
                {canDecide ? "You can decide this mandate." : "You may not have permission to approve."}
              </div>
            </div>
          )}

          {mandate.status === "pending" && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="text-xs uppercase text-muted">Reject</div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason"
                className="rounded-md input-glass px-3 py-2 text-sm"
                rows={3}
              />
              <button
                onClick={async () => {
                  if (!tenantId || !mandateId) return;
                  if (!rejectReason.trim()) {
                    setActionError("Reason is required for rejection.");
                    return;
                  }
                  setSaving(true);
                  setActionError(null);
                  try {
                    await rejectMandate(tenantId, mandateId, rejectReason.trim());
                    await loadMandate();
                  } catch (err: any) {
                    if (err?.status === 403) {
                      setActionError("You don’t have permission to perform this action.");
                    } else {
                      setActionError(err.message || "Failed to reject mandate");
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}

          {mandate.status === "active" && (
            <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
              <div className="text-xs uppercase text-muted">Revoke</div>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Reason (optional)"
                className="rounded-md input-glass px-3 py-2 text-sm"
                rows={3}
              />
              <button
                onClick={async () => {
                  if (!tenantId || !mandateId) return;
                  setSaving(true);
                  setActionError(null);
                  try {
                    await revokeMandate(tenantId, mandateId, revokeReason.trim() || undefined);
                    await loadMandate();
                  } catch (err: any) {
                    if (err?.status === 403) {
                      setActionError("You don’t have permission to perform this action.");
                    } else {
                      setActionError(err.message || "Failed to revoke mandate");
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                Revoke
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-secondary">Mandate not found.</div>
      )}
    </div>
  );
}



