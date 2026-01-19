type Props = {
  children: string;
  tone?: "neutral" | "success" | "warning";
};

const tones: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-surface text-secondary",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700"
};

export default function Badge({ children, tone = "neutral" }: Props) {
  const cls = tones[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}





