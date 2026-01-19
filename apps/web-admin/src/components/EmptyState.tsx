import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-theme bg-surface p-6 text-center">
      <div className="text-sm font-semibold text-primary">{title}</div>
      {description && <div className="mt-1 text-sm text-secondary">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}


