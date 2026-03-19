import { formatCount } from "../../lib/dashboard/builderDashboardFormatters";
import { useNavigate } from "react-router-dom";
import type { ProjectInventoryHealth } from "../../lib/dashboard/builderDashboardSelectors";

type Props = {
  projectHealth: ProjectInventoryHealth;
};

export default function ProjectInventoryPanel({ projectHealth }: Props) {
  const navigate = useNavigate();

  const goProjects = (query?: string) =>
    query ? `/projects${query}` : "/projects";

  const capExceeded =
    projectHealth.overProjectCap || projectHealth.overUnitCap;

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Capacity Control
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Project Inventory
          </h3>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Spotlights: {formatCount(projectHealth.spotlightProjects)}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          onClick={() => navigate(goProjects())}
          className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-[2px]"
        >
          <div className="text-xs uppercase text-slate-500">
            Published Projects
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {formatCount(projectHealth.activeProjects)}
          </div>
          <div className="text-sm text-slate-600">
            Live builder offerings
          </div>
        </div>

        <div
          onClick={() => navigate(goProjects())}
          className={`cursor-pointer rounded-xl border p-4 transition hover:-translate-y-[2px]
            ${
              projectHealth.unitUsagePct &&
              projectHealth.unitUsagePct >= 90
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
        >
          <div className="text-xs uppercase text-slate-500">
            Active Units
          </div>
          <div className="mt-1 text-3xl font-semibold text-slate-900">
            {projectHealth.unitCap
              ? `${formatCount(projectHealth.activeUnits)} / ${formatCount(
                  projectHealth.unitCap
                )}`
              : formatCount(projectHealth.activeUnits)}
          </div>
          <div className="text-sm text-slate-600">
            Inventory consumption
          </div>
        </div>
      </div>

      {/* Cap Status (Important Block) */}
      <div
        onClick={() => navigate("/billing")}
        className={`mt-5 cursor-pointer rounded-xl border p-4 transition hover:-translate-y-[2px]
          ${
            capExceeded
              ? "border-rose-300 bg-rose-50"
              : "border-emerald-300 bg-emerald-50"
          }`}
      >
        <div className="text-xs uppercase tracking-wide">
          Plan Capacity Status
        </div>

        <div className="mt-1 text-lg font-semibold">
          {capExceeded ? "Capacity Exceeded" : "Within Limits"}
        </div>

        <div className="text-sm">
          {projectHealth.overProjectCap
            ? "Project limit exceeded"
            : projectHealth.overUnitCap
            ? "Unit limit exceeded"
            : "All usage within plan limits"}
        </div>
      </div>

      {/* Secondary Insights */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">

        <div
          onClick={() => navigate(goProjects("?filter=spotlight"))}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
        >
          <div className="text-xs text-slate-600">Spotlight Projects</div>
          <div className="text-lg font-semibold text-slate-900">
            {formatCount(projectHealth.spotlightProjects)}
          </div>
        </div>

        <div
          onClick={() => navigate(goProjects("?filter=boosted"))}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
        >
          <div className="text-xs text-slate-600">Boosted Units</div>
          <div className="text-lg font-semibold text-slate-900">
            {formatCount(projectHealth.boostedUnits)}
          </div>
        </div>

        <div
          onClick={() => navigate(goProjects("?filter=review"))}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
        >
          <div className="text-xs text-slate-600">Needs Review</div>
          <div className="text-sm font-semibold text-blue-600">
            Open Projects →
          </div>
        </div>
      </div>
    </section>
  );
}
