import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  publicListProjects,
  type PublicProject
} from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import ProjectCard from "../../components/projects/ProjectCard";
import ProjectFiltersBar from "../../components/projects/ProjectFiltersBar";
import { ProjectCardSkeleton } from "../../components/projects/ProjectSkeletons";

type FilterState = {
  city: string;
  q: string;
  type: string;
  status: string;
  minPrice: string;
  maxPrice: string;
};

const defaultFilters: FilterState = {
  city: "Chandrapur",
  q: "",
  type: "",
  status: "",
  minPrice: "",
  maxPrice: ""
};

function formatPriceRange(min?: number, max?: number, currency?: string) {
  if (min == null && max == null) return "Price on request";
  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  });
  if (min != null && max != null) return `${fmt.format(min)} - ${fmt.format(max)}`;
  if (min != null) return `Starting from ${fmt.format(min)}`;
  return fmt.format(max || 0);
}

export default function ProjectsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => ({
    city: searchParams.get("city") || defaultFilters.city,
    q: searchParams.get("q") || "",
    type: searchParams.get("type") || "",
    status: searchParams.get("status") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || ""
  }));
  const [items, setItems] = useState<PublicProject[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFilters = async (reset: boolean) => {
    const params = {
      city: filters.city || undefined,
      q: filters.q || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      limit: 12,
      cursor: reset ? undefined : cursor
    };
    try {
      setError(null);
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const data = await publicListProjects(params);
      const nextItems = reset ? data.items : [...items, ...data.items];
      setItems(nextItems);
      setCursor(data.nextCursor);

      const coverPaths = nextItems
        .map((project) => project.media?.cover?.objectPath)
        .filter((path): path is string => Boolean(path))
        .filter((path) => !coverUrls[path]);
      if (coverPaths.length) {
        const hydrated = await hydrateSignedUrls(coverPaths.map((objectPath) => ({ objectPath })));
        const map: Record<string, string> = { ...coverUrls };
        hydrated.forEach((item) => {
          map[item.objectPath] = item.signedUrl;
        });
        setCoverUrls(map);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.city) next.set("city", filters.city);
    if (filters.q) next.set("q", filters.q);
    if (filters.type) next.set("type", filters.type);
    if (filters.status) next.set("status", filters.status);
    if (filters.minPrice) next.set("minPrice", filters.minPrice);
    if (filters.maxPrice) next.set("maxPrice", filters.maxPrice);
    setSearchParams(next, { replace: true });
    applyFilters(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.city, filters.q, filters.type, filters.status, filters.minPrice, filters.maxPrice]);

  const hasFilters = useMemo(() => {
    return (
      filters.q ||
      filters.type ||
      filters.status ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.city !== defaultFilters.city
    );
  }, [filters]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Projects in {filters.city || "India"} | ChandaNest</title>
        <meta
          name="description"
          content={`Explore residential, plotted, and commercial projects in ${filters.city || "India"} with ChandaNest.`}
        />
      </Helmet>

      <div className="card-glass border border-theme p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">Projects</h1>
        <p className="text-sm text-secondary">
          Explore premium residential, plotted, and commercial projects in {filters.city || "India"}.
        </p>
      </div>

      <ProjectFiltersBar
        value={filters}
        onChange={setFilters}
        onApply={() => applyFilters(true)}
        onReset={() => {
          setFilters(defaultFilters);
          setCursor(undefined);
        }}
      />

      {error && <div className="text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <ProjectCardSkeleton key={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card-glass border border-theme p-6 text-center text-sm text-secondary">
          <div className="text-base font-semibold text-primary">No projects found.</div>
          <button
            className="mt-3 rounded-md border border-theme px-4 py-2 text-sm font-semibold text-secondary hover-border-strong"
            onClick={() => setFilters(defaultFilters)}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((project) => (
              <ProjectCard
                key={project.id}
                slug={project.slug}
                name={project.name}
                city={project.location?.city}
                area={project.location?.area}
                type={project.type}
                status={project.status}
                priceLabel={formatPriceRange(project.priceRange?.min, project.priceRange?.max, project.priceRange?.currency)}
                coverUrl={project.media?.cover?.objectPath ? coverUrls[project.media.cover.objectPath] : undefined}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <button
              className="btn-primary px-6 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => applyFilters(false)}
              disabled={!cursor || loadingMore}
            >
              {loadingMore ? "Loading..." : cursor ? "Load more" : "No more results"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
