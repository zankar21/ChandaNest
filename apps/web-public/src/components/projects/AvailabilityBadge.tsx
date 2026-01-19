type Props = { status?: string };

const toneMap: Record<string, string> = {
  available: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
  blocked: "bg-amber-500/20 text-amber-200 border border-amber-500/30",
  sold: "bg-rose-500/20 text-rose-200 border border-rose-500/30"
};

export default function AvailabilityBadge({ status }: Props) {
  const key = (status || "").toLowerCase();
  const classes = toneMap[key] || "bg-surface text-secondary border border-theme";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status || "unknown"}</span>;
}
