import { Link } from "react-router-dom";

type ProjectCardProps = {
  slug: string;
  name: string;
  city?: string;
  area?: string;
  type?: string;
  status?: string;
  priceLabel?: string;
  coverUrl?: string;
};

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  plot: "Plot",
  commercial: "Commercial",
  mixed: "Mixed"
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  under_construction: "Under construction",
  ready: "Ready"
};

export default function ProjectCard({
  slug,
  name,
  city,
  area,
  type,
  status,
  priceLabel,
  coverUrl
}: ProjectCardProps) {
  return (
    <Link to={`/projects/${slug}`} className="group block overflow-hidden rounded-2xl card-glass border border-theme shadow-sm transition hover:-translate-y-0.5">
      <div className="relative h-44 w-full overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-xs text-muted">
            No cover image
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {type && (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
              {TYPE_LABELS[type] || type}
            </span>
          )}
          {status && (
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
              {STATUS_LABELS[status] || status}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="text-base font-semibold text-primary">{name || "Untitled project"}</div>
        <div className="text-sm text-secondary">
          {area && city ? `${area}, ${city}` : city || area || "Location pending"}
        </div>
        <div className="text-sm font-semibold text-primary">{priceLabel || "Price on request"}</div>
      </div>
    </Link>
  );
}
