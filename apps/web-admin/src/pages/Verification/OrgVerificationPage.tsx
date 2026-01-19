import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  decideOrgVerification,
  getOrgVerification,
  initOrgVerification,
  listOrgDocs,
  patchOrgDoc,
  registerOrgDoc
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import ErrorBanner from "../../components/ErrorBanner";
import { formatDateTime } from "../../utils/format";

const DOC_CATEGORIES = [
  "rera",
  "gst",
  "pan",
  "address_proof",
  "firm_registration",
  "authorization_letter",
  "brochure",
  "layout_plan",
  "other"
];

const CHECKLIST_LABELS: Record<string, string> = {
  rera: "RERA",
  firmRegistration: "Firm Registration",
  addressProof: "Address Proof",
  gst: "GST",
  pan: "PAN",
  authorizationLetter: "Authorization Letter"
};

export default function OrgVerificationPage() {
  const { tenantId } = useAuth();
  const { orgType, orgId } = useParams();
  const [verification, setVerification] = useState<any | null>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({
    category: "pan",
    title: "",
    objectPath: "",
    contentType: "",
    sizeBytes: ""
  });
  const [decideForm, setDecideForm] = useState({
    status: "verified",
    notes: "",
    reason: "",
    checklist: {} as Record<string, boolean>
  });
  const [savingDoc, setSavingDoc] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const backHref = useMemo(() => {
    if (orgType === "enterprise") return `/enterprises/${orgId}`;
    return `/agencies/${orgId}`;
  }, [orgType, orgId]);

  const checklistEntries = useMemo(() => {
    const checklist = verification?.checklist || {};
    return Object.keys(CHECKLIST_LABELS).map((key) => ({
      key,
      label: CHECKLIST_LABELS[key],
      value: Boolean(checklist[key])
    }));
  }, [verification]);

  const loadData = async () => {
    if (!tenantId || !orgType || !orgId) return;
    setLoading(true);
    setError(null);
    try {
      let data = await getOrgVerification(tenantId, orgType, orgId);
      if (!data) {
        data = await initOrgVerification(tenantId, orgType, orgId);
      }
      setVerification(data);
      const docsData = await listOrgDocs(tenantId, { orgType, orgId });
      setDocs(docsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load verification");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId || !orgType || !orgId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, orgType, orgId]);

  return (
    <div className="space-y-3">
      <Link to={backHref} className="text-sm text-secondary hover:text-primary">
        ← Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-primary">
          Verification — {orgType} / {orgId}
        </h1>
        <p className="text-sm text-secondary">Verification case and documents.</p>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <StatusBadge tone={toneForStatus(verification?.status || "pending")}>
                {verification?.status || "pending"}
              </StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {checklistEntries.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-md border border-theme px-3 py-2">
                  <span className="text-secondary">{item.label}</span>
                  <span className="text-secondary">{item.value ? "✅" : "❌"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Register Document Metadata</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={docForm.category}
                onChange={(e) => setDocForm((prev) => ({ ...prev, category: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
              >
                {DOC_CATEGORIES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                value={docForm.title}
                onChange={(e) => setDocForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <input
                value={docForm.objectPath}
                onChange={(e) => setDocForm((prev) => ({ ...prev, objectPath: e.target.value }))}
                placeholder="Object path"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <input
                value={docForm.contentType}
                onChange={(e) => setDocForm((prev) => ({ ...prev, contentType: e.target.value }))}
                placeholder="Content type"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <input
                value={docForm.sizeBytes}
                onChange={(e) => setDocForm((prev) => ({ ...prev, sizeBytes: e.target.value }))}
                placeholder="Size bytes"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={async () => {
                if (!tenantId || !orgType || !orgId) return;
                if (!docForm.objectPath.trim()) {
                  setActionError("objectPath is required.");
                  return;
                }
                setSavingDoc(true);
                setActionError(null);
                try {
                  await registerOrgDoc(tenantId, {
                    orgType,
                    orgId,
                    category: docForm.category,
                    objectPath: docForm.objectPath.trim(),
                    title: docForm.title.trim() || undefined,
                    contentType: docForm.contentType.trim() || undefined,
                    sizeBytes: docForm.sizeBytes ? Number(docForm.sizeBytes) : undefined
                  });
                  setDocForm({ category: "pan", title: "", objectPath: "", contentType: "", sizeBytes: "" });
                  await loadData();
                } catch (err: any) {
                  if (err?.status === 403) {
                    setActionError("You don’t have permission to register docs.");
                  } else {
                    setActionError(err.message || "Failed to register doc");
                  }
                } finally {
                  setSavingDoc(false);
                }
              }}
              disabled={savingDoc}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {savingDoc ? "Saving..." : "Register Document"}
            </button>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-surface text-left text-xs font-semibold text-secondary">
                <tr>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Object Path</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Uploaded</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-2 text-secondary">{doc.category}</td>
                    <td className="px-4 py-2 text-secondary">{doc.title || doc.name || "-"}</td>
                    <td className="px-4 py-2 text-secondary font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span>{doc.objectPath}</span>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(doc.objectPath);
                            } catch {
                              setActionError("Copy failed.");
                            }
                          }}
                          className="text-secondary hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-secondary">
                      <StatusBadge tone={toneForStatus(doc.status || "active")}>{doc.status || "active"}</StatusBadge>
                    </td>
                    <td className="px-4 py-2 text-secondary">{formatDateTime(doc.uploadedAt)}</td>
                    <td className="px-4 py-2">
                      {doc.status !== "archived" ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!tenantId) return;
                              setActionError(null);
                              try {
                                await patchOrgDoc(tenantId, doc.id, { status: "archived" });
                                await loadData();
                              } catch (err: any) {
                                if (err?.status === 403) {
                                  setActionError("You don’t have permission to archive docs.");
                                } else {
                                  setActionError(err.message || "Failed to archive doc");
                                }
                              }
                            }}
                            className="text-amber-200 font-semibold hover:underline"
                          >
                            Archive
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
                {docs.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-secondary" colSpan={6}>
                      No docs registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Decide Verification</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={decideForm.status}
                onChange={(e) => setDecideForm((prev) => ({ ...prev, status: e.target.value }))}
                className="rounded-md input-glass px-3 py-2 text-sm"
              >
                <option value="verified">verified</option>
                <option value="rejected">rejected</option>
              </select>
              <input
                value={decideForm.reason}
                onChange={(e) => setDecideForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason (for rejection)"
                className="rounded-md input-glass px-3 py-2 text-sm"
              />
              <textarea
                value={decideForm.notes}
                onChange={(e) => setDecideForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes"
                className="rounded-md input-glass px-3 py-2 text-sm sm:col-span-2"
                rows={3}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.keys(CHECKLIST_LABELS).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-secondary">
                  <input
                    type="checkbox"
                    checked={Boolean(decideForm.checklist[key])}
                    onChange={(e) =>
                      setDecideForm((prev) => ({
                        ...prev,
                        checklist: { ...prev.checklist, [key]: e.target.checked }
                      }))
                    }
                  />
                  {CHECKLIST_LABELS[key]}
                </label>
              ))}
            </div>
            <button
              onClick={async () => {
                if (!tenantId || !orgType || !orgId) return;
                setSavingDecision(true);
                setActionError(null);
                try {
                  const payload: any = {
                    status: decideForm.status,
                    notes: decideForm.notes.trim() || undefined,
                    reason: decideForm.reason.trim() || undefined,
                    checklist: decideForm.checklist
                  };
                  await decideOrgVerification(tenantId, orgType, orgId, payload);
                  await loadData();
                } catch (err: any) {
                  if (err?.status === 403) {
                    setActionError("You don’t have permission to decide verification.");
                  } else {
                    setActionError(err.message || "Failed to decide verification");
                  }
                } finally {
                  setSavingDecision(false);
                }
              }}
              disabled={savingDecision}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {savingDecision ? "Saving..." : "Save Decision"}
            </button>
            {actionError && <div className="text-sm text-rose-600">{actionError}</div>}
          </div>
        </>
      )}
    </div>
  );
}



