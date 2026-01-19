import type { ReactNode } from "react";

type Tone = "gray" | "green" | "red" | "yellow" | "blue" | "purple";

const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-surface text-secondary border border-theme",
  green: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
  red: "bg-rose-500/15 text-rose-200 border border-rose-500/30",
  yellow: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
  blue: "bg-blue-500/15 text-blue-200 border border-blue-500/30",
  purple: "bg-purple-500/15 text-purple-200 border border-purple-500/30"
};

export function toneForStatus(status?: string): Tone {
  const value = (status || "").toLowerCase();
  if (["published", "verified", "active", "available"].includes(value)) return "green";
  if (["pending", "review", "hold", "booked"].includes(value)) return "yellow";
  if (["rejected", "revoked", "lost"].includes(value)) return "red";
  if (["draft", "unpublished", "inactive"].includes(value)) return "gray";
  if (["approved"].includes(value)) return "blue";
  return "purple";
}

export default function StatusBadge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}


