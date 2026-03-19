import { formatCount } from "../../lib/dashboard/builderDashboardFormatters";
import { DocumentLockerPlanEntitlement } from "../../lib/documentLockerEntitlements";
import { useNavigate } from "react-router-dom";
import type { ProjectInventoryHealth } from "../../lib/dashboard/builderDashboardSelectors";

type PlanUsagePanelProps = {
  listingUsage: number;
  listingLimit?: number | null;
  featuredUsage: number;
  featuredLimit?: number | null;
  projectHealth: ProjectInventoryHealth;
  documentLocker: DocumentLockerPlanEntitlement;
};

function UsageCard({
  label,
  value,
  limit,
  tone = "default",
  helper,
  onActivate
}: {
  label: string;
  value: number;
  limit?: number | null;
  tone?: "default" | "success" | "warning" | "info";
  helper?: string;
  onActivate?: () => void;
}) {
  const percent =
    typeof limit === "number" && limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : null;

  const valueText =
    typeof limit === "number" ? `${formatCount(value)} / ${formatCount(limit)}` : formatCount(value);

  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50/80"
      : tone === "warning"
      ? "border-amber-300 bg-amber-50/80"
      : tone === "info"
      ? "border-sky-300 bg-sky-50/80"
      : "border-slate-200 bg-slate-50/80";

  const barClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
      ? "bg-amber-500"
      : tone === "info"
      ? "bg-sky-500"
      : "bg-indigo-500";

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
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </div>
        <div className="text-xs font-semibold text-slate-500">
          {percent != null ? `${percent}%` : "Unlimited"}
        </div>
      </div>

      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {valueText}
      </div>

      {helper ? <div className="mt-1 text-sm text-slate-600">{helper}</div> : null}

      {percent != null ? (
        <div className="mt-3 h-2 rounded-full bg-white/70">
          <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <div className="mt-3 h-2 rounded-full bg-white/70">
          <div className={`h-2 rounded-full ${barClass}`} style={{ width: "26%" }} />
        </div>
      )}
    </div>
  );
}

function StaticUsageBox({
  label,
  value,
  helper,
  action
}: {
  label: string;
  value: string;
  helper?: string;
  action?: () => void;
}) {
  return (
    <div
      role={action ? "button" : undefined}
      tabIndex={action ? 0 : undefined}
      onClick={action}
      onKeyDown={
        action
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                action();
              }
            }
          : undefined
      }
      className={[
        "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition",
        action ? "cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]" : ""
      ].join(" ")}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {helper ? <div className="mt-1 text-sm text-slate-600">{helper}</div> : null}
    </div>
  );
}

export default function PlanUsagePanel({
  listingUsage,
  listingLimit,
  featuredUsage,
  featuredLimit,
  projectHealth,
  documentLocker
}: PlanUsagePanelProps) {
  const navigate = useNavigate();

  const listingTone =
    typeof listingLimit === "number" && listingLimit > 0 && listingUsage / listingLimit >= 0.9
      ? "warning"
      : "success";

  const featuredTone =
    typeof featuredLimit === "number" && featuredLimit > 0 && featuredUsage / featuredLimit >= 0.9
      ? "warning"
      : "info";

  const docValue = documentLocker.enabled
    ? documentLocker.documentLimit == null
      ? "Unlimited"
      : `${formatCount(documentLocker.documentLimit)} docs`
    : "Locked";

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Plan & Entitlements
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Usage overview</h3>
      </div>

      <div className="mt-4 space-y-4">
        <UsageCard
          label="Listings"
          value={listingUsage}
          limit={listingLimit}
          tone={listingTone as "success" | "warning"}
          helper="Current listing consumption"
          onActivate={() => navigate("/listings")}
        />

        <UsageCard
          label="Featured"
          value={featuredUsage}
          limit={featuredLimit}
          tone={featuredTone as "info" | "warning"}
          helper="Premium visibility usage"
          onActivate={() => navigate("/listings?filter=featured")}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <StaticUsageBox
            label="Projects Cap"
            value={projectHealth.projectCap != null ? formatCount(projectHealth.projectCap) : "Unlimited"}
            helper="Configured project allowance"
            action={() => navigate("/projects")}
          />
          <StaticUsageBox
            label="Units Cap"
            value={projectHealth.unitCap != null ? formatCount(projectHealth.unitCap) : "Unlimited"}
            helper="Configured unit allowance"
            action={() => navigate("/projects")}
          />
        </div>

        <StaticUsageBox
          label="Documents"
          value={docValue}
          helper={documentLocker.enabled ? "Access granted" : "Upgrade for document locker access"}
          action={() => navigate("/documents")}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Growth Signal
          </div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {typeof listingLimit === "number" && listingLimit > 0 && listingUsage / listingLimit >= 0.9
              ? "Your listing capacity is nearing its limit."
              : "Your current plan still has room to scale."}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Review entitlements regularly to avoid friction when listings, featured slots, or documents increase.
          </div>
        </div>
      </div>
    </section>
  );
}
