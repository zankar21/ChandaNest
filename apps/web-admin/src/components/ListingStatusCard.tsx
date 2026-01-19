import { useMemo } from "react";
import { ChecklistItem } from "../utils/propertyValidation";

type Props = {
  property: any;
  isClientAdmin: boolean;
  checklist: ChecklistItem[];
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  busy?: boolean;
  onChecklistClick?: (scrollToId: string) => void;
};

export default function ListingStatusCard({
  property,
  isClientAdmin,
  checklist,
  onSubmit,
  onApprove,
  onReject,
  onPublish,
  onUnpublish,
  busy,
  onChecklistClick
}: Props) {
  const workflowStatus = property?.moderation?.verificationStatus || "draft";
  const visibility = property?.listing?.visibility || "private";
  const rejectionReason = property?.moderation?.rejectionReason || null;
  const requiredAction = property?.moderation?.requiredAction || null;
  const lastUpdated =
    property?.meta?.updatedAt || property?.updatedAt || property?.moderation?.updatedAt || property?.listing?.updatedAt;

  const actionConfig = useMemo(() => {
    if (!isClientAdmin) return null;
    if (workflowStatus === "draft") return { primary: "submit" };
    if (workflowStatus === "submitted") return { approveReject: true };
    if (workflowStatus === "rejected") return { primary: "resubmit" };
    if (workflowStatus === "approved") {
      if (visibility === "published") return { unpublish: true };
      return { publish: true };
    }
    return null;
  }, [workflowStatus, visibility, isClientAdmin]);

  const publicBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || "https://chandanest.com";
  const publicLink = `${publicBaseUrl}/p/${property?.id || property?.propertyId || ""}`;

  return (
    <div className="rounded-xl border border-theme card-glass p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">Listing status</div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
            <Badge label={`Workflow: ${workflowStatus}`} />
            <Badge label={`Visibility: ${visibility}`} />
            {requiredAction && <Badge label={`Required: ${requiredAction}`} tone="amber" />}
            {lastUpdated && (
              <span className="text-xs text-muted">
                Updated {new Date(lastUpdated).toLocaleString(undefined, { hour12: true })}
              </span>
            )}
          </div>
        </div>
        {visibility === "published" && (
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-4 py-2 text-sm font-semibold"
          >
            View Public Listing
          </a>
        )}
      </div>

      {rejectionReason && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          Rejection reason: {rejectionReason}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-primary">Checklist</div>
          <ul className="space-y-1 text-sm">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <span className={item.ok ? "text-emerald-600" : "text-rose-600"}>{item.ok ? "✅" : "❌"}</span>
                <button
                  type="button"
                  className="text-left text-primary hover:text-indigo-300"
                  onClick={() => onChecklistClick?.(item.scrollToId)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2">
          {actionConfig && (
            <div className="flex flex-wrap gap-2">
              {actionConfig.primary === "submit" && (
                <button
                  onClick={onSubmit}
                  disabled={busy}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  Submit for Review
                </button>
              )}
              {actionConfig.primary === "resubmit" && (
                <button
                  onClick={onSubmit}
                  disabled={busy}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  Resubmit
                </button>
              )}
              {actionConfig.approveReject && (
                <>
                  <button
                    onClick={onApprove}
                    disabled={busy}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={onReject}
                    disabled={busy}
                    className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    Reject
                  </button>
                </>
              )}
              {actionConfig.publish && (
                <button
                  onClick={onPublish}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  Publish
                </button>
              )}
              {actionConfig.unpublish && (
                <button
                  onClick={onUnpublish}
                  disabled={busy}
                  className="btn-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Unpublish
                </button>
              )}
            </div>
          )}
          {!actionConfig && (
            <div className="text-sm text-secondary">No actions available for this role/status.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ label, tone = "slate" }: { label: string; tone?: "slate" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-surface text-secondary border border-theme",
    amber: "bg-amber-500/15 text-amber-200 border border-amber-500/30"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}



