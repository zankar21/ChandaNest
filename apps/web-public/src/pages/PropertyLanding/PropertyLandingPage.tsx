import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PropertyCard from "../../components/PropertyCard";
import { getPublicProperties, syncTenantForCitySlug } from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import { TARGET_CITIES } from "../../constants/market";
import { buildLandingSeo, slugify } from "../../utils/seo";
import { Helmet } from "react-helmet-async";

type PublicProperty = any;

export default function PropertyLandingPage() {
  const { city, locality } = useParams();
  const citySlug = city ? slugify(city) : "";
  const localitySlug = locality ? slugify(locality) : "";

  const [items, setItems] = useState<PublicProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        await syncTenantForCitySlug(citySlug);
        const data = await getPublicProperties({ citySlug, limit: 100 });
        const filtered = data.filter((p: any) => {
          const pCity = slugify(p.location?.citySlug || p.location?.city || "");
          const pLocality = slugify(p.location?.locality || "");
          if (pCity !== citySlug) return false;
          if (localitySlug) return pLocality === localitySlug;
          return true;
        });
        setItems(filtered);
      } catch (err: any) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    if (!citySlug) {
      setError("City not found");
      setLoading(false);
      return;
    }
    void load();
  }, [citySlug, localitySlug]);

  useEffect(() => {
    async function signVisible(list: PublicProperty[]) {
      const heroPaths = Array.from(
        new Set(
          list
            .map((p) => p.media?.hero?.objectPath as string | undefined)
            .filter((p): p is string => Boolean(p))
        )
      );
      if (heroPaths.length === 0) return;
      const hydrated = await hydrateSignedUrls(heroPaths.map((objectPath) => ({ objectPath })));
      if (hydrated.length === 0) return;
      setUrls((prev) => {
        const map: Record<string, string> = { ...prev };
        hydrated.forEach((h) => {
          map[h.objectPath] = h.signedUrl;
        });
        return map;
      });
    }
    if (items.length) signVisible(items);
  }, [items]);

  const seo = buildLandingSeo({
    city: TARGET_CITIES[citySlug as keyof typeof TARGET_CITIES]?.name || citySlug,
    locality: localitySlug || undefined,
    count: items.length
  });
  const canonicalUrl = `${window.location.origin.replace(/\/+$/, "")}${seo.canonicalPath}`;
  const ogImage = items
    .map((p) => p.media?.hero?.objectPath as string | undefined)
    .filter(Boolean)
    .map((path) => urls[path as string])
    .find(Boolean);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seo.title,
    description: seo.description,
    url: canonicalUrl
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.slice(0, 20).map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${window.location.origin.replace(/\/+$/, "")}/p/${p.id || p.propertyId}`
    }))
  };

  const localityLinks = useMemo(() => {
    if (!items.length) return [];
    const set = new Set(
      items
        .map((p: any) => slugify(p.location?.locality || ""))
        .filter((l) => l && l !== localitySlug)
    );
    return Array.from(set).slice(0, 12);
  }, [items, localitySlug]);

  const cityName = TARGET_CITIES[citySlug as keyof typeof TARGET_CITIES]?.name || citySlug;
  const localityName =
    items.find((p) => slugify(p.location?.locality || "") === localitySlug)?.location?.locality ||
    localitySlug;

  return (
    <div className="space-y-4">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords.join(", ")} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">{JSON.stringify(collectionJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      <nav className="text-xs text-secondary space-x-1">
        <Link to="/" className="text-indigo-600 hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link to="/properties/chandrapur" className="text-indigo-600 hover:underline">
          Properties
        </Link>
        {citySlug && (
          <>
            <span>/</span>
            <span className="text-primary">{cityName}</span>
          </>
        )}
        {localitySlug && (
          <>
            <span>/</span>
            <span className="text-primary">{localityName}</span>
          </>
        )}
      </nav>

      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-primary">
            {localitySlug ? `Properties in ${localityName}, ${cityName}` : `Properties in ${cityName}`}
          </h1>
          <p className="text-sm text-secondary">
            Browse verified listings{localitySlug ? ` in ${localityName}` : ""} across land, plots, flats, and rentals.
            View photos, pricing, and location details on ChandaNest.
          </p>
        </div>
        {localitySlug && (
          <Link
            to={`/properties/${citySlug}`}
            className="rounded-full border border-theme px-3 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300"
          >
            View all in {cityName}
          </Link>
        )}
      </div>

      {localityLinks.length > 0 && !localitySlug && (
        <div className="flex flex-wrap gap-2">
          {localityLinks.map((loc) => (
            <Link
              key={loc}
              to={`/properties/${citySlug}/${loc}`}
              className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-primary hover:border-indigo-200"
            >
              {loc.replace(/-/g, " ")}
            </Link>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <div className="text-sm text-rose-200">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl card-glass border border-theme bg-surface p-4 text-sm text-secondary">
          No properties found {localitySlug ? `in ${localityName}, ${cityName}` : `in ${cityName}`}.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const heroPath = p.media?.hero?.objectPath as string | undefined;
            const heroSignedUrl = heroPath ? urls[heroPath] : undefined;
            return <PropertyCard key={p.id || p.propertyId} property={p} heroSignedUrl={heroSignedUrl} />;
          })}
        </div>
      )}
    </div>
  );
}



