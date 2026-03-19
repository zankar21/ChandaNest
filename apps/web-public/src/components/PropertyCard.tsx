import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UnifiedResultItem } from "../services/apiClient";
import {
  formatPropertyTypeLabel,
  formatDealIntentLabel,
  getDisplayPriceLabel,
  getListingDealIntent,
  getPrimaryAreaLabel
} from "../modules/listings/truth";

export type PublicProperty = {
  id: string;
  propertyId?: string;
  title?: string;
  name?: string;
  headline?: string;
  dealIntent?: string;
  publishState?: string;
  propertyType?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  location?: {
    city?: string;
    citySlug?: string;
    locality?: string;
    state?: string;
  };
  saleDetails?: { totalPrice?: number; priceAmount?: number; priceOnRequest?: boolean; previousPrice?: number };
  rentalDetails?: { pricing?: { monthlyRent?: number; rentPerBed?: number } };
  specs?: {
    land?: { facing?: string | null };
    plot?: { facing?: string | null };
    flat?: { bhk?: number | null; carpetAreaSqFt?: number | null; bathrooms?: number | null };
    house?: { bhk?: number | null; carpetAreaSqFt?: number | null; bathrooms?: number | null };
    commercial?: {
      carpetSqFt?: number | null;
      builtUpSqFt?: number | null;
      saleableSqFt?: number | null;
      fitOutStatus?: string | null;
    };
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
  property: PublicProperty | UnifiedResultItem;
  heroSignedUrl?: string | null;
  heroObjectPath?: string | null;
};

const WISHLIST_KEY = "cn_public_wishlist";
const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export default function PropertyCard({ property, heroSignedUrl, heroObjectPath }: Props) {
  const navigate = useNavigate();
  const isUnifiedItem = (property as UnifiedResultItem).resultType === "project_unit" || (property as UnifiedResultItem).resultType === "property";
  const isUnifiedUnit = (property as UnifiedResultItem).resultType === "project_unit";
  const unified = isUnifiedItem ? (property as UnifiedResultItem) : undefined;
  const listing = !isUnifiedItem ? (property as PublicProperty) : null;
  const heroMissingSigned = Boolean(heroObjectPath) && !heroSignedUrl;
  const [wishlisted, setWishlisted] = useState(false);

  const itemId = (unified?.id ?? listing?.id ?? listing?.propertyId ?? "").toString();
  const title = isUnifiedItem
    ? unified?.title || "Untitled"
    : listing?.title || listing?.name || listing?.headline || "Untitled";
  const projectName = isUnifiedUnit ? unified?.projectName ?? null : null;
  const unitBase = unified?.projectSlug || unified?.projectId || "";
  const href = isUnifiedUnit
    ? unitBase
      ? `/projects/${unitBase}/units?unitId=${encodeURIComponent(unified?.unitId || unified?.id || "")}`
      : "/projects"
    : `/p/${itemId}`;
  const dealLabel = isUnifiedUnit
    ? "In Project"
    : formatDealIntentLabel(isUnifiedItem ? unified?.dealIntent : listing?.dealIntent);
  const propertyLabel = isUnifiedItem
    ? unified?.propertyType
      ? formatPropertyTypeLabel(unified?.propertyType || "")
      : "Property"
    : listing?.propertyType
      ? formatPropertyTypeLabel(listing.propertyType)
      : "Property";
  const unifiedAvailability = unified?.availability;
  const locality = isUnifiedItem
    ? [unified?.locality, unified?.citySlug].filter(Boolean).join(", ")
    : [listing?.location?.locality, listing?.location?.citySlug].filter(Boolean).join(", ");
  const areaValue = isUnifiedItem
    ? unified?.areaLabel || (typeof unified?.areaValue === "number" ? `${unified.areaValue} ${unified.areaUnit || ""}`.trim() : null)
    : getPrimaryAreaLabel(listing);
  const bhk = isUnifiedItem ? unified?.bhk ?? null : listing?.specs?.flat?.bhk ?? listing?.specs?.house?.bhk ?? null;
  const carpetArea = listing?.specs?.flat?.carpetAreaSqFt ?? listing?.specs?.house?.carpetAreaSqFt ?? null;
  const commercialArea =
    listing?.specs?.commercial?.carpetSqFt ??
    listing?.specs?.commercial?.builtUpSqFt ??
    listing?.specs?.commercial?.saleableSqFt ??
    null;
  const commercialFitOut = listing?.specs?.commercial?.fitOutStatus ?? null;
  const bathrooms = listing?.specs?.flat?.bathrooms ?? listing?.specs?.house?.bathrooms ?? null;
  const facing = isUnifiedItem
    ? unified?.facing ?? null
    : listing?.specs?.land?.facing || listing?.plotInfo?.facing || listing?.specs?.plot?.facing || null;
  const imageCount = Math.max(
    1,
    listing?.media?.gallery?.filter((item) => Boolean(item?.objectPath)).length || 0
  );
  const isVerified =
    (property as any)?.ownerKycStatus === "verified" || (property as any)?.kycVerified === true;
  const isNew = isRecent(listing?.createdAt || listing?.updatedAt || unified?.updatedAt || undefined);
  const hasPriceDrop = typeof listing?.saleDetails?.previousPrice === "number" && typeof listing?.saleDetails?.totalPrice === "number"
    ? listing.saleDetails.previousPrice > listing.saleDetails.totalPrice
    : false;
  const contactPhone = getListingContactPhone(property);
  const whatsappHref = contactPhone ? `https://wa.me/${contactPhone}` : null;
  const callHref = contactPhone ? `tel:+${contactPhone}` : null;

  const price = useMemo(() => {
    if (isUnifiedItem) {
      if (unified?.priceOnRequest) return null;
      if (typeof unified?.priceLabel === "string") return unified.priceLabel;
      if (typeof unified?.priceValue === "number") return formatCompactPrice(unified.priceValue);
      return null;
    }
    const label = getDisplayPriceLabel(listing);
    return label && label !== "Price on request" ? label : null;
  }, [isUnifiedItem, unified?.priceLabel, unified?.priceOnRequest, unified?.priceValue, listing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      setWishlisted(Array.isArray(ids) && ids.includes(itemId));
    } catch {
      setWishlisted(false);
    }
  }, [itemId]);

  const toggleWishlist = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      const next = new Set(Array.isArray(ids) ? ids : []);
      if (next.has(itemId)) {
        next.delete(itemId);
        setWishlisted(false);
      } else {
        next.add(itemId);
        setWishlisted(true);
      }
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(next)));
    } catch {
      setWishlisted((prev) => !prev);
    }
  };

  const specItems = [
    bhk ? { icon: HomeIcon, label: `${bhk} BHK` } : null,
    carpetArea
      ? { icon: AreaIcon, label: `${carpetArea} sqft` }
      : commercialArea
        ? { icon: AreaIcon, label: `${commercialArea} sqft` }
        : areaValue
          ? { icon: AreaIcon, label: areaValue }
          : null,
    bathrooms
      ? { icon: BathIcon, label: `${bathrooms} Bath` }
      : commercialFitOut
        ? { icon: CompassIcon, label: formatLabel(commercialFitOut) }
        : facing
          ? { icon: CompassIcon, label: formatLabel(facing) }
          : null,
    isUnifiedUnit && unified?.unitNumber ? { icon: TagIcon, label: `Unit ${unified.unitNumber}` } : null,
    isUnifiedUnit && unified?.tower ? { icon: TagIcon, label: `Tower ${unified.tower}` } : null,
    isUnifiedUnit && typeof unified?.floor === "number" ? { icon: TagIcon, label: `Floor ${unified.floor}` } : null
  ].filter(Boolean) as Array<{ icon: (props: { className?: string }) => ReactNode; label: string }>;

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
      className="group hover-card block cursor-pointer overflow-hidden rounded-[20px] border border-theme bg-white/82 shadow-[var(--shadow-card)]"
    >
      <div className="relative h-48 w-full overflow-hidden bg-surface">
        {heroSignedUrl ? (
          <img src={heroSignedUrl} alt={title} className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-strong text-[11px] text-muted">
            {heroMissingSigned ? "Image pending" : "No photo"}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{dealLabel}</Badge>
          {isUnifiedUnit ? <Badge tone="price">Project</Badge> : null}
          {isUnifiedUnit && unifiedAvailability ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${availabilityTone(unifiedAvailability)}`}>
              {formatLabel(unifiedAvailability)}
            </span>
          ) : null}
          {isVerified ? <Badge tone="verified">Verified</Badge> : null}
          {isNew ? <Badge tone="new">New</Badge> : null}
          {hasPriceDrop ? <Badge tone="price">Price Drop</Badge> : null}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            1/{imageCount}
          </span>
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition ${
              wishlisted
                ? "border-rose-300/60 bg-rose-500/85 text-white"
                : "border-white/35 bg-black/30 text-white hover:bg-black/45"
            }`}
          >
            <HeartIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
          <div>
            <div className="line-clamp-1 text-base font-semibold">{title}</div>
            <div className="mt-0.5 line-clamp-1 text-xs text-white/86">
              {projectName ? `${projectName} · ${locality || "Location pending"}` : locality || "Location pending"}
            </div>
          </div>
          <span className="hidden rounded-full border border-white/25 bg-white/12 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:inline-flex">
            {propertyLabel}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {price ? (
              <div className="text-2xl font-semibold tracking-tight text-primary">{price}</div>
            ) : (
              <div className="text-sm font-semibold text-muted">Price on request</div>
            )}
            <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-muted">{propertyLabel}</div>
            {isVerified ? (
              <div className="mt-1 text-xs font-medium text-emerald-700/90">Verified by ChandaNest</div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {specItems.map((item) => {
            const Icon = item.icon;
            return (
              <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-theme bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                <Icon className="h-3.5 w-3.5 text-[color:var(--goldDark)]" />
                {item.label}
              </span>
            );
          })}
        </div>

        {isUnifiedUnit ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-secondary">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (unitBase) navigate(`/projects/${unitBase}`);
              }}
              className="rounded-full border border-theme bg-white/70 px-2.5 py-1 hover-border-strong hover:text-primary"
            >
              {unified?.projectName || "Project"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(href);
              }}
              className="rounded-full border border-theme bg-white/70 px-2.5 py-1 hover-border-strong hover:text-primary"
            >
              View unit
            </button>
            {unifiedAvailability ? (
              <span className={`rounded-full border px-2.5 py-1 ${availabilityTone(unifiedAvailability)}`}>
                {formatLabel(unifiedAvailability)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(href);
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--goldDark)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(166,124,46,0.25)]"
          >
            View Details
          </button>
          {whatsappHref ? (
            <IconLink href={whatsappHref} label="WhatsApp" icon={<WhatsappIcon className="h-4 w-4" />} />
          ) : null}
          {callHref ? (
            <IconLink href={callHref} label="Call" icon={<PhoneIcon className="h-4 w-4" />} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: "neutral" | "verified" | "new" | "price"; children: ReactNode }) {
  const toneClass =
    tone === "verified"
      ? "border-emerald-300/50 bg-emerald-500/88 text-white"
      : tone === "new"
      ? "border-sky-300/55 bg-sky-500/88 text-white"
      : tone === "price"
      ? "border-amber-300/60 bg-amber-500/88 text-white"
      : "border-white/35 bg-black/35 text-white";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${toneClass}`}>{children}</span>;
}

function IconLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-theme bg-white/75 text-secondary transition hover:border-[color:var(--gold)]/40 hover:text-primary"
      onClick={(e) => e.stopPropagation()}
    >
      {icon}
    </a>
  );
}

function getListingContactPhone(property: PublicProperty | UnifiedResultItem) {
  const rawCandidates = [
    (property as any)?.contact?.phone,
    (property as any)?.contact?.whatsapp,
    (property as any)?.contactPhone,
    (property as any)?.phone,
    (property as any)?.phoneNumber
  ];

  for (const candidate of rawCandidates) {
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D+/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function formatLabel(input: string) {
  return input
    .toString()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function availabilityTone(value: string) {
  const v = value.toLowerCase();
  if (v === "available") return "border-emerald-300/60 bg-emerald-50 text-emerald-700";
  if (v === "blocked") return "border-amber-300/60 bg-amber-50 text-amber-700";
  if (v === "sold") return "border-rose-300/60 bg-rose-50 text-rose-700";
  return "border-theme bg-white/70 text-secondary";
}

function formatCompactPrice(amount: number) {
  if (amount >= 10000000) {
    const value = amount / 10000000;
    return `Rs ${Number.isInteger(value) ? value : value.toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    const value = amount / 100000;
    return `Rs ${Number.isInteger(value) ? value : value.toFixed(1)}L`;
  }
  const formatted = formatter.format(amount);
  return formatted.startsWith("₹") ? `Rs ${formatted.slice(1)}` : formatted;
}

function isRecent(value?: string) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 10;
}

function HeartIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-6.7-4.35-9-8.2C1.2 9.6 2.7 5 7.2 5c2.1 0 3.4 1.1 4.1 2.2C12 6.1 13.3 5 15.4 5 19.9 5 21.4 9.6 21 12.8 18.7 16.65 12 21 12 21z" /></svg>;
}
function PhoneIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2c-8 0-14-6-14-14a2 2 0 0 1 2-2z" /></svg>;
}
function WhatsappIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 20l1.2-3.6A8 8 0 1 1 20 12a8 8 0 0 1-8 8H5z" /><path d="M9 10c0 2 3 5 5 5l1-1 2 1 1-2-2-1-1 1c-1 0-2-1-2-2l1-1-1-2-2 1 1 1z" /></svg>;
}
function HomeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></svg>;
}
function AreaIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5h5M5 5v5M19 5h-5M19 5v5M5 19h5M5 19v-5M19 19h-5M19 19v-5" /></svg>;
}
function BathIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12h16v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-3z" /><path d="M7 12V8a2 2 0 1 1 4 0" /></svg>;
}
function CompassIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="M14.5 9.5l-2 5-5 2 2-5 5-2z" /></svg>;
}
function TagIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9 9 9-9-9-9H3v9z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
}
