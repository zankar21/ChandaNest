import { useNavigate } from "react-router-dom";
import type { RecommendedAction } from "../../lib/dashboard/builderDashboardSelectors";

type SmartInsightsPanelProps = {
  actions: RecommendedAction[];
};

function getToneStyles(tone?: string) {
  if (tone === "warning") {
    return {
      dot: "bg-amber-400",
      card: "border-amber-300 bg-amber-50/80"
    };
  }

  if (tone === "info") {
    return {
      dot: "bg-sky-400",
      card: "border-sky-300 bg-sky-50/80"
    };
  }

  return {
    dot: "bg-slate-300",
    card: "border-slate-200 bg-slate-50/80"
  };
}

export default function SmartInsightsPanel({ actions }: SmartInsightsPanelProps) {
  const navigate = useNavigate();

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Smart Insights
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Recommended actions</h3>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action, index) => {
          const styles = getToneStyles(action.tone);

          return (
            <div
              key={action.title}
              role={action.action ? "button" : undefined}
              tabIndex={action.action ? 0 : undefined}
              onClick={action.action ? () => navigate(action.action!.to) : undefined}
              onKeyDown={
                action.action
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(action.action!.to);
                      }
                    }
                  : undefined
              }
              className={[
                "rounded-2xl border p-4 transition",
                styles.card,
                action.action
                  ? "cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  : ""
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 rounded-full ${styles.dot}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {index === 0 ? "Top Priority" : "Recommendation"}
                  </div>
                  <div className="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {action.title}
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                    {action.value}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">
                    {action.detail}
                  </div>

                  {action.action ? (
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Open →
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
