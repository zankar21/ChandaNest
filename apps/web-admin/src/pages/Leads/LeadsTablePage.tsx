import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lead } from "../../services/apiTypes";
import { assignLead, listLeads, listTeamUsers, updateLeadStage } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../utils/format";
import { LEAD_STAGES, STAGE_OPTIONS, priorityTone } from "./leadsUtils";

type TeamUserOption = { uid: string; name?: string; role?: string };

export default function LeadsTablePage() {
  const { tenantId, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialStage = searchParams.get("stage") || "";
  const initialAssignee = searchParams.get("assignee") || "";
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [stage, setStage] = useState(initialStage);
  const [assignee, setAssignee] = useState(initialAssignee);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | undefined>();
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
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (stage) params.set("stage", stage);
    if (assignee) params.set("assignee", assignee);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, stage, assignee, fromDate, toDate, setSearchParams]);

  const loadLeads = async (reset: boolean) => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listLeads(tenantId, {
        q: debouncedQuery || undefined,
        stage: stage || undefined,
        assignee: assignee || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        limit: 25,
        cursor: reset ? undefined : cursor
      });
      setItems((prev) => (reset ? data.items : [...prev, ...(data.items || [])]));
      setNextCursor(data.nextCursor);
      setCursor(data.nextCursor);
    } catch (err: any) {
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    setNextCursor(undefined);
    loadLeads(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, debouncedQuery, stage, assignee, fromDate, toDate]);

  const handleAssign = async (lead: Lead, option: TeamUserOption) => {
    if (!tenantId) return;
    await assignLead(tenantId, lead.id, option);
    setItems((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, assignee: option } : item))
    );
  };

  const handleStage = async (lead: Lead, nextStage: Lead["stage"]) => {
    if (!tenantId) return;
    let lostReason: string | undefined;
    if (nextStage === "closed_lost") {
      lostReason = window.prompt("Reason for loss") || undefined;
      if (!lostReason) return;
    }
    await updateLeadStage(tenantId, lead.id, { stage: nextStage, lostReason });
    setItems((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, stage: nextStage, status: { isOpen: nextStage === "new" || nextStage === "contacted" || nextStage === "site_visit" || nextStage === "negotiation", lostReason } }
          : item
      )
    );
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    LEAD_STAGES.forEach((s) => (map[s.key] = 0));
    items.forEach((lead) => {
      map[lead.stage] = (map[lead.stage] || 0) + 1;
    });
    return map;
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Leads Table</h1>
          <p className="text-sm text-secondary">Filter and manage leads with cursor pagination.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leads"
            className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
          >
            Board view
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <input
          className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary md:col-span-2"
          placeholder="Search name, phone, project"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          <option value="">All stages</option>
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
        >
          <option value="">All assignees</option>
          {teamUsers.map((user) => (
            <option key={user.uid} value={user.uid}>
              {user.name || user.uid}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
          <input
            type="date"
            className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-secondary">
        {LEAD_STAGES.map((stageItem) => (
          <span key={stageItem.key} className="rounded-full border border-theme px-3 py-1">
            {stageItem.label}: {counts[stageItem.key] || 0}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-theme">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-secondary">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="border-t border-theme bg-surface/30 animate-pulse">
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-4 w-2/3 rounded bg-surface-strong" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-secondary">
                  No leads found.
                </td>
              </tr>
            ) : (
              items.map((lead) => (
                <tr key={lead.id} className="border-t border-theme bg-surface/30">
                  <td className="px-4 py-3">
                    <button
                      className="text-sm font-semibold text-primary hover:underline"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {lead.contact.name || "Unnamed lead"}
                    </button>
                    <div className="text-xs text-secondary">{lead.contact.phone || lead.contact.email || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {lead.subject?.title || "General enquiry"}
                    <div className="text-xs text-muted">
                      {[lead.subject?.area, lead.subject?.city].filter(Boolean).join(", ") || "Location pending"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.stage}
                      onChange={(event) => handleStage(lead, event.target.value as Lead["stage"])}
                      className="rounded-md border border-theme bg-surface px-2 py-1 text-xs text-secondary"
                      disabled={!canManage}
                      title={!canManage ? "Admin only" : undefined}
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.assignee?.uid || ""}
                      onChange={(event) => {
                        const selected = teamUsers.find((user) => user.uid === event.target.value);
                        if (selected) handleAssign(lead, selected);
                      }}
                      className="rounded-md border border-theme bg-surface px-2 py-1 text-xs text-secondary"
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
                  </td>
                  <td className="px-4 py-3 text-secondary">{formatDateTime(lead.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${priorityTone(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => loadLeads(false)}
            className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
