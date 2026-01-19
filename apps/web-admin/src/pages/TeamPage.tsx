import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  createTeamInvite,
  disableTeamUser,
  enableTeamUser,
  getTeamMe,
  listTeamInvites,
  listTeamUsers,
  revokeTeamInvite
} from "../services/apiClient";
import type { TeamInvite, TeamUser } from "../services/apiTypes";
import { useAuth } from "../hooks/useAuth";
import { isPlatformAdminRole, isTenantAdminRole } from "../utils/roles";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../components/StatusBadge";
import { formatDateTime } from "../utils/format";
import Modal from "../components/Modal";

export default function TeamPage() {
  const { role, tenantId: authTenantId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPlatformAdmin = isPlatformAdminRole(role);
  const isTenantAdmin = isTenantAdminRole(role) || isPlatformAdmin;

  const queryTenantId = searchParams.get("tenantId") ?? "";
  const [tenantInput, setTenantInput] = React.useState(queryTenantId);
  const effectiveTenantId = isPlatformAdmin ? queryTenantId || authTenantId || "" : authTenantId || "";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [teamMeta, setTeamMeta] = React.useState<any>(null);
  const [invites, setInvites] = React.useState<TeamInvite[]>([]);
  const [users, setUsers] = React.useState<TeamUser[]>([]);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("tenant_agent");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteSubmitting, setInviteSubmitting] = React.useState(false);
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);

  const [confirmDisableOpen, setConfirmDisableOpen] = React.useState(false);
  const [targetUser, setTargetUser] = React.useState<TeamUser | null>(null);
  const [actionSubmitting, setActionSubmitting] = React.useState(false);

  const formatMaybeTimestamp = (value?: any) => {
    if (!value) return "-";
    if (typeof value === "string") return formatDateTime(value);
    const seconds = value?._seconds ?? value?.seconds;
    if (typeof seconds === "number") {
      return formatDateTime(new Date(seconds * 1000).toISOString());
    }
    return "-";
  };

  const load = React.useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const meta = await getTeamMe(isPlatformAdmin ? effectiveTenantId : undefined);
      const [invitesResp, usersResp] = await Promise.all([
        listTeamInvites("active", isPlatformAdmin ? effectiveTenantId : undefined),
        listTeamUsers(isPlatformAdmin ? effectiveTenantId : undefined)
      ]);
      setTeamMeta(meta);
      setInvites(invitesResp.invites || []);
      setUsers(usersResp.users || []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId, isPlatformAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!isTenantAdmin) {
    return (
      <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
        You do not have permission to manage team members.
      </div>
    );
  }

  const seatLimit = teamMeta?.seatLimit ?? 0;
  const seatsUsed = teamMeta?.seatsUsed ?? 0;
  const planId = teamMeta?.planId ?? "-";
  const planStatus = teamMeta?.status ?? "-";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-primary">Team</h1>
          <StatusBadge tone={toneForStatus(planStatus)}>{planId}</StatusBadge>
        </div>
        {isPlatformAdmin ? (
          <div className="text-sm text-secondary">
            Managing tenant: {effectiveTenantId || "Select tenant"}
          </div>
        ) : null}
      </div>

      {isPlatformAdmin && !effectiveTenantId ? (
        <div className="rounded-xl card-glass border border-theme p-4 text-sm">
          <label className="text-xs text-muted">Tenant ID</label>
          <div className="mt-2 flex gap-2">
            <input
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              className="w-full rounded-md input-glass px-3 py-2"
            />
            <button
              onClick={() => {
                const next = tenantInput.trim();
                if (!next) return;
                setSearchParams({ tenantId: next });
              }}
              className="rounded-md btn-primary px-3 py-2 text-sm font-semibold"
            >
              Load
            </button>
          </div>
        </div>
      ) : null}

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="rounded-xl card-glass border border-theme p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-secondary">
            Seats used: <span className="font-semibold">{seatsUsed}</span> /{" "}
            <span className="font-semibold">{seatLimit}</span>
          </div>
          <div className="text-xs text-muted">Plan status: {planStatus}</div>
        </div>
      </div>

      <div className="rounded-xl card-glass border border-theme p-4">
        <h2 className="text-sm font-semibold text-secondary">Invite member</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm">
          <div>
            <label className="text-xs text-muted">Email</label>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
            >
              <option value="tenant_manager">tenant_manager</option>
              <option value="tenant_agent">tenant_agent</option>
              <option value="tenant_viewer">tenant_viewer</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Display name</label>
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="mt-1 w-full rounded-md input-glass px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={!inviteEmail || inviteSubmitting}
              onClick={async () => {
                if (!inviteEmail) return;
                setInviteSubmitting(true);
                setError(null);
                setSuccess(null);
                setInviteToken(null);
                try {
                  const resp = await createTeamInvite(
                    { email: inviteEmail, role: inviteRole, displayName: inviteName || undefined },
                    isPlatformAdmin ? effectiveTenantId : undefined
                  );
                  setInviteToken(resp.inviteToken);
                  setSuccess("Invite created. Copy the token below.");
                  setInviteEmail("");
                  setInviteName("");
                  await load();
                } catch (err: any) {
                  setError(err?.message ?? "Invite failed");
                } finally {
                  setInviteSubmitting(false);
                }
              }}
              className="w-full rounded-md btn-primary px-3 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {inviteSubmitting ? "Inviting..." : "Create invite"}
            </button>
          </div>
        </div>

        {inviteToken ? (
          <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
            <div className="font-semibold">One-time invite token</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded bg-surface px-2 py-1 text-xs text-primary">{inviteToken}</code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(inviteToken);
                  setSuccess("Invite token copied.");
                }}
                className="rounded-md border border-amber-400/30 bg-surface px-2 py-1 text-xs font-semibold text-amber-200"
              >
                Copy
              </button>
            </div>
            <div className="mt-2 text-xs text-amber-200">Token is shown once. Copy now.</div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl card-glass border border-theme p-4">
        <h2 className="text-sm font-semibold text-secondary">Pending invites</h2>
        {invites.length === 0 ? (
          <div className="mt-3 text-sm text-muted">No active invites.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm table-surface rounded-xl overflow-hidden">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-secondary">
                {invites.map((invite) => (
                  <tr key={invite.inviteId}>
                    <td className="py-2 pr-3">{invite.email}</td>
                    <td className="py-2 pr-3">{invite.role}</td>
                    <td className="py-2 pr-3">{formatMaybeTimestamp(invite.expiresAt)}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone={toneForStatus(invite.status)}>{invite.status}</StatusBadge>
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={async () => {
                          setActionSubmitting(true);
                          setError(null);
                          try {
                            await revokeTeamInvite(invite.inviteId, isPlatformAdmin ? effectiveTenantId : undefined);
                            setSuccess("Invite revoked.");
                            await load();
                          } catch (err: any) {
                            setError(err?.message ?? "Revoke failed");
                          } finally {
                            setActionSubmitting(false);
                          }
                        }}
                        disabled={actionSubmitting}
                        className="rounded-md btn-secondary px-2 py-1 text-xs font-semibold"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl card-glass border border-theme p-4">
        <h2 className="text-sm font-semibold text-secondary">Users</h2>
        {users.length === 0 ? (
          <div className="mt-3 text-sm text-muted">No users found.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm table-surface rounded-xl overflow-hidden">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-secondary">
                {users.map((member) => (
                  <tr key={member.id}>
                    <td className="py-2 pr-3">{member.email}</td>
                    <td className="py-2 pr-3">{member.displayName || "-"}</td>
                    <td className="py-2 pr-3">{member.role}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone={toneForStatus(member.status)}>{member.status}</StatusBadge>
                    </td>
                    <td className="py-2 pr-3">
                      {member.status === "active" ? (
                        <button
                          onClick={() => {
                            setTargetUser(member);
                            setConfirmDisableOpen(true);
                          }}
                          className="rounded-md border border-rose-400/30 px-2 py-1 text-xs font-semibold text-rose-200"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setActionSubmitting(true);
                            setError(null);
                            try {
                              await enableTeamUser(member.id, isPlatformAdmin ? effectiveTenantId : undefined);
                              setSuccess("User enabled.");
                              await load();
                            } catch (err: any) {
                              setError(err?.message ?? "Enable failed");
                            } finally {
                              setActionSubmitting(false);
                            }
                          }}
                          disabled={actionSubmitting}
                          className="rounded-md btn-secondary px-2 py-1 text-xs font-semibold"
                        >
                          Enable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={confirmDisableOpen} title="Disable user" onClose={() => setConfirmDisableOpen(false)}>
        <div className="space-y-4 text-sm text-secondary">
          <p>Disable access for {targetUser?.email}?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!targetUser) return;
                setActionSubmitting(true);
                setError(null);
                try {
                  await disableTeamUser(targetUser.id, isPlatformAdmin ? effectiveTenantId : undefined);
                  setSuccess("User disabled.");
                  await load();
                  setConfirmDisableOpen(false);
                } catch (err: any) {
                  setError(err?.message ?? "Disable failed");
                } finally {
                  setActionSubmitting(false);
                }
              }}
              disabled={actionSubmitting}
              className="rounded-md bg-rose-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirm disable
            </button>
            <button
              onClick={() => setConfirmDisableOpen(false)}
              className="rounded-md btn-secondary px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {loading ? <div className="text-sm text-muted">Loading...</div> : null}
    </div>
  );
}




