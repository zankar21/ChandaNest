type Props = {
  title: string;
  priceLabel?: string;
  city?: string;
  area?: string;
  thumbUrl?: string;
  href: string;
  kind: "property" | "project";
};

export default function MarkerPopupCard({ title, priceLabel, city, area, thumbUrl, href, kind }: Props) {
  return (
    <div className="w-64 rounded-2xl border border-theme bg-surface/90 p-3 text-xs text-secondary shadow-lg">
      <div className="flex gap-3">
        <div className="h-14 w-16 overflow-hidden rounded-xl border border-theme bg-surface-strong">
          {thumbUrl ? (
            <img src={thumbUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted">{kind === "property" ? "Property" : "Project"}</div>
          <div className="text-sm font-semibold text-primary line-clamp-2">{title}</div>
          <div className="text-xs text-secondary">{[area, city].filter(Boolean).join(", ") || "Location pending"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-primary">{priceLabel || "Price on request"}</div>
        <div className="flex items-center gap-2">
          <a href={href} className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-secondary">
            View
          </a>
          <a
            href={`${href}?enquire=1&source=map`}
            className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Enquire
          </a>
        </div>
      </div>
    </div>
  );
}
