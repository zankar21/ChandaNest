type AdminStepTab = {
  label: string;
  detail?: string;
};

type AdminStepTabsProps = {
  steps: AdminStepTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export default function AdminStepTabs({ steps, activeIndex, onSelect }: AdminStepTabsProps) {
  return (
    <div className="rounded-[24px] card-glass border border-theme p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const past = index < activeIndex;

          return (
            <button
              key={`${index}-${step.label}`}
              type="button"
              onClick={() => onSelect(index)}
              className={[
                "rounded-2xl border px-4 py-3 text-left transition",
                active
                  ? "border-amber-400/50 bg-amber-500/10 shadow-[0_12px_28px_rgba(176,141,87,0.18)]"
                  : past
                  ? "border-theme bg-surface hover:bg-surface-strong"
                  : "border-theme bg-transparent hover:bg-surface"
              ].join(" ")}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Step {index + 1}
              </div>
              <div className={`mt-1 text-sm font-semibold ${active ? "text-primary" : "text-secondary"}`}>
                {step.label}
              </div>
              <div className="mt-1 min-h-[18px] text-[11px] text-muted">{step.detail ?? ""}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
