import type { ReactNode } from "react";
import { formatCount } from "../../lib/dashboard/builderDashboardFormatters";
import { useNavigate } from "react-router-dom";
import type {
  LeadPipelineSummary,
  TeamOperationsSummary
} from "../../lib/dashboard/builderDashboardSelectors";

type TeamCapacityPanelProps = {
  teamOperations: TeamOperationsSummary;
  leadPipeline: LeadPipelineSummary;
};

function SurfaceStat({
  label,
  value,
  note,
  tone = "default",
  onActivate
}: {
  label: string;
  value: ReactNode;
  note?: string;
  tone?: "default" | "info" | "warning" | "success";
  onActivate?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50/80"
      : tone === "warning"
      ? "border-amber-300 bg-amber-50/80"
      : tone === "info"
      ? "border-sky-300 bg-sky-50/80"
      : "border-slate-200 bg-slate-50/80";

  return (
    <div
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      className={[
        "rounded-2xl border p-4 transition",
        toneClass,
        onActivate ? "cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]" : ""
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {note ? <div className="mt-1 text-sm text-slate-600">{note}</div> : null}
    </div>
  );
}

export default function TeamCapacityPanel({
  teamOperations,
  leadPipeline
}: TeamCapacityPanelProps) {
  const navigate = useNavigate();

  const seatsUsed = teamOperations.seatsUsed ?? 0;
  const seatLimit = teamOperations.seatLimit;
  const seatUsagePct = teamOperations.seatUsagePct;
  const pendingInvites = (teamOperations as any).pendingInvites ?? 0;
  const leadsAssigned = leadPipeline.stages?.contacted ?? 0;

  const seatTone =
    seatUsagePct != null && seatUsagePct >= 90
      ? "warning"
      : seatUsagePct != null && seatUsagePct > 0
      ? "info"
      : "default";

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Team & Capacity
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Org readiness</h3>
        </div>

        <div className="text-xs text-slate-500">
          {seatUsagePct != null ? `${seatUsagePct}% capacity used` : "Capacity tracking active"}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <SurfaceStat
          label="Seats Used"
          value={seatLimit ? `${formatCount(seatsUsed)} / ${formatCount(seatLimit)}` : formatCount(seatsUsed)}
          note={seatUsagePct != null ? `${seatUsagePct}% of cap` : "Flexible seats"}
          tone={seatTone as "default" | "info" | "warning" | "success"}
          onActivate={() => navigate("/team")}
        />

        <SurfaceStat
          label="Active Users"
          value={formatCount(seatsUsed)}
          note="Seats currently active"
          tone="success"
          onActivate={() => navigate("/team")}
        />

        <SurfaceStat
          label="Pending Invites"
          value={formatCount(pendingInvites)}
          note="Track from the Team page"
          tone={pendingInvites > 0 ? "warning" : "default"}
          onActivate={() => navigate("/team")}
        />

        <SurfaceStat
          label="Leads Assigned"
          value={formatCount(leadsAssigned)}
          note="In contact / follow-up"
          tone={leadsAssigned > 0 ? "info" : "default"}
          onActivate={() => navigate("/leads")}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Team Health
        </div>
        <div className="mt-2 text-base font-semibold text-slate-900">
          {pendingInvites > 0
            ? "There are pending team invites to complete."
            : "Your core team setup looks healthy."}
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Review access, seat utilization, and follow-up ownership to keep operations smooth.
        </div>
      </div>
    </section>
  );
}
