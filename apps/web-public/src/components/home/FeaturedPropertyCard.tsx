import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { PublicProperty } from "../PropertyCard";

type Props = {
  property: PublicProperty;
  heroUrl?: string | null;
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default function FeaturedPropertyCard({ property, heroUrl }: Props) {
  const navigate = useNavigate();
  const title = property.title || property.name || property.headline || "Untitled";
  const dealLabel = property.type === "rent" ? "For Rent" : "For Sale";
  const propertyLabel = property.propertyType ? formatLabel(property.propertyType) : "Property";
  const location = [property.location?.locality, property.location?.citySlug, property.location?.city]
    .filter(Boolean)
    .join(", ");
  const href = `/p/${property.id || property.propertyId}`;

  const price = useMemo(() => {
    const amount = property.pricing?.totalPrice ?? property.pricing?.rentPerMonth ?? property.pricing?.amount;
    if (amount === null || amount === undefined) return null;
    return formatter.format(amount);
  }, [property.pricing?.amount, property.pricing?.rentPerMonth, property.pricing?.totalPrice]);

  const isLand = property.propertyType === "land" || property.propertyType === "plot";
  const areaValue = property.area?.value ? `${property.area.value} ${property.area.unit ?? ""}`.trim() : null;
  const bhk = (property as any)?.specs?.flat?.bhk ?? (property as any)?.specs?.house?.bhk ?? null;
  const floor =
    (property as any)?.specs?.flat?.floor ??
    (property as any)?.specs?.house?.floor ??
    null;
  const carpetArea =
    (property as any)?.specs?.flat?.carpetAreaSqFt ??
    (property as any)?.specs?.house?.carpetAreaSqFt ??
    null;
  const isVerified =
    (property as any)?.ownerKycStatus === "verified" || (property as any)?.kycVerified === true;

  const featureChips = [];
  if (isLand) {
    if (areaValue) featureChips.push(areaValue);
  } else {
    if (bhk) featureChips.push(`${bhk} BHK`);
    if (carpetArea) featureChips.push(`${carpetArea} sqft`);
    if (floor !== null && floor !== undefined) featureChips.push(`Floor ${floor}`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(href);
        }
      }}
      className="group rounded-3xl border border-white/10 bg-surface/40 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)] overflow-hidden cursor-pointer"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-900/70">
        {heroUrl ? (
          <img src={heroUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/70 via-slate-900/80 to-black/80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.2),transparent_0)] [background-size:24px_24px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(99,102,241,0.18),transparent_55%)]" />
            <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-white/80">
              No photo
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
            {dealLabel}
          </span>
          {isVerified && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
              Verified
            </span>
          )}
        </div>
        <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white">
          {propertyLabel}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-primary line-clamp-1">{title}</div>
          <div className="text-xs text-muted line-clamp-1">{location || "Location pending"}</div>
        </div>

        <div className="flex items-center justify-between">
          {price ? (
            <div className="text-xl font-semibold text-primary">
              {price}
              {property.type === "rent" && <span className="text-xs text-muted"> /mo</span>}
            </div>
          ) : (
            <div className="text-sm font-semibold text-muted">Price on request</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-secondary">
          {featureChips.slice(0, 3).map((chip) => (
            <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold">
              {chip}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(href);
            }}
            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            View Details
          </button>
          <div className="flex items-center gap-2">
            <a
              href="tel:+919000000000"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-secondary transition duration-200 ease-out hover:border-white/30 hover:text-primary md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto"
              aria-label="Call"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2c-8 0-14-6-14-14a2 2 0 0 1 2-2z" />
              </svg>
            </a>
            <a
              href="https://wa.me/919000000000"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-secondary transition duration-200 ease-out hover:border-white/30 hover:text-primary md:opacity-0 md:translate-y-1 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto"
              aria-label="WhatsApp"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 20l1.2-3.6A8 8 0 1 1 20 12a8 8 0 0 1-8 8H5z" />
                <path d="M9 10c0 2 3 5 5 5l1-1 2 1 1-2-2-1-1 1c-1 0-2-1-2-2l1-1-1-2-2 1 1 1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatLabel(input: string) {
  return input
    .toString()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
