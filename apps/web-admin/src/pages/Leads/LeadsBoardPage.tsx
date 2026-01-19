import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lead } from "../../services/apiTypes";
import { assignLead, listLeads, listTeamUsers, updateLeadStage } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../utils/format";
import { LEAD_STAGES, priorityTone } from "./leadsUtils";

type TeamUserOption = { uid: string; name?: string; role?: string };

export default function LeadsBoardPage() {
  const { tenantId, role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [teamUsers, setTeamUsers] = useState<TeamUserOption[]>([]);
  const canManage = role === "tenant_admin" || role === "client_admin" || role === "platform_admin";

  useEffect(() => {
    if (!tenantId) return;
    listTeamUsers(tenantId)
      .then((data) => {
        setTeamUsers(
          (data.users || []).map((user) => ({
            uid: user.uid,
            name: user.displayName,
            role: user.role
          }))
        );
      })
      .catch(() => {
        setTeamUsers([]);
      });
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    setLoading(true);
    setError(null);
    listLeads(tenantId, { q: query || undefined, assignee: assigneeFilter || undefined, limit: 200 })
      .then((data) => {
        if (!active) return;
        setItems(data.items || []);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load leads");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, query, assigneeFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    LEAD_STAGES.forEach((stage) => {
      map[stage.key] = [];
    });
    items.forEach((lead) => {
      if (!map[lead.stage]) map[lead.stage] = [];
      map[lead.stage].push(lead);
    });
    return map;
  }, [items]);

  const handleAssign = async (lead: Lead, option: TeamUserOption) => {
    if (!tenantId) return;
    await assignLead(tenantId, lead.id, option);
    setItems((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, assignee: option } : item))
    );
  };

  const handleStage = async (lead: Lead, stage: Lead["stage"]) => {
    if (!tenantId) return;
    let lostReason: string | undefined;
    if (stage === "closed_lost") {
      lostReason = window.prompt("Reason for loss") || undefined;
      if (!lostReason) return;
    }
    await updateLeadStage(tenantId, lead.id, { stage, lostReason });
    setItems((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, stage, status: { isOpen: stage !== "closed_won" && stage !== "closed_lost", lostReason } }
          : item
      )
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Leads Board</h1>
          <p className="text-sm text-secondary">Track enquiries across the pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leads/table"
            className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
          >
            Table view
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          className="w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          placeholder="Search name, phone, or project"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
        >
          <option value="">All assignees</option>
          {teamUsers.map((user) => (
            <option key={user.uid} value={user.uid}>
              {user.name || user.uid}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-6">
        {LEAD_STAGES.map((stage) => (
          <div key={stage.key} className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-theme bg-surface/60 px-3 py-2">
              <div className="text-xs font-semibold text-secondary">{stage.label}</div>
              <div className="rounded-full border border-theme bg-surface px-2 py-0.5 text-[11px] text-secondary">
                {grouped[stage.key]?.length || 0}
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="rounded-2xl border border-theme bg-surface/40 p-3 animate-pulse">
                    <div className="h-3 w-2/3 rounded bg-surface-strong" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
                    <div className="mt-3 h-3 w-1/3 rounded bg-surface" />
                  </div>
                ))}
              </div>
            ) : grouped[stage.key]?.length ? (
              grouped[stage.key].map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-theme bg-surface/40 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="text-sm font-semibold text-primary text-left"
                    >
                      {lead.contact.name || "Unnamed lead"}
                    </button>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${priorityTone(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">{lead.contact.phone || lead.contact.email || "-"}</div>
                  <div className="text-xs text-secondary">
                    {lead.subject?.title || "General enquiry"} - {lead.subject?.kind || "general"}
                  </div>
                  <div className="text-[11px] text-muted">
                    {[lead.subject?.area, lead.subject?.city].filter(Boolean).join(", ") || "Location pending"}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>{formatDateTime(lead.updatedAt)}</span>
                    <span>{lead.assignee?.name || lead.assignee?.uid || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.stage}
                      onChange={(event) => handleStage(lead, event.target.value as Lead["stage"])}
                      className="rounded-md border border-theme bg-surface px-2 py-1 text-[11px] text-secondary"
                      disabled={!canManage}
                      title={!canManage ? "Admin only" : undefined}
                    >
                      {LEAD_STAGES.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={lead.assignee?.uid || ""}
                      onChange={(event) => {
                        const selected = teamUsers.find((user) => user.uid === event.target.value);
                        if (selected) handleAssign(lead, selected);
                      }}
                      className="flex-1 rounded-md border border-theme bg-surface px-2 py-1 text-[11px] text-secondary"
                      disabled={!canManage}
                      title={!canManage ? "Admin only" : undefined}
                    >
                      <option value="">Unassigned</option>
                      {teamUsers.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.name || user.uid}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="rounded-md border border-theme px-2 py-1 text-[11px] text-secondary"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-theme bg-surface/40 p-3 text-xs text-secondary">
                No leads.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
