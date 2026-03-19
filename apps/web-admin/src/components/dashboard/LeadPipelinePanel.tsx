import { formatCount, formatPercent } from "../../lib/dashboard/builderDashboardFormatters";
import { useNavigate } from "react-router-dom";
import type { LeadPipelineSummary } from "../../lib/dashboard/builderDashboardSelectors";

type Props = {
  leadPipeline: LeadPipelineSummary;
};

const StageBar = ({
  stage,
  value,
  total
}: {
  stage: string;
  value: number;
  total: number;
}) => {
  const width = total ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-slate-600">
          {stage.replace(/_/g, " ")}
        </span>
        <span className="font-semibold text-slate-900">
          {formatCount(value)}
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

export default function LeadPipelinePanel({ leadPipeline }: Props) {
  const navigate = useNavigate();

  const hasLeads = leadPipeline.total > 0;
  const unassignedHigh = leadPipeline.unassigned > 0;

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Revenue Engine
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Lead Pipeline
          </h3>
        </div>

        <div className="text-xs text-slate-500">
          {Object.keys(leadPipeline.stages).length} stages
        </div>
      </div>

      {/* KPI Row */}
      <div className="mt-4 grid grid-cols-3 gap-3">

        {/* Total Leads */}
        <div
          onClick={() => navigate("/leads")}
          className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 text-center hover:-translate-y-[2px]"
        >
          <div className="text-xs text-slate-500 uppercase">Total Leads</div>
          <div className="text-2xl font-semibold text-slate-900">
            {formatCount(leadPipeline.total)}
          </div>
          <div className="text-xs text-slate-600">Last 30 days</div>
        </div>

        {/* Conversion */}
        <div
          onClick={() => navigate("/leads")}
          className="cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center hover:-translate-y-[2px]"
        >
          <div className="text-xs text-emerald-700 uppercase">Conversion</div>
          <div className="text-2xl font-semibold text-emerald-900">
            {formatPercent(leadPipeline.conversionPct)}
          </div>
          <div className="text-xs text-emerald-700">Closed share</div>
        </div>

        {/* Unassigned */}
        <div
          onClick={() => navigate("/leads?filter=unassigned")}
          className={`cursor-pointer rounded-xl border p-4 text-center hover:-translate-y-[2px]
            ${
              unassignedHigh
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
        >
          <div className="text-xs uppercase">Unassigned</div>
          <div className="text-2xl font-semibold">
            {formatCount(leadPipeline.unassigned)}
          </div>
          <div className="text-xs">
            {unassignedHigh ? "Needs action" : "All assigned"}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="mt-5">
        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Funnel Flow
        </div>

        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {Object.entries(leadPipeline.stages).length > 0 ? (
            Object.entries(leadPipeline.stages).map(([stage, value]) => (
              <StageBar
                key={stage}
                stage={stage}
                value={value}
                total={leadPipeline.total}
              />
            ))
          ) : (
            <div className="text-sm text-slate-600">
              No stage data available
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasLeads && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No leads yet. Publish listings or projects to start receiving inquiries.
        </div>
      )}
    </section>
  );
}
