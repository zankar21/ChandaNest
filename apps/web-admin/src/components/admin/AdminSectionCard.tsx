import type { ReactNode } from "react";

type AdminSectionCardProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export default function AdminSectionCard({
  title,
  subtitle,
  actions,
  className,
  children
}: AdminSectionCardProps) {
  return (
    <section className={`rounded-[24px] card-glass border border-theme p-6 shadow-[0_18px_48px_rgba(15,23,42,0.10)] ${className ?? ""}`}>
      {title || subtitle || actions ? (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <div className="text-lg font-semibold text-primary">{title}</div> : null}
            {subtitle ? <div className="mt-1 text-sm leading-6 text-secondary">{subtitle}</div> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
