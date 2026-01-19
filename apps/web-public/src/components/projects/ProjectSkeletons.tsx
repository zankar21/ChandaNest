export function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl card-glass border border-theme shadow-sm animate-pulse">
      <div className="h-44 bg-surface" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 rounded bg-surface" />
        <div className="h-3 w-1/2 rounded bg-surface" />
        <div className="h-4 w-1/3 rounded bg-surface" />
      </div>
    </div>
  );
}

export function ProjectHeroSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="h-72 rounded-2xl card-glass border border-theme animate-pulse" />
      <div className="h-72 rounded-2xl card-glass border border-theme animate-pulse" />
    </div>
  );
}
