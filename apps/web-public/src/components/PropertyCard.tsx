import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

export type PublicProperty = {
  id: string;
  propertyId?: string;
  title?: string;
  name?: string;
  headline?: string;
  type?: string;
  propertyType?: string;
  isPublished?: boolean;
  location?: {
    city?: string;
    citySlug?: string;
    locality?: string;
    state?: string;
  };
  pricing?: {
    currency?: string;
    amount?: number;
    totalPrice?: number;
    rentPerMonth?: number;
  };
  specs?: {
    land?: { facing?: string | null };
    plot?: { facing?: string | null };
  };
  plotInfo?: { facing?: string | null };
  area?: {
    unit?: string | null;
    value?: number | null;
  };
  media?: {
    hero?: { objectPath?: string | null };
    gallery?: Array<{ objectPath?: string | null }>;
  };
};

type Props = {
  property: PublicProperty;
  heroSignedUrl?: string | null;
  heroObjectPath?: string | null;
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default function PropertyCard({ property, heroSignedUrl, heroObjectPath }: Props) {
  const navigate = useNavigate();
  const heroMissingSigned = Boolean(heroObjectPath) && !heroSignedUrl;
  const price = useMemo(() => {
    const amount = property.pricing?.totalPrice ?? property.pricing?.rentPerMonth ?? property.pricing?.amount;
    if (amount === null || amount === undefined) return null;
    return formatter.format(amount);
  }, [property.pricing?.amount, property.pricing?.rentPerMonth, property.pricing?.totalPrice]);


  const title = property.title || property.name || property.headline || "Untitled";
  const dealLabel = property.type === "rent" ? "For Rent" : "For Sale";
  const propertyLabel = property.propertyType ? formatLabel(property.propertyType) : "Property";
  const locality = [property.location?.locality, property.location?.citySlug].filter(Boolean).join(", ");
  const facing =
    property.specs?.land?.facing ||
    property.plotInfo?.facing ||
    property.specs?.plot?.facing ||
    null;
  const isLand = property.propertyType === "land" || property.propertyType === "plot";
  const areaValue = property.area?.value ? `${property.area.value} ${property.area.unit ?? ""}` : null;
  const bhk = (property as any)?.specs?.flat?.bhk ?? (property as any)?.specs?.house?.bhk ?? null;
  const carpetArea =
    (property as any)?.specs?.flat?.carpetAreaSqFt ??
    (property as any)?.specs?.house?.carpetAreaSqFt ??
    null;
  const floor =
    (property as any)?.specs?.flat?.floor ??
    (property as any)?.specs?.house?.floor ??
    null;
  const bathrooms =
    (property as any)?.specs?.flat?.bathrooms ??
    (property as any)?.specs?.house?.bathrooms ??
    null;
  const roadAccess =
    (property as any)?.landRecord?.roadAccess === true
      ? "Road access"
      : (property as any)?.landRecord?.roadAccess === false
      ? null
      : null;

  if (import.meta.env.DEV && property.isPublished) {
    if (!property.title) {
      console.warn("[property-card] missing title", { listingId: property.id, keys: Object.keys(property) });
    }
    if (!facing) {
      console.warn("[property-card] missing facing", { listingId: property.id, keys: Object.keys(property) });
    }
  }

  const href = `/p/${property.id || property.propertyId}`;

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
      className="group block rounded-2xl card-glass border border-theme bg-surface shadow-sm hover:shadow-md hover:-translate-y-0.5 transition overflow-hidden cursor-pointer"
    >
      <div className="relative w-full h-40 bg-surface">
        {heroSignedUrl ? (
          <img src={heroSignedUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-surface-strong flex items-center justify-center text-[11px] text-muted">
            {heroMissingSigned ? "Image pending (not signed)" : "No photo"}
          </div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center rounded-full bg-surface/90 px-3 py-1 text-[11px] font-semibold text-secondary shadow">
          {dealLabel}
        </div>
        <div className="absolute top-3 right-3 inline-flex items-center rounded-full bg-surface/90 px-3 py-1 text-[11px] font-semibold text-secondary shadow">
          {propertyLabel}
        </div>
        {areaValue && (
          <div className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white shadow">
            {areaValue}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-primary truncate">{title}</div>
          <div className="text-xs text-muted truncate">{locality || "Location pending"}</div>
        </div>

        <div className="flex items-center justify-between text-sm">
          {price ? (
            <div className="text-lg font-semibold text-primary">
              {price}
              {property.type === "rent" && <span className="text-xs font-semibold text-muted"> /mo</span>}
            </div>
          ) : (
            <div className="text-sm font-semibold text-muted">Price on request</div>
          )}
          {facing && (
            <div className="text-xs font-semibold text-secondary">Facing: {formatLabel(facing)}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-secondary">
          {isLand ? (
            <>
              {areaValue && <Chip label={areaValue} />}
              {facing && <Chip label={`Facing ${formatLabel(facing)}`} />}
              {roadAccess && <Chip label={roadAccess} />}
            </>
          ) : (
            <>
              {bhk && <Chip label={`${bhk} BHK`} />}
              {carpetArea && <Chip label={`${carpetArea} sqft`} />}
              {floor !== null && floor !== undefined ? (
                <Chip label={`Floor ${floor}`} />
              ) : bathrooms ? (
                <Chip label={`${bathrooms} Bath`} />
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(href);
            }}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          >
            View Details
          </button>
          <div className="flex items-center gap-2">
            <a
              href="tel:+919000000000"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong hover:text-primary transition"
              onClick={(e) => e.stopPropagation()}
            >
              Call
            </a>
            <a
              href="https://wa.me/919000000000"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong hover:text-primary transition"
              onClick={(e) => e.stopPropagation()}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-1 font-semibold text-[11px] text-secondary">
      {label}
    </span>
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




