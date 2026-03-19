import { ReactNode } from "react";

type DashboardCardTone = "default" | "success" | "warning" | "info";

type DashboardCardProps = {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: DashboardCardTone;
  footer?: ReactNode;
  className?: string;
};

const toneClasses: Record<DashboardCardTone, string> = {
  default: "border-theme bg-surface/70",
  success: "border-emerald-400/30 bg-emerald-50/60",
  warning: "border-amber-400/40 bg-amber-50/60",
  info: "border-sky-400/40 bg-sky-50/60"
};

export default function DashboardCard({
  label,
  value,
  note,
  tone = "default",
  footer,
  className
}: DashboardCardProps) {
  return (
    <div className={`rounded-[20px] border p-4 shadow-sm backdrop-blur-sm ${toneClasses[tone]} ${className ?? ""}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-primary leading-tight">{value}</div>
      {note ? <div className="mt-1 text-sm text-secondary">{note}</div> : null}
      {footer ? <div className="mt-3 text-xs text-muted">{footer}</div> : null}
    </div>
  );
}
