import { useNavigate } from "react-router-dom";
import type { HeroMetric } from "../../lib/dashboard/builderDashboardSelectors";
import { formatCount } from "../../lib/dashboard/builderDashboardFormatters";

type KPIGridProps = {
  metrics: HeroMetric[];
};

const accentClasses: Record<string, string> = {
  success: "border-emerald-300 bg-emerald-50/90",
  info: "border-sky-300 bg-sky-50/90",
  warning: "border-amber-300 bg-amber-50/90"
};

function normalizeIcon(icon: unknown) {
  if (typeof icon !== "string") return "";
  const value = icon.trim();
  if (!value || value === "??") return "";
  return value;
}

function getPriorityClass(metric: HeroMetric, index: number) {
  const label = metric.label.toLowerCase();

  if (label.includes("needs attention")) {
    return "ring-1 ring-amber-300/70 shadow-[0_12px_30px_rgba(245,158,11,0.10)]";
  }

  if (label.includes("live listings")) {
    return "shadow-[0_10px_26px_rgba(16,185,129,0.08)]";
  }

  if (label.includes("leads")) {
    return "shadow-[0_10px_26px_rgba(56,189,248,0.08)]";
  }

  if (index === 0) {
    return "shadow-[0_10px_26px_rgba(15,23,42,0.06)]";
  }

  return "shadow-[0_8px_22px_rgba(15,23,42,0.05)]";
}

export default function KPIGrid({ metrics }: KPIGridProps) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Performance Snapshot
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900">
            Core business metrics
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric, index) => {
          const accent = metric.tone ? accentClasses[metric.tone] : "border-slate-200 bg-slate-50/80";
          const icon = normalizeIcon(metric.icon);
          const valueText =
            metric.limit != null
              ? `${formatCount(metric.value)} / ${formatCount(metric.limit)}`
              : formatCount(metric.value);

          const action = metric.action;

          return (
            <div
              key={`${metric.label}-${index}`}
              role={action ? "button" : undefined}
              tabIndex={action ? 0 : undefined}
              aria-label={action?.ariaLabel}
              onClick={action ? () => navigate(action.to) : undefined}
              onKeyDown={
                action
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(action.to);
                      }
                    }
                  : undefined
              }
              className={[
                "group rounded-[18px] border px-4 py-4 transition",
                accent,
                getPriorityClass(metric, index),
                metric.action
                  ? "cursor-pointer hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.10)]"
                  : ""
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {metric.label}
                </div>
                {icon ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-[11px] text-slate-600"
                  >
                    {icon}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 text-4xl font-semibold leading-none tracking-tight text-slate-900">
                {valueText}
              </div>

              <div className="mt-3 text-sm leading-6 text-slate-600">
                {metric.detail}
              </div>

              {metric.action ? (
                <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition group-hover:text-slate-700">
                  Open →
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
