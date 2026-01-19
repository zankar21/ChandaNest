import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  createPublicLead,
  getOwnerTenantId,
  getPublicNearby,
  getPublicProperty,
  type NearbyCategory,
  type NearbyPlace
} from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import { TARGET_CITIES } from "../../constants/market";
import { Helmet } from "react-helmet-async";
import { buildPropertySeo } from "../../utils/seo";
import { getHeroObjectPath } from "../../utils/media";

type GalleryItem = { objectPath: string; signedUrl: string; kind: "image" | "video" };

type PropertyDetailsPageProps = {
  dataOverride?: any;
  heroSignedUrlOverride?: string;
  galleryItemsOverride?: GalleryItem[];
  renderBanner?: ReactNode;
};

export default function PropertyDetailsPage({
  dataOverride,
  heroSignedUrlOverride,
  galleryItemsOverride,
  renderBanner
}: PropertyDetailsPageProps = {}) {
  const { propertyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(dataOverride ?? null);
  const [heroSignedUrl, setHeroSignedUrl] = useState<string | undefined>(heroSignedUrlOverride);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(galleryItemsOverride ?? []);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "success" | "error">("idle");
  const [leadError, setLeadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!dataOverride);
  const [error, setError] = useState<string | null>(null);
  const [nearbyData, setNearbyData] = useState<{ categories: NearbyCategory[] } | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!propertyId || dataOverride) return;
    const id = propertyId;
    async function load(currentId: string) {
      try {
        setLoading(true);
        const resp = await getPublicProperty(currentId);
        setData(resp);

        const heroPath = toObjectPath(getHeroObjectPath(resp));
        const gallery = (resp?.media?.gallery as any[]) || [];
        const galleryPaths = gallery
          .map((g) => toObjectPath(g?.objectPath))
          .filter((p): p is string => Boolean(p))
          .filter((p) => p !== heroPath);
        const signPaths = Array.from(new Set([heroPath, ...galleryPaths].filter(Boolean))).filter(
          (path): path is string => Boolean(path)
        );
        if (signPaths.length) {
          const hydrated = await hydrateSignedUrls(signPaths.map((objectPath) => ({ objectPath })));
          const urlMap = new Map(hydrated.map((item) => [item.objectPath, item.signedUrl]));
          if (heroPath) {
            setHeroSignedUrl(urlMap.get(heroPath));
          }
          const nextGallery = galleryPaths
            .map((objectPath) => {
              const signedUrl = urlMap.get(objectPath);
              if (!signedUrl) return null;
              const source = gallery.find((g) => g?.objectPath === objectPath);
              const isVideo =
                signedUrl.toLowerCase().includes(".mp4") ||
                objectPath.toLowerCase().endsWith(".mp4") ||
                source?.contentType?.includes("video");
              return { objectPath, signedUrl, kind: isVideo ? "video" : "image" };
            })
            .filter((item): item is GalleryItem => Boolean(item));
          setGalleryItems(nextGallery);
          setActiveIndex(0);
        } else {
          setHeroSignedUrl(undefined);
          setGalleryItems([]);
          setActiveIndex(0);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load property");
      } finally {
        setLoading(false);
      }
    }
    load(id);
  }, [propertyId, dataOverride]);

  useEffect(() => {
    if (searchParams.get("enquire") === "1") {
      setShowEnquiry(true);
      searchParams.delete("enquire");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  useEffect(() => {
    if (!dataOverride) return;
    setData(dataOverride);
    setHeroSignedUrl(heroSignedUrlOverride);
    setGalleryItems(galleryItemsOverride ?? []);
    setLoading(false);
  }, [dataOverride, heroSignedUrlOverride, galleryItemsOverride]);

  const mapGeo = data?.location?.geo;
  const hasGeo =
    typeof mapGeo?.lat === "number" && typeof mapGeo?.lng === "number";
  const citySlug = data?.location?.citySlug || "";
  const cityName =
    (citySlug && TARGET_CITIES[citySlug as keyof typeof TARGET_CITIES]?.name) ||
    data?.location?.city ||
    citySlug;

  useEffect(() => {
    if (!propertyId || dataOverride || !hasGeo) {
      setNearbyData(null);
      return;
    }
    let active = true;
    setNearbyLoading(true);
    setNearbyError(null);
    getPublicNearby(propertyId)
      .then((resp) => {
        if (!active) return;
        if (!resp?.available) {
          setNearbyData(null);
          return;
        }
        setNearbyData({ categories: resp.categories || [] });
      })
      .catch((err: any) => {
        if (!active) return;
        if (import.meta.env.DEV) {
          console.error("Failed to load nearby essentials", err);
        }
        setNearbyError(err?.message || "Failed to load nearby essentials");
      })
      .finally(() => {
        if (!active) return;
        setNearbyLoading(false);
      });
    return () => {
      active = false;
    };
  }, [propertyId, dataOverride, hasGeo]);

  const area = useMemo(() => {
    const value = data?.area?.value;
    const unit = data?.area?.unit;
    if (value === undefined || value === null) return null;
    return `${value} ${unit || ""}`.trim();
  }, [data]);

  const mediaItems = useMemo(() => {
    const heroObjectPath = toObjectPath(getHeroObjectPath(data));
    const heroItem =
      heroSignedUrl && heroObjectPath
        ? [{ objectPath: heroObjectPath, signedUrl: heroSignedUrl, kind: "image" as const }]
        : [];
    return [...heroItem, ...galleryItems];
  }, [data, galleryItems, heroSignedUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!selectedImage) return;
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => Math.min(prev + 1, mediaItems.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedImage, mediaItems.length]);

  const openLightbox = (index: number) => {
    if (!mediaItems[index]) return;
    setActiveIndex(index);
    setSelectedImage(mediaItems[index].signedUrl);
  };

  useEffect(() => {
    if (!selectedImage) return;
    const next = mediaItems[activeIndex]?.signedUrl;
    if (next && next !== selectedImage) {
      setSelectedImage(next);
    }
  }, [activeIndex, mediaItems, selectedImage]);

  const formatPrice = (amount?: number, currency?: string) => {
    if (amount === null || amount === undefined) return "Price on request";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const seo = buildPropertySeo(data);
  const canonicalUrl = `${window.location.origin.replace(/\/+$/, "")}${seo.canonicalPath}`;
  const isCanonical = window.location.pathname === seo.canonicalPath;
  const ogImage = heroSignedUrl || galleryItems[0]?.signedUrl || undefined;
  const floorSizeUnit =
    data?.area?.unit === "sqft"
      ? "SQF"
      : data?.area?.unit === "sqm"
        ? "SQM"
        : data?.area?.unit === "acre"
          ? "ACR"
          : data?.area?.unit === "hectare"
            ? "HAR"
            : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: seo.title,
    description: seo.description,
    url: canonicalUrl,
    address: {
      "@type": "PostalAddress",
      addressLocality: data.location?.locality || "",
      addressRegion: data.location?.state || "Maharashtra",
      addressCountry: "IN"
    },
    areaServed: cityName || "",
    floorSize:
      data.area?.value && floorSizeUnit
        ? { "@type": "QuantitativeValue", value: data.area.value, unitCode: floorSizeUnit }
        : undefined,
    image: ogImage ? [ogImage] : []
  };

  const land = data?.landRecord || {};
  const specs = data?.specs || {};
  const contact = data?.contact || null;
  const hasContact =
    contact && (contact.name || contact.phone || contact.whatsapp || contact.email || contact.preferred);
  const contactName = hasContact ? contact.name || "Owner" : null;
  const contactPhone = hasContact ? contact.phone : null;
  const contactWhatsapp = hasContact ? contact.whatsapp : null;
  const contactEmail = hasContact ? contact.email : null;
  const contactPreferred = hasContact ? contact.preferred : null;
  const contactWhatsAppTarget = contactWhatsapp || contactPhone || null;
  const priceBase =
    data?.type === "rent" ? data?.pricing?.rentPerMonth ?? null : data?.pricing?.totalPrice ?? null;
  const price = formatPrice(priceBase ?? undefined, data?.pricing?.currency);
  const isLand = data?.propertyType === "land" || data?.propertyType === "plot";
  const isPlot = data?.propertyType === "plot";
  const isResidential = data?.propertyType === "flat" || data?.propertyType === "house";
  const isRental = data?.type === "rent" || Boolean(data?.rental);
  const plotInfo = data?.plotInfo || {};
  const intentLabel = labelIntent(data?.type);
  const categoryLabel = labelCategory(data?.category);
  const saleTypeLabel = labelSaleType(data?.saleType);
  const subTypeValue = data?.subType || data?.metadata?.subType || null;
  const propertyTypeLabel = labelPropertyType(data?.propertyType, subTypeValue, data?.category);
  const landUseLabel = labelLandUse(data?.landUse || land?.landUse);
  const facingValue =
    specs?.flat?.facing ||
    specs?.house?.facing ||
    specs?.land?.facing ||
    data?.plotInfo?.facing ||
    specs?.plot?.facing ||
    null;
  const flatFacingValue = specs?.flat?.facing || data?.plotInfo?.facing || null;
  const plotFacingValue = plotInfo?.facing || specs?.plot?.facing || null;
  const landFacingValue = specs?.land?.facing || (isPlot ? plotFacingValue : null);
  const landTypeValue = land?.landType || specs?.land?.landType || land?.naStatus || null;
  const addressLine = data?.location?.addressLine;
  const pincode = data?.location?.pincode;
  const title = data?.title || "Property Listing";
  const locationLine = [data?.location?.locality, humanizeSlug(data?.location?.citySlug)]
    .filter(Boolean)
    .join(" - ");
  const galleryCount = (galleryItems?.length || 0) + (heroSignedUrl ? 1 : 0);
  const hasKyc = data?.ownerKycStatus === "verified" || data?.kycVerified === true;
  const isVerified = hasKyc || data?.visibility === "published";
  const hasPhotos = galleryCount > 0;
  const boolLabel = (value?: boolean) => (value === true ? "Yes" : value === false ? "No" : null);
  const isPresent = (value: unknown) =>
    value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");
  const roadAccessLabel = boolLabel(land?.roadAccess);
  const electricityLabel = boolLabel(land?.electricity);
  const videoCount = mediaItems.filter((item) => item.kind === "video").length;
  const quickFacts = [
    { icon: "area", label: "Area", value: area || null },
    { icon: "type", label: "Type", value: data?.type ? formatLabel(data.type) : null },
    { icon: "property", label: "Property", value: data?.propertyType ? formatLabel(data.propertyType) : null },
    { icon: "facing", label: "Facing", value: facingValue ? formatLabel(facingValue) : null },
    { icon: "road", label: "Road access", value: roadAccessLabel },
    { icon: "power", label: "Electricity", value: electricityLabel },
    { icon: "water", label: "Water source", value: land?.waterSource ? formatLabel(land.waterSource) : null },
    { icon: "nearby", label: "Videos", value: videoCount > 0 ? String(videoCount) : null }
  ].filter((item): item is { icon: string; label: string; value: string } => isPresent(item.value));

  const descriptionSource = data?.description;
  const descriptionUser =
    typeof descriptionSource === "string" ? descriptionSource : descriptionSource?.user || "";
  const descriptionAi = typeof descriptionSource === "object" ? descriptionSource?.ai || "" : "";
  const descriptionActive =
    typeof descriptionSource === "object" ? descriptionSource?.active || "" : "";
  const descriptionResolved =
    descriptionActive === "ai" && descriptionAi
      ? descriptionAi
      : descriptionUser || descriptionAi || "";
  const description = descriptionResolved.trim();
  const descriptionShort = description.length > 220 ? `${description.slice(0, 220)}...` : description;
  const descriptionLabel =
    descriptionActive === "ai" && descriptionAi ? "AI generated" : description ? "Owner description" : null;
  const trustItems = [
    hasPhotos ? "Photos available" : null,
    videoCount > 0 ? "Videos available" : null,
    isVerified ? "KYC verified" : null
  ].filter((item): item is string => Boolean(item));
  const updatedAtValue = data?.updatedAt || data?.createdAt || null;
  const updatedLabel = updatedAtValue ? `Updated: ${formatRelativeTime(updatedAtValue)}` : null;

  const mapAddress = [data?.location?.locality, cityName].filter(Boolean).join(", ");
  const mapUrl =
    mapGeo?.lat !== undefined && mapGeo?.lng !== undefined
      ? `https://www.google.com/maps?q=${mapGeo.lat},${mapGeo.lng}&z=15&output=embed`
      : mapAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&z=15&output=embed`
        : null;
  const mapLink =
    mapGeo?.lat !== undefined && mapGeo?.lng !== undefined
      ? `https://www.google.com/maps?q=${mapGeo.lat},${mapGeo.lng}`
      : mapAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}`
        : null;

  const galleryThumbs = mediaItems.slice(0, 5);
  const extraPhotos = Math.max(0, mediaItems.length - galleryThumbs.length);
  const activeMediaItem = mediaItems[activeIndex] || null;
  const formatMoney = (value?: number | null) =>
    value === null || value === undefined ? "-" : formatPrice(value, data?.pricing?.currency);
  const moneyOrNull = (value?: number | null) =>
    value === null || value === undefined ? null : formatPrice(value, data?.pricing?.currency);

  const adminFields = [
    { label: "Mouza", value: land?.mouza, icon: "land" },
    { label: "Survey / Gat No", value: land?.surveyOrGatNo, icon: "doc" },
    { label: "Taluka", value: land?.taluka, icon: "land" },
    { label: "District", value: land?.district, icon: "land" }
  ].filter((field) => isPresent(field.value));
  const hasAdminFields = adminFields.length > 0;

  type StatTileItem = {
    label: string;
    value: string | number | null;
    icon?: string;
    badge?: string | null;
  };

  type StatRow = {
    title: string;
    tiles: StatTileItem[];
  };

  const landRows: StatRow[] = [
    {
      title: "Land core",
      tiles: [
        { label: "Area", value: area || null, icon: "area" },
        { label: "Facing", value: landFacingValue ? formatLabel(landFacingValue) : null, icon: "facing" },
        { label: "Land type", value: landTypeValue ? formatLabel(landTypeValue) : null, icon: "land" },
        { label: "NA status", value: land?.naStatus ? formatLabel(land.naStatus) : null, icon: "doc" },
        {
          label: "Layout approved",
          value: isPlot ? boolLabel(plotInfo?.layoutApproved) : null,
          icon: "doc"
        },
        {
          label: "Corner plot",
          value: isPlot ? boolLabel(plotInfo?.cornerPlot) : null,
          icon: "land"
        }
      ]
    },
    {
      title: "Utilities & access",
      tiles: [
        { label: "Road access", value: roadAccessLabel, icon: "road" },
        { label: "Electricity", value: electricityLabel, icon: "power" },
        {
          label: "Water source",
          value: land?.waterSource ? formatLabel(land.waterSource) : null,
          icon: "water"
        },
        { label: "Boundary wall", value: boolLabel(land?.boundaryWall), icon: "land" },
        {
          label: "Frontage (ft)",
          value: land?.frontageFeet ?? null,
          icon: "area"
        },
        {
          label: "Plot shape",
          value: land?.plotShape ? formatLabel(land.plotShape) : null,
          icon: "land"
        }
      ]
    }
  ];

  const saleRows: StatRow[] = [
    {
      title: "Primary buyer filters",
      tiles: [
        { label: "BHK", value: specs?.flat?.bhk ?? specs?.house?.bhk ?? null, icon: "bed" },
        {
          label: "Carpet area",
          value:
            specs?.flat?.carpetAreaSqFt || specs?.house?.carpetAreaSqFt
              ? `${specs?.flat?.carpetAreaSqFt ?? specs?.house?.carpetAreaSqFt} sqft`
              : null,
          icon: "area"
        },
        {
          label: "Built-up area",
          value:
            specs?.flat?.builtUpAreaSqFt || specs?.house?.builtUpAreaSqFt
              ? `${specs?.flat?.builtUpAreaSqFt ?? specs?.house?.builtUpAreaSqFt} sqft`
              : null,
          icon: "area"
        },
        { label: "Floor", value: specs?.flat?.floor ?? specs?.house?.floor ?? null, icon: "floor" }
      ]
    },
    {
      title: "Comfort & livability",
      tiles: [
        { label: "Bathrooms", value: specs?.flat?.bathrooms ?? specs?.house?.bathrooms ?? null, icon: "bath" },
        {
          label: "Furnishing",
          value: specs?.flat?.furnishing ?? specs?.house?.furnishing ?? null,
          icon: "sofa"
        },
        { label: "Parking", value: specs?.flat?.parking ?? specs?.house?.parking ?? null, icon: "parking" },
        {
          label: "Balcony",
          value: specs?.flat?.balconyCount ?? specs?.house?.balconyCount ?? null,
          icon: "home"
        },
        { label: "Lift", value: boolLabel(specs?.flat?.lift ?? specs?.house?.lift), icon: "home" },
        {
          label: "Power backup",
          value: boolLabel(specs?.flat?.powerBackup ?? specs?.house?.powerBackup),
          icon: "power"
        }
      ]
    }
  ];

  const rentalRows: StatRow[] = [
    {
      title: "Rental terms",
      tiles: [
        { label: "Rent / Month", value: moneyOrNull(data?.pricing?.rentPerMonth), icon: "money" },
        { label: "Deposit", value: moneyOrNull(data?.pricing?.deposit), icon: "money" },
        {
          label: "Lease term",
          value: data?.rental?.leaseTermMonths ? `${data.rental.leaseTermMonths} months` : null,
          icon: "doc"
        },
        {
          label: "Maintenance",
          value: moneyOrNull(data?.rental?.maintenance),
          badge: data?.rental?.maintenanceIncluded ? "Included" : null,
          icon: "doc"
        },
        { label: "Available from", value: data?.rental?.availableFrom ?? null, icon: "calendar" },
        { label: "Preferred tenants", value: data?.rental?.preferredTenants ?? null, icon: "home" },
        { label: "Pets allowed", value: boolLabel(data?.rental?.petsAllowed), icon: "pet" }
      ]
    }
  ];

  const displayRows = (() => {
    const baseRows = isLand ? landRows : isResidential ? (isRental ? rentalRows : saleRows) : landRows;
    return baseRows
      .map((row) => ({
        ...row,
        tiles: row.tiles.filter((tile) => isPresent(tile.value))
      }))
      .filter((row) => row.tiles.length > 0);
  })();

  const keyHighlights = (() => {
    const picks = isLand
      ? [
          area ? { icon: "area", label: "Area", value: area } : null,
          landFacingValue ? { icon: "facing", label: "Facing", value: formatLabel(landFacingValue) } : null,
          landTypeValue ? { icon: "land", label: "Land type", value: formatLabel(landTypeValue) } : null,
          land?.roadAccess !== undefined
            ? { icon: "road", label: "Road access", value: boolLabel(land?.roadAccess) }
            : null
        ]
      : [
          area ? { icon: "area", label: "Area", value: area } : null,
          specs?.flat?.bhk || specs?.house?.bhk
            ? { icon: "bed", label: "BHK", value: `${specs?.flat?.bhk ?? specs?.house?.bhk}` }
            : null,
          flatFacingValue ? { icon: "facing", label: "Facing", value: formatLabel(flatFacingValue) } : null,
          specs?.flat?.floor !== undefined && specs?.flat?.floor !== null
            ? { icon: "floor", label: "Floor", value: `${specs.flat.floor}` }
            : null
        ];
    return picks.filter(
      (item): item is { icon: string; label: string; value: string } => Boolean(item)
    );
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1224] via-[#0B1326] to-[#0A0F1E] pb-28 text-white">
      {renderBanner}
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords.join(", ")} />
        <link rel="canonical" href={canonicalUrl} />
        {!isCanonical && <meta name="robots" content="noindex,follow" />}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl space-y-8 px-4 md:px-6 pt-6">
        <section ref={heroRef} className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <HeroMedia
              title={title}
              locationLine={locationLine || "-"}
              heroSignedUrl={heroSignedUrl}
              mediaItems={mediaItems}
              openLightbox={openLightbox}
              isVerified={isVerified}
              updatedLabel={updatedLabel}
              videoCount={videoCount}
              activeIndex={activeIndex}
            />
          </div>
          <div className="lg:col-span-4">
            <StickySummaryCard
              title={title}
              price={price}
              rateLabel={
                data?.pricing?.rate && data?.pricing?.rateUnit
                  ? `Rate: ${formatNumber(data.pricing.rate)} / ${formatLabel(data.pricing.rateUnit)}`
                  : null
              }
              locationLine={[data?.location?.locality, cityName].filter(Boolean).join(" - ") || "-"}
              specPills={buildSpecPills({
                isLand,
                area,
                landTypeValue,
                landFacingValue,
                roadAccessLabel,
                specs,
                plotInfo
              })}
              contactName={contactName}
              contactPhone={contactPhone}
              contactEmail={contactEmail}
              contactWhatsapp={contactWhatsapp}
              contactWhatsAppTarget={contactWhatsAppTarget}
              trustItems={trustItems}
              updatedLabel={updatedLabel}
              onEnquire={() => setShowEnquiry(true)}
            />
          </div>
        </section>

        <div className="space-y-6">
          {quickFacts.length > 0 && (
            <SectionCard>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {quickFacts.map((item) => (
                  <QuickFactChip key={item.label} icon={item.icon} label={item.label} value={item.value} compact />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Overview</h2>
              {descriptionLabel && (
                <span className="rounded-full border border-white/5 bg-surface/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                  {descriptionLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-white/70">
              {description
                ? showFullDescription
                  ? description
                  : descriptionShort
                : "Description not provided."}
            </p>
            {description.length > 220 && (
              <button
                className="text-xs font-semibold text-indigo-300"
                onClick={() => setShowFullDescription((prev) => !prev)}
              >
                {showFullDescription ? "Read less" : "Read more"}
              </button>
            )}
          </SectionCard>

          <SectionCard>
            <div className="flex items-center gap-2 text-white">
              <Icon name="specs" className="h-5 w-5 text-white/70" />
              <h2 className="text-lg font-semibold">Specs & Features</h2>
            </div>
            {displayRows.map((row) => (
              <div key={row.title} className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-white/50">{row.title}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {row.tiles.map((tile) => (
                    <StatTile
                      key={tile.label}
                      label={tile.label}
                      value={tile.value}
                      icon={tile.icon}
                      badge={tile.badge}
                      dark
                    />
                  ))}
                </div>
              </div>
            ))}
          </SectionCard>

          {data?.propertyType === "land" && hasAdminFields && (
            <SectionCard>
              <div className="flex items-center gap-2 text-white">
                <Icon name="doc" className="h-5 w-5 text-white/70" />
                <h2 className="text-lg font-semibold">Land Records</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {adminFields.map((field) => (
                  <StatTile key={field.label} label={field.label} value={field.value} icon={field.icon} dark />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard>
            <h2 className="text-lg font-semibold text-white">Location</h2>
            {mapUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/5">
                <iframe
                  title="map"
                  src={mapUrl}
                  className="w-full aspect-[16/9]"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="text-sm text-white/60">Location map not available.</div>
            )}
            {mapLink && (
              <a
                className="inline-flex w-fit rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70"
                href={mapLink}
                target="_blank"
                rel="noreferrer"
              >
                View on Google Maps
              </a>
            )}
            <div className="text-sm text-white/70">
              {[addressLine, data?.location?.locality, cityName, pincode].filter(Boolean).join(" - ") ||
                "Location details not available."}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Location Advantage
            </div>
            <div>
              <div className="flex items-center gap-2 text-white">
                <Icon name="nearby" className="h-5 w-5 text-white/70" />
                <h2 className="text-lg font-semibold">Nearby Essentials</h2>
              </div>
              <p className="text-xs text-white/60">Auto-calculated from location</p>
              {hasGeo && nearbyData?.categories?.length ? (
                <div className="text-xs text-white/50">Nearby places shown within 5 km.</div>
              ) : null}
            </div>
            {!hasGeo ? (
              <div className="rounded-xl border border-white/5 bg-surface/5 p-4 text-sm text-white/60">
                Add exact location to see nearby essentials.
              </div>
            ) : nearbyLoading ? (
              <NearbySkeleton dark />
            ) : nearbyError ? (
              <div className="rounded-xl border border-white/5 bg-surface/5 p-4 text-sm text-white/60">
                Nearby travel time unavailable right now.
              </div>
            ) : !nearbyData || nearbyData.categories.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-surface/5 p-4 text-sm text-white/60">
                No nearby places found near this property.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {nearbyData.categories.map((category) => (
                  <NearbyCategoryCard key={category.key} category={category} dark />
                ))}
              </div>
            )}
            <div className="text-xs text-white/50">Distances are approximate. Data from Google Maps.</div>
          </SectionCard>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#0B1220]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button
            className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => (contactPhone ? (window.location.href = `tel:${contactPhone}`) : setShowEnquiry(true))}
          >
            Call
          </button>
          <button
            className="flex-1 rounded-full border border-white/20 bg-surface/5 px-4 py-2 text-sm font-semibold text-white/70"
            onClick={() =>
              contactWhatsAppTarget
                ? (window.location.href = `https://wa.me/${contactWhatsAppTarget.replace(/[^0-9]/g, "")}`)
                : setShowEnquiry(true)
            }
          >
            WhatsApp
          </button>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full">
            <div className="absolute left-4 top-3 text-xs text-white/80">
              {activeIndex + 1} of {mediaItems.length}
            </div>
            <button
              className="absolute right-2 top-2 rounded-full bg-surface/80 px-3 py-1 text-sm font-semibold text-primary"
              onClick={() => setSelectedImage(null)}
            >
              Close
            </button>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 px-3 py-1 text-sm font-semibold text-primary"
              onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
              disabled={activeIndex === 0}
            >
              Prev
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface/80 px-3 py-1 text-sm font-semibold text-primary"
              onClick={() => setActiveIndex((prev) => Math.min(prev + 1, mediaItems.length - 1))}
              disabled={activeIndex >= mediaItems.length - 1}
            >
              Next
            </button>
            {activeMediaItem?.kind === "video" ? (
              <video
                src={activeMediaItem.signedUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[80vh] object-contain rounded-xl bg-black"
              />
            ) : (
              <img
                src={activeMediaItem?.signedUrl || selectedImage}
                alt="preview"
                className="w-full max-h-[80vh] object-contain rounded-xl"
              />
            )}
          </div>
        </div>
      )}

      {showEnquiry && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 space-y-4">
            <div className="text-lg font-semibold text-primary">Enquire</div>
            <div className="text-sm text-secondary">
              Share your details and we will connect you with the listing owner.
            </div>
            {leadStatus === "success" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Enquiry sent. We will contact you soon.
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!propertyId) return;
                  setLeadSubmitting(true);
                  setLeadError(null);
                  setLeadStatus("idle");
                  try {
                    const sourceParam = searchParams.get("source");
                    const sourcePage =
                      sourceParam === "map" || sourceParam === "search" || sourceParam === "home"
                        ? sourceParam
                        : "property";
                    await createPublicLead({
                      tenantId: getOwnerTenantId(),
                      subject: {
                        kind: "property",
                        propertyId,
                        title: title || undefined,
                        href: window.location.href,
                        city: cityName || undefined,
                        area: data?.location?.locality || undefined
                      },
                      contact: {
                        name: leadForm.name.trim() || undefined,
                        phone: leadForm.phone.trim() || undefined,
                        email: leadForm.email.trim() || undefined,
                        message: leadForm.message.trim() || undefined
                      },
                      source: { page: sourcePage }
                    });
                    setLeadStatus("success");
                    setLeadForm((prev) => ({ ...prev, message: "" }));
                  } catch (err: any) {
                    setLeadStatus("error");
                    if (err?.status === 429) {
                      setLeadError("Too many requests. Try again in a minute.");
                    } else if (!err?.status) {
                      setLeadError("Could not send enquiry. Try again.");
                    } else {
                      setLeadError(err?.message || "Failed to submit enquiry.");
                    }
                  } finally {
                    setLeadSubmitting(false);
                  }
                }}
              >
                <input
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Your name"
                  value={leadForm.name}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
                <input
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Phone number"
                  value={leadForm.phone}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
                  required
                />
                <input
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Email (optional)"
                  value={leadForm.email}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <textarea
                  className="w-full rounded-md input-glass px-3 py-2 text-sm"
                  placeholder="Message (optional)"
                  rows={3}
                  value={leadForm.message}
                  onChange={(event) => setLeadForm((prev) => ({ ...prev, message: event.target.value }))}
                />
                {leadStatus === "error" && leadError && (
                  <div className="text-xs text-rose-200">{leadError}</div>
                )}
                <button
                  type="submit"
                  className="w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  disabled={leadSubmitting}
                >
                  {leadSubmitting ? "Sending..." : "Send enquiry"}
                </button>
              </form>
            )}
            <button
              className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
              onClick={() => setShowEnquiry(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickFactChip({
  icon,
  label,
  value,
  compact
}: {
  icon: string;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-white/5 bg-surface/5 px-3 py-1 text-xs text-white/70 ${
        compact ? "whitespace-nowrap" : ""
      }`}
    >
      <Icon name={icon} className="h-4 w-4 text-white/60" />
      <span className="text-white/50">{label}:</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function NearbyCategoryCard({ category, dark }: { category: NearbyCategory; dark?: boolean }) {
  const iconName = pickNearbyCategoryIcon(category.key);
  const items = category.items || [];
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
        dark ? "border-white/5 bg-surface/5" : "border-theme bg-surface"
      }`}
    >
      <div className={`flex items-center gap-2 ${dark ? "text-white" : "text-primary"}`}>
        <Icon name={iconName} className={`h-4 w-4 ${dark ? "text-white/60" : "text-muted"}`} />
        <div className="text-sm font-semibold">{category.title}</div>
      </div>
      {items.length === 0 ? (
        <div className={`text-xs ${dark ? "text-white/60" : "text-muted"}`}>No nearby places found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const driveLabel = buildTravelLabel("Drive", item.drive?.km, item.drive?.minutes);
            const walkLabel = buildTravelLabel("Walk", item.walk?.km, item.walk?.minutes);
            const sourceLabel =
              item.source === "curated" ? "Popular landmark" : "Nearby on Google Maps";
            return (
              <div
                key={item.placeId}
                className={index === 0 ? "" : `${dark ? "border-t border-white/5" : "border-t border-theme"} pt-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-sm font-semibold ${dark ? "text-white" : "text-primary"}`}>
                      {item.name}
                    </div>
                    {item.address && (
                      <div className={`text-xs ${dark ? "text-white/60" : "text-muted"}`}>
                        {item.address}
                      </div>
                    )}
                    <div
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        dark ? "bg-surface/10 text-white/60" : "bg-surface text-secondary"
                      }`}
                    >
                      {sourceLabel}
                    </div>
                  </div>
                  <a
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      dark
                        ? "border-white/20 text-white/70 hover:border-white/40"
                        : "border-theme text-secondary hover-border-strong"
                    }`}
                    href={item.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                </div>
                <div className={`mt-2 space-y-1 text-xs ${dark ? "text-white/60" : "text-secondary"}`}>
                  <div>{driveLabel}</div>
                  <div>{walkLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function labelIntent(intent?: string | null) {
  if (!intent) return null;
  const value = intent.toLowerCase();
  if (value === "sale" || value === "buy") return "Sale";
  if (value === "rent" || value === "lease") return "Rent";
  return null;
}

function labelCategory(category?: string | null) {
  if (!category) return null;
  const value = category.toLowerCase();
  if (value === "residential") return "Residential";
  if (value === "commercial") return "Commercial";
  if (value === "land" || value === "plot") return "Land / Plot";
  return null;
}

function labelSaleType(saleType?: string | null) {
  if (!saleType) return null;
  const value = saleType.toLowerCase();
  if (value === "new") return "New";
  if (value === "resale") return "Resale";
  return null;
}

function labelPropertyType(propertyType?: string | null, subType?: string | null, category?: string | null) {
  const typeValue = (subType || propertyType || "").toLowerCase();
  switch (typeValue) {
    case "flat":
      return "Flat / Apartment";
    case "house":
      return "Independent House";
    case "villa":
      return "Villa / Bungalow";
    case "row_house":
      return "Row House";
    case "studio":
      return "Studio Apartment";
    case "shop":
      return "Shop / Showroom";
    case "office":
      return "Office Space";
    case "warehouse":
      return "Godown / Warehouse";
    case "industrial_shed":
      return "Industrial Shed";
    case "plot":
      return "Plot";
    case "land":
      return "Land";
    default:
      return category ? labelCategory(category) : null;
  }
}

function labelLandUse(landUse?: string | null) {
  if (!landUse) return null;
  const value = landUse.toLowerCase();
  if (value === "residential") return "Residential Land";
  if (value === "commercial") return "Commercial Land";
  if (value === "industrial") return "Industrial Land";
  if (value === "agricultural" || value === "agri") return "Agricultural";
  if (value === "na" || value === "non_agricultural") return "NA (Non-Agricultural)";
  return null;
}

function formatLabel(input: string) {
  return input
    .toString()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function buildAltText(data: any, area: string | null) {
  const city = data.location?.city || data.location?.citySlug || "";
  const locality = data.location?.locality || "";
  const type = data.propertyType || "Property";
  const areaText = area ? `${area} ` : "";
  return `${type} in ${locality || city} - ${areaText}${type}`;
}

function humanizeSlug(value?: string) {
  if (!value) return "";
  return value
    .toString()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function formatRelativeTime(value: unknown) {
  if (!value) return "-";
  if (typeof value === "object" && (value as { seconds?: number }).seconds) {
    const seconds = (value as { seconds: number }).seconds;
    return formatRelativeTime(new Date(seconds * 1000).toISOString());
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatTile({
  label,
  value,
  icon,
  badge,
  dark
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: string;
  badge?: string | null;
  dark?: boolean;
}) {
  const hasValue =
    value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");
  if (!hasValue) return null;
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        dark ? "border-white/5 bg-surface/5" : "border-theme bg-surface"
      }`}
    >
      <div className={`flex items-center gap-2 text-xs ${dark ? "text-white/50" : "text-muted"}`}>
        {icon && <Icon name={icon} className={`h-4 w-4 ${dark ? "text-white/40" : "text-muted"}`} />}
        <span>{label}</span>
        {badge && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              dark ? "bg-emerald-400/20 text-emerald-200" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className={`text-base font-semibold truncate ${dark ? "text-white" : "text-primary"}`} title={String(value)}>
        {value}
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDistance(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)} km`;
}

function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface/5 p-5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] space-y-3">
      {children}
    </div>
  );
}

function HeroMedia({
  title,
  locationLine,
  heroSignedUrl,
  mediaItems,
  openLightbox,
  isVerified,
  updatedLabel,
  videoCount,
  activeIndex
}: {
  title: string;
  locationLine: string;
  heroSignedUrl?: string;
  mediaItems: GalleryItem[];
  openLightbox: (index: number) => void;
  isVerified: boolean;
  updatedLabel?: string | null;
  videoCount: number;
  activeIndex: number;
}) {
  const mediaCount = mediaItems.length;
  const thumbItems = mediaItems.slice(0, 6);
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <div className="relative aspect-[16/9]">
          {heroSignedUrl ? (
            <img
              src={heroSignedUrl}
              alt={title}
              className="h-full w-full object-cover brightness-95"
              loading="eager"
              onClick={() => openLightbox(0)}
            />
          ) : (
            <div className="h-full w-full bg-surface/10 flex items-center justify-center text-sm text-white/60">
              No photo available
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2 text-xs font-semibold">
            {isVerified && <span className="rounded-full bg-emerald-500/70 px-3 py-1">Verified</span>}
            {updatedLabel && <span className="rounded-full bg-surface/10 px-3 py-1">New</span>}
          </div>
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white"
              onClick={() => openLightbox(0)}
              disabled={mediaItems.length === 0}
            >
              {videoCount > 0 ? "View all media" : "View all photos"}
            </button>
            <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white">
              {mediaCount} Photos
            </span>
          </div>
          <div className="absolute left-4 right-4 bottom-4">
            <div className="inline-flex max-w-full flex-col gap-1 rounded-2xl border border-white/5 bg-black/35 px-4 py-3 backdrop-blur-md">
              <div className="text-2xl font-semibold text-white">{title}</div>
              <div className="text-sm text-white/70">{locationLine}</div>
            </div>
          </div>
        </div>
      </div>
      {thumbItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbItems.map((item, idx) => (
            <button
              key={`${item.objectPath}-${idx}`}
              className={`relative h-20 w-28 overflow-hidden rounded-xl border bg-surface/5 ${
                activeIndex === idx ? "border-indigo-400/80 ring-2 ring-indigo-400/70" : "border-white/5"
              }`}
              onClick={() => openLightbox(idx)}
              aria-current={activeIndex === idx}
            >
              {item.kind === "video" ? (
                <>
                  <video src={item.signedUrl} className="h-full w-full object-cover" preload="metadata" muted />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    MP4
                  </div>
                </>
              ) : (
                <img src={item.signedUrl} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildSpecPills(input: {
  isLand: boolean;
  area: string | null;
  landTypeValue: string | null;
  landFacingValue: string | null;
  roadAccessLabel: string | null;
  specs: any;
  plotInfo: any;
}) {
  if (input.isLand) {
    return [
      input.area ? { label: "Area", value: input.area } : null,
      input.landTypeValue ? { label: "Land type", value: formatLabel(input.landTypeValue) } : null,
      input.landFacingValue ? { label: "Facing", value: formatLabel(input.landFacingValue) } : null,
      input.roadAccessLabel ? { label: "Road access", value: input.roadAccessLabel } : null
    ].filter((item): item is { label: string; value: string } => Boolean(item));
  }
  return [
    input.specs?.flat?.builtUpAreaSqFt || input.specs?.house?.builtUpAreaSqFt
      ? {
          label: "Built-up",
          value: `${input.specs?.flat?.builtUpAreaSqFt ?? input.specs?.house?.builtUpAreaSqFt} sqft`
        }
      : null,
    input.specs?.flat?.bhk || input.specs?.house?.bhk
      ? { label: "Bedrooms", value: String(input.specs?.flat?.bhk ?? input.specs?.house?.bhk) }
      : null,
    input.specs?.flat?.bathrooms || input.specs?.house?.bathrooms
      ? { label: "Bathrooms", value: String(input.specs?.flat?.bathrooms ?? input.specs?.house?.bathrooms) }
      : null,
    input.specs?.flat?.parking || input.specs?.house?.parking
      ? { label: "Parking", value: String(input.specs?.flat?.parking ?? input.specs?.house?.parking) }
      : null
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function StickySummaryCard({
  title,
  price,
  rateLabel,
  locationLine,
  specPills,
  contactName,
  contactPhone,
  contactEmail,
  contactWhatsapp,
  contactWhatsAppTarget,
  trustItems,
  updatedLabel,
  onEnquire
}: {
  title: string;
  price: string;
  rateLabel: string | null;
  locationLine: string;
  specPills: { label: string; value: string }[];
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWhatsapp: string | null;
  contactWhatsAppTarget: string | null;
  trustItems: string[];
  updatedLabel?: string | null;
  onEnquire: () => void;
}) {
  return (
    <div className="lg:sticky lg:top-6 space-y-4">
      <div className="rounded-2xl border border-white/5 bg-surface/5 p-5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] space-y-4">
        <div>
          <div className="text-sm font-semibold text-white/70">{title}</div>
          <div className="text-4xl font-semibold tracking-tight">{price}</div>
          {rateLabel && <div className="text-xs text-white/60">{rateLabel}</div>}
        </div>
        <div className="text-sm text-white/70">{locationLine}</div>
        {specPills.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {specPills.slice(0, 4).map((pill) => (
              <div
                key={pill.label}
                className="flex min-h-[48px] items-center justify-between rounded-xl border border-white/5 bg-surface/5 px-3 py-2"
              >
                <span className="text-[11px] text-white/50">{pill.label}</span>
                <span className="text-xs font-semibold text-white">{pill.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <button
            className="w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)]"
            onClick={() => (contactPhone ? (window.location.href = `tel:${contactPhone}`) : onEnquire())}
          >
            Call
          </button>
          <button
            className="w-full rounded-full border border-white/20 bg-surface/5 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-surface/10"
            onClick={() =>
              contactWhatsAppTarget
                ? (window.location.href = `https://wa.me/${contactWhatsAppTarget.replace(/[^0-9]/g, "")}`)
                : onEnquire()
            }
          >
            WhatsApp
          </button>
          <div className="flex items-center justify-between text-xs text-white/60">
            <button
              className="rounded-full border border-white/20 px-3 py-1"
              onClick={() => onEnquire()}
            >
              Save
            </button>
            {contactPhone && (
              <button
                className="rounded-full border border-white/20 px-3 py-1"
                onClick={() => copyToClipboard(contactPhone)}
              >
                Copy
              </button>
            )}
          </div>
        </div>
        {trustItems.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
            {trustItems.map((item) => (
              <span key={item} className="rounded-full border border-white/5 bg-surface/5 px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        )}
        {updatedLabel && <div className="text-xs text-white/50">{updatedLabel}</div>}
        {contactName && <div className="text-xs text-white/70">Listed by {contactName}</div>}
        {contactEmail && <div className="text-xs text-white/50">{contactEmail}</div>}
        {contactWhatsapp && <div className="text-xs text-white/50">WhatsApp: {contactWhatsapp}</div>}
      </div>
    </div>
  );
}

function pickNearbyCategoryIcon(category: NearbyCategory["key"]) {
  switch (category) {
    case "atm":
      return "bank";
    case "grocery":
      return "grocery";
    case "pharmacy":
      return "hospital";
    case "school":
      return "school";
    case "hospital":
      return "hospital";
    case "college":
      return "school";
    case "railway":
      return "transit";
    case "bus":
      return "transit";
    case "market":
      return "market";
    case "police":
      return "police";
    case "restaurant":
      return "food";
    case "park":
      return "land";
    default:
      return "nearby";
  }
}

function buildTravelLabel(label: string, km?: number, minutes?: number | null) {
  const distance = km !== undefined ? formatDistance(km) : "-";
  const time = typeof minutes === "number" ? `${minutes} min` : null;
  return time ? `${label}: ${distance} - ${time}` : `${label}: ${distance}`;
}

function copyToClipboard(value: string) {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(value);
  } else {
    const el = document.createElement("textarea");
    el.value = value;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function toObjectPath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("gs://")) return null;
  if (!/^[A-Za-z0-9._/\\-]+$/.test(trimmed)) return null;
  if (!(trimmed.startsWith("tenants/") || trimmed.startsWith("public/"))) return null;
  return trimmed;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-[420px] rounded-3xl bg-surface-strong animate-pulse" />
      <div className="h-12 rounded-2xl bg-surface animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="h-56 rounded-2xl bg-surface animate-pulse" />
          <div className="h-40 rounded-2xl bg-surface animate-pulse" />
          <div className="h-40 rounded-2xl bg-surface animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-surface animate-pulse" />
          <div className="h-48 rounded-2xl bg-surface animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function NearbySkeleton({ dark }: { dark?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
            dark ? "border-white/5 bg-surface/5" : "border-theme bg-surface"
          }`}
        >
          <div className={`h-4 w-24 rounded ${dark ? "bg-surface/10" : "bg-surface-strong"} animate-pulse`} />
          <div className="space-y-2">
            <div className={`h-3 w-48 rounded ${dark ? "bg-surface/10" : "bg-surface"} animate-pulse`} />
            <div className={`h-3 w-40 rounded ${dark ? "bg-surface/10" : "bg-surface"} animate-pulse`} />
            <div className={`h-3 w-32 rounded ${dark ? "bg-surface/10" : "bg-surface"} animate-pulse`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "area":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8v8H8z" />
        </svg>
      );
    case "facing":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l6 6-6 6-6-6 6-6z" />
          <path d="M12 9v12" />
        </svg>
      );
    case "road":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M8 3l-4 18h4l2-6h4l2 6h4l-4-18H8z" />
          <path d="M12 7v2M12 13v2" />
        </svg>
      );
    case "type":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "property":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9z" />
        </svg>
      );
    case "power":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M13 3v9h4l-6 9v-9H7l6-9z" />
        </svg>
      );
    case "water":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case "land":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 17l6-6 4 4 6-6" />
          <path d="M4 20h16" />
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "specs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "bed":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 11h16v6H4z" />
          <path d="M6 11V7h6v4" />
          <path d="M4 17v3M20 17v3" />
        </svg>
      );
    case "bath":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 13h16v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4z" />
          <path d="M7 13V6a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v7" />
        </svg>
      );
    case "floor":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M5 20h14" />
          <path d="M7 4h10v12H7z" />
          <path d="M7 12h10" />
        </svg>
      );
    case "parking":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M6 4h6a4 4 0 0 1 0 8H6z" />
          <path d="M6 4v16" />
        </svg>
      );
    case "sofa":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M5 12h14a2 2 0 0 1 2 2v4H3v-4a2 2 0 0 1 2-2z" />
          <path d="M7 12V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16v13H4z" />
          <path d="M7 3v4M17 3v4M4 11h16" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "pet":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M7 12a3 3 0 0 1 6 0c0 2-1.5 4-3 4s-3-2-3-4z" />
          <path d="M5 8a1.5 1.5 0 1 0 0 .1zM11 6a1.5 1.5 0 1 0 0 .1zM17 8a1.5 1.5 0 1 0 0 .1z" />
        </svg>
      );
    case "money":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "nearby":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3a6 6 0 0 1 6 6c0 4-6 12-6 12S6 13 6 9a6 6 0 0 1 6-6z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "school":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M3 10l9-5 9 5-9 5-9-5z" />
          <path d="M6 12v6h12v-6" />
          <path d="M10 18v-4h4v4" />
        </svg>
      );
    case "hospital":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "grocery":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M6 7h12l-1.5 9H7.5L6 7z" />
          <path d="M9 7V5h6v2" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      );
    case "market":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16l-1 12H5L4 7z" />
          <path d="M7 7V5h10v2" />
          <path d="M8 11h8" />
        </svg>
      );
    case "police":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
          <path d="M12 8v6" />
          <path d="M9 11h6" />
        </svg>
      );
    case "bank":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M4 9h16" />
          <path d="M6 9v8M10 9v8M14 9v8M18 9v8" />
          <path d="M3 21h18" />
          <path d="M12 3l9 6H3l9-6z" />
        </svg>
      );
    case "transit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <rect x="6" y="4" width="12" height="12" rx="2" />
          <path d="M6 14h12" />
          <path d="M8 18l-2 3M16 18l2 3" />
          <circle cx="9" cy="9" r="1" />
          <circle cx="15" cy="9" r="1" />
        </svg>
      );
    case "food":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
          <path d="M6 3v8a3 3 0 0 0 6 0V3" />
          <path d="M12 3v8" />
          <path d="M18 3v7a2 2 0 0 1-2 2h-1v9" />
        </svg>
      );
    default:
      return null;
  }
}




