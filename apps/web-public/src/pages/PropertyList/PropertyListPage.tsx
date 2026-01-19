import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PropertyCard, { PublicProperty } from "../../components/PropertyCard";
import FilterBar from "../../components/FilterBar";
import { getPublicProperties } from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import { isTargetCitySlug } from "../../constants/market";
import { Filters, defaultFilters, matches, sortList } from "./filters";
import { getHeroObjectPath } from "../../utils/media";

const PAGE_SIZE = 24;

export default function PropertyListPage({ initialCitySlug }: { initialCitySlug?: string }) {
  const [items, setItems] = useState<PublicProperty[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => {
    const fromParams = parseParams(searchParams);
    return {
      ...defaultFilters,
      ...fromParams,
      city: initialCitySlug || fromParams.city || ""
    };
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPublicProperties();
        const unique = new Map<string, PublicProperty>();
        data.forEach((d: any) => {
          const id = d.id || d.propertyId;
          if (!id) return;
          unique.set(id, { ...d, id });
        });
        setItems(Array.from(unique.values()));
      } catch (err: any) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== "" && val !== null) sp.set(key, String(val));
    });
    setSearchParams(sp, { replace: true });
  }, [filters, setSearchParams]);

  const filtered = useMemo(() => items.filter((p) => matches(p, filters)), [items, filters]);
  const sorted = useMemo(() => sortList(filtered, filters), [filtered, filters]);
  const visibleItems = sorted.slice(0, visibleCount);

  const pathsToSign = useMemo(() => {
    const paths: string[] = [];
    items.forEach((listing: any) => {
      const heroPath = getHeroObjectPath(listing);
      if (heroPath) paths.push(heroPath);
      const gallery = listing?.media?.gallery || [];
      gallery.slice(0, 3).forEach((item: any) => {
        if (item?.objectPath) paths.push(item.objectPath);
      });
    });
    return Array.from(new Set(paths.filter(Boolean)));
  }, [items]);

  useEffect(() => {
    async function signAll() {
      if (pathsToSign.length === 0) return;
      const hydrated = await hydrateSignedUrls(pathsToSign.map((objectPath) => ({ objectPath })));
      if (hydrated.length === 0) return;
      setUrls((prev) => {
        const map: Record<string, string> = { ...prev };
        hydrated.forEach((h) => {
          map[h.objectPath] = h.signedUrl;
        });
        return map;
      });
    }
    signAll();
  }, [pathsToSign]);

  const typeOptions = useMemo(
    () => buildOptions(items.map((i: any) => i?.listing?.type || i?.type)),
    [items]
  );
  const statusOptions = useMemo(
    () => buildOptions(items.map((i: any) => i?.listing?.status || i?.status)),
    [items]
  );
  const cityOptions = useMemo(
    () => buildOptions(items.map((i: any) => i?.location?.city)),
    [items]
  );

  const onRetry = () => {
    setError(null);
    setFilters({ ...filters });
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-primary">Featured Properties</h1>
        <p className="text-sm text-secondary">Premium listings curated for you.</p>
        <div className="pt-2">
          <a
            href={`/advisor${isTargetCitySlug(filters.city) ? `?city=${filters.city}` : ""}`}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Talk to Advisor
          </a>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        cityOptions={cityOptions}
      />

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}{" "}
          <button onClick={onRetry} className="underline font-semibold">
            Retry
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl card-glass border border-theme bg-surface p-6 text-sm text-secondary">
          No properties match your filters.{" "}
          <button onClick={resetFilters} className="underline font-semibold text-indigo-700">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((p) => {
              const heroPath = getHeroObjectPath(p) || null;
              const heroSignedUrl = heroPath ? urls[heroPath] : null;
              return (
                <PropertyCard
                  key={p.id}
                  property={p}
                  heroObjectPath={heroPath}
                  heroSignedUrl={heroSignedUrl}
                />
              );
            })}
          </div>
          {visibleCount < sorted.length && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-full border border-theme px-4 py-2 text-sm font-semibold text-primary hover-border-strong hover:text-primary transition"
              >
                Load more
              </button>
            </div>
          )}
          {import.meta.env.DEV && (
            <DebugPanel
              listings={items.length}
              paths={pathsToSign.length}
              signedCount={Object.keys(urls).length}
              sample={Object.entries(urls).slice(0, 10)}
            />
          )}
        </>
      )}
    </div>
  );
}

function buildOptions(values: (string | undefined)[]) {
  const set = new Set(values.filter(Boolean));
  return Array.from(set).map((v) => ({ label: v as string, value: v as string }));
}

function parseParams(sp: URLSearchParams): Partial<Filters> {
  const num = (key: string) => {
    const v = sp.get(key);
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  return {
    q: sp.get("q") || "",
    city: sp.get("city") || "",
    type: sp.get("type") || "",
    status: sp.get("status") || "",
    sort: (sp.get("sort") as Filters["sort"]) || "newest",
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minArea: num("minArea"),
    maxArea: num("maxArea")
  };
}

function SkeletonGrid() {
  const placeholders = Array.from({ length: 6 });
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {placeholders.map((_, i) => (
        <div key={i} className="rounded-2xl card-glass border border-theme bg-surface shadow-sm overflow-hidden">
          <div className="h-40 w-full bg-surface-strong animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-surface-strong rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-surface-strong rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-surface-strong rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DebugPanel({
  listings,
  paths,
  signedCount,
  sample
}: {
  listings: number;
  paths: number;
  signedCount: number;
  sample: Array<[string, string]>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-30 max-w-md w-full">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-md input-glass bg-surface px-3 py-2 text-xs font-semibold text-secondary shadow"
      >
        {open ? "Hide debug" : "Show debug"}
      </button>
      {open && (
        <div className="mt-2 rounded-md input-glass bg-surface p-3 text-xs text-secondary shadow space-y-2">
          <div>Listings: {listings}</div>
          <div>Paths to sign: {paths}</div>
          <div>Signed URLs: {signedCount}</div>
          <div className="space-y-1">
            {sample.length === 0 && <div>No signed URLs yet.</div>}
            {sample.map(([path, url]) => (
              <div key={path} className="truncate">
                {path} → {url.slice(0, 40)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





