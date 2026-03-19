import type { ReactNode } from "react";

type HeroStat = {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "info";
};

type AdminWorkspaceHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: HeroStat[];
  actions?: ReactNode;
  aside?: ReactNode;
};

function getToneClass(tone?: HeroStat["tone"]) {
  if (tone === "success") return "border-emerald-400/20 bg-emerald-500/10";
  if (tone === "warning") return "border-amber-400/20 bg-amber-500/10";
  if (tone === "info") return "border-sky-400/20 bg-sky-500/10";
  return "border-white/10 bg-white/5";
}

export default function AdminWorkspaceHero({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
  aside
}: AdminWorkspaceHeroProps) {
  return (
    <section className="rounded-[30px] border border-theme bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(25,35,58,0.92))] px-6 py-7 shadow-[0_26px_80px_rgba(0,0,0,0.14)] md:px-8">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
            {eyebrow}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-base leading-8 text-slate-200">{description}</p>
          </div>
          {stats.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border p-4 backdrop-blur-sm ${getToneClass(stat.tone)}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {actions ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                Workspace Actions
              </div>
              <div className="mt-3 flex flex-wrap gap-3">{actions}</div>
            </div>
          ) : null}

          {aside ? (
            <div className="rounded-[24px] border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
