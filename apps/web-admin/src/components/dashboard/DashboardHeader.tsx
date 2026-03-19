import { Link } from "react-router-dom";

type HeaderAction = {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
};

type DashboardHeaderProps = {
  tenantName?: string | null;
  planLabel?: string | null;
  planStatus?: string | null;
  actions: HeaderAction[];
};

function getStatusTone(planStatus?: string | null) {
  const value = String(planStatus || "").toLowerCase();

  if (["active", "live", "healthy"].includes(value)) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "warning"].includes(value)) {
    return "border-amber-300 bg-amber-50 text-amber-700";
  }

  if (["expired", "failed", "inactive", "halted"].includes(value)) {
    return "border-rose-300 bg-rose-50 text-rose-700";
  }

  return "border-slate-300 bg-slate-50 text-slate-600";
}

export default function DashboardHeader({
  tenantName,
  planLabel,
  planStatus,
  actions
}: DashboardHeaderProps) {
  const statusTone = getStatusTone(planStatus);
  const primaryActions = actions.slice(0, 4);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-theme bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(28,37,61,0.92))] px-6 py-6 shadow-[0_26px_80px_rgba(0,0,0,0.14)] md:px-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.10),transparent_26%)]" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-5">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            Enterprise Command Center
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">
              Dashboard
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
              Monitor listings, projects, leads, team readiness, and plan usage from one premium workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Tenant
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {tenantName || "Tenant"}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                Active Plan
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                {planLabel || "Builder Enterprise Monthly"}
              </div>
            </div>

            {planStatus ? (
              <div className={`rounded-2xl border px-4 py-3 ${statusTone}`}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  Status
                </div>
                <div className="mt-1 text-base font-semibold capitalize">
                  {planStatus}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full max-w-[560px] rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Quick Actions
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {primaryActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={[
                  "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                  action.variant === "primary"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                ].join(" ")}
              >
                {action.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Workspace Hint
              </div>
              <div className="mt-1 text-sm text-slate-200">
                Keep listings and projects active to improve lead flow.
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-white/10"
            >
              More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}