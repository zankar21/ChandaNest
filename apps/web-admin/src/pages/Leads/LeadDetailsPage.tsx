import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Lead, LeadNote } from "../../services/apiTypes";
import { addLeadNote, assignLead, getLead, listLeadNotes, listTeamUsers, updateLeadStage } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../utils/format";
import { LEAD_STAGES, priorityTone } from "./leadsUtils";

type TeamUserOption = { uid: string; name?: string; role?: string };

export default function LeadDetailsPage() {
  const { tenantId, role } = useAuth();
  const { leadId } = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<LeadNote["type"]>("note");
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
    if (!tenantId || !leadId) return;
    let active = true;
    setLoading(true);
    setError(null);
    getLead(tenantId, leadId)
      .then((data) => {
        if (active) setLead(data);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load lead");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, leadId]);

  useEffect(() => {
    if (!tenantId || !leadId) return;
    setNoteLoading(true);
    listLeadNotes(tenantId, leadId)
      .then((data) => setNotes(data.items || []))
      .catch(() => setNotes([]))
      .finally(() => setNoteLoading(false));
  }, [tenantId, leadId]);

  const subjectTitle = lead?.subject?.title || "General enquiry";
  const subjectLocation = [lead?.subject?.area, lead?.subject?.city].filter(Boolean).join(", ");
  const whatsappTarget = lead?.contact?.phone ? lead.contact.phone.replace(/[^0-9]/g, "") : "";
  const whatsappUrl = whatsappTarget ? `https://wa.me/${whatsappTarget}` : null;

  const handleAssign = async (value: string) => {
    if (!tenantId || !leadId) return;
    const selected = teamUsers.find((user) => user.uid === value);
    if (!selected) return;
    await assignLead(tenantId, leadId, selected);
    setLead((prev) => (prev ? { ...prev, assignee: selected } : prev));
  };

  const handleStage = async (value: Lead["stage"]) => {
    if (!tenantId || !leadId) return;
    let lostReason: string | undefined;
    if (value === "closed_lost") {
      lostReason = window.prompt("Reason for loss") || undefined;
      if (!lostReason) return;
    }
    await updateLeadStage(tenantId, leadId, { stage: value, lostReason });
    setLead((prev) =>
      prev
        ? { ...prev, stage: value, status: { isOpen: value !== "closed_won" && value !== "closed_lost", lostReason } }
        : prev
    );
  };

  const addNote = async () => {
    if (!tenantId || !leadId || !noteText.trim()) return;
    await addLeadNote(tenantId, leadId, { type: noteType, text: noteText.trim() });
    setNoteText("");
    const data = await listLeadNotes(tenantId, leadId);
    setNotes(data.items || []);
  };

  const copy = (value?: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
  };

  if (loading) {
    return <div className="text-sm text-secondary">Loading lead...</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      <Link to="/leads" className="text-sm text-secondary hover:text-primary">
        Back to leads
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{subjectTitle}</h1>
          <p className="text-sm text-secondary">{subjectLocation || "Location pending"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${priorityTone(lead.priority)}`}>
          {lead.priority}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-theme bg-surface/40 p-5 space-y-3">
            <div className="text-sm font-semibold text-primary">Contact</div>
            <div className="text-sm text-secondary">
              {lead.contact.name || "Unnamed lead"}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-secondary">
              {lead.contact.phone && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-theme px-3 py-1">{lead.contact.phone}</span>
                  <button
                    onClick={() => copy(lead.contact.phone)}
                    className="rounded-full border border-theme px-3 py-1"
                  >
                    Copy
                  </button>
                </div>
              )}
              {lead.contact.email && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-theme px-3 py-1">{lead.contact.email}</span>
                  <button
                    onClick={() => copy(lead.contact.email)}
                    className="rounded-full border border-theme px-3 py-1"
                  >
                    Copy
                  </button>
                </div>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-theme px-3 py-1"
                >
                  Open WhatsApp
                </a>
              )}
            </div>
            {lead.contact.message && (
              <div className="rounded-xl border border-theme bg-surface/60 p-3 text-sm text-secondary">
                {lead.contact.message}
              </div>
            )}
            <div className="text-xs text-muted">
              Created {formatDateTime(lead.createdAt)} | Updated {formatDateTime(lead.updatedAt)}
            </div>
          </div>

          <div className="rounded-2xl border border-theme bg-surface/40 p-5 space-y-3">
            <div className="text-sm font-semibold text-primary">Timeline & Notes</div>
            <div className="space-y-3">
              {noteLoading ? (
                <div className="text-sm text-secondary">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-sm text-secondary">No notes yet.</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-theme bg-surface/60 p-3">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{note.type}</span>
                      <span>{formatDateTime(note.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-sm text-secondary">{note.text}</div>
                    <div className="mt-2 text-[11px] text-muted">
                      {note.createdBy?.name || note.createdBy?.uid}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <select
                value={noteType}
                onChange={(event) => setNoteType(event.target.value as LeadNote["type"])}
                className="rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="system">System</option>
              </select>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                className="w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
                rows={3}
                placeholder="Add a note..."
              />
              <button
                type="button"
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={addNote}
                disabled={!noteText.trim()}
              >
                Add note
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-theme bg-surface/40 p-5 space-y-3">
            <div className="text-sm font-semibold text-primary">Pipeline</div>
            <div className="text-xs text-secondary">Stage</div>
            <select
              value={lead.stage}
              onChange={(event) => handleStage(event.target.value as Lead["stage"])}
              className="w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
              disabled={!canManage}
            >
              {LEAD_STAGES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            {lead.stage === "closed_lost" && lead.status?.lostReason && (
              <div className="text-xs text-secondary">Lost reason: {lead.status.lostReason}</div>
            )}
          </div>

          <div className="rounded-2xl border border-theme bg-surface/40 p-5 space-y-3">
            <div className="text-sm font-semibold text-primary">Assignee</div>
            <select
              value={lead.assignee?.uid || ""}
              onChange={(event) => handleAssign(event.target.value)}
              className="w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
              disabled={!canManage}
            >
              <option value="">Unassigned</option>
              {teamUsers.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.name || user.uid}
                </option>
              ))}
            </select>
            <div className="text-xs text-secondary">
              {lead.assignee?.name || lead.assignee?.uid || "Not assigned"}
            </div>
          </div>

          <div className="rounded-2xl border border-theme bg-surface/40 p-5 space-y-2 text-sm text-secondary">
            <div className="text-sm font-semibold text-primary">Subject</div>
            <div>Kind: {lead.subject?.kind || "-"}</div>
            {lead.subject?.href && (
              <a href={lead.subject.href} className="text-indigo-300 underline" target="_blank" rel="noreferrer">
                View public page
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
