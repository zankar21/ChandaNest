export const LEAD_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "site_visit", label: "Site Visit" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closed_won", label: "Closed Won" },
  { key: "closed_lost", label: "Closed Lost" }
] as const;

export type LeadStageKey = (typeof LEAD_STAGES)[number]["key"];

export const STAGE_OPTIONS = LEAD_STAGES.map((stage) => ({
  label: stage.label,
  value: stage.key
}));

export function stageLabel(value?: string) {
  return LEAD_STAGES.find((stage) => stage.key === value)?.label || value || "-";
}

export function priorityTone(value?: string) {
  if (value === "high") return "bg-rose-500/20 text-rose-200 border border-rose-500/40";
  if (value === "medium") return "bg-amber-500/20 text-amber-200 border border-amber-500/40";
  return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40";
}
