import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import MapCanvas, { type MapBounds, type MapMarker } from "../../components/map/MapCanvas";
import MapFiltersBar from "../../components/map/MapFiltersBar";
import MarkerPopupCard from "../../components/map/MarkerPopupCard";
import ResultListPanel from "../../components/map/ResultListPanel";
import { TARGET_CITIES } from "../../constants/market";
import {
  getPublicProperties,
  publicListProjects,
  type PublicProject
} from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import { getHeroObjectPath } from "../../utils/media";
import { getPrice, normalizeText } from "../PropertyList/filters";

type MapItem = {
  id: string;
  kind: "property" | "project";
  title: string;
  priceLabel?: string;
  city?: string;
  area?: string;
  thumbPath?: string;
  thumbUrl?: string;
  href: string;
  lat?: number;
  lng?: number;
};

const DEFAULT_CITY = "Chandrapur";
const MAP_CENTER = { lat: 19.9615, lng: 79.2961 };
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const PROJECT_STATUS_OPTIONS = [
  { label: "Planning", value: "planning" },
  { label: "Under construction", value: "under_construction" },
  { label: "Ready", value: "ready" }
];

const PROJECT_TYPE_OPTIONS = [
  { label: "Apartment", value: "apartment" },
  { label: "Plot", value: "plot" },
  { label: "Commercial", value: "commercial" },
  { label: "Mixed", value: "mixed" }
];

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

function buildSearchParams(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) sp.set(key, value);
  });
  const value = sp.toString();
  return value ? `?${value}` : "";
}

function inBounds(item: MapItem, bounds?: MapBounds | null) {
  if (!bounds || item.lat == null || item.lng == null) return false;
  return (
    item.lat <= bounds.north &&
    item.lat >= bounds.south &&
    item.lng <= bounds.east &&
    item.lng >= bounds.west
  );
}

function isMobileView(width: number) {
  return width < 1024;
}

export default function MapSearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState(searchParams.get("city") || DEFAULT_CITY);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [propertyType, setPropertyType] = useState(searchParams.get("pType") || "");
  const [projectType, setProjectType] = useState(searchParams.get("prjType") || "");
  const [projectStatus, setProjectStatus] = useState(searchParams.get("prjStatus") || "");
  const [showProperties, setShowProperties] = useState(
    (searchParams.get("show") || "properties,projects").includes("properties")
  );
  const [showProjects, setShowProjects] = useState(
    (searchParams.get("show") || "properties,projects").includes("projects")
  );
  const [view, setView] = useState(searchParams.get("view") || "map");
  const [isMobile, setIsMobile] = useState(isMobileView(window.innerWidth));

  const [properties, setProperties] = useState<MapItem[]>([]);
  const [projects, setProjects] = useState<MapItem[]>([]);
  const [rawProperties, setRawProperties] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<PublicProject[]>([]);
  const [propertyUrls, setPropertyUrls] = useState<Record<string, string>>({});
  const [projectUrls, setProjectUrls] = useState<Record<string, string>>({});
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"properties" | "projects">("properties");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [appliedBounds, setAppliedBounds] = useState<MapBounds | null>(null);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [mapCenter, setMapCenter] = useState(
    city.toLowerCase() === "chandrapur" ? MAP_CENTER : INDIA_CENTER
  );

  useEffect(() => {
    const handler = () => setIsMobile(isMobileView(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const show = [showProperties ? "properties" : null, showProjects ? "projects" : null]
      .filter(Boolean)
      .join(",");
    setSearchParams(
      {
        city,
        q: query || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        pType: propertyType || undefined,
        prjType: projectType || undefined,
        prjStatus: projectStatus || undefined,
        show: show || undefined,
        view: isMobile ? view : undefined
      },
      { replace: true }
    );
  }, [
    city,
    query,
    minPrice,
    maxPrice,
    propertyType,
    projectType,
    projectStatus,
    showProperties,
    showProjects,
    view,
    isMobile,
    setSearchParams
  ]);

  useEffect(() => {
    setMapCenter(city.toLowerCase() === "chandrapur" ? MAP_CENTER : INDIA_CENTER);
  }, [city]);

  useEffect(() => {
    async function loadProperties() {
      try {
        setLoadingProperties(true);
        const data = await getPublicProperties();
        const unique = new Map<string, any>();
        data.forEach((d: any) => {
          const id = d.id || d.propertyId;
          if (!id) return;
          unique.set(id, { ...d, id });
        });
        const list = Array.from(unique.values());
        const filtered = list.filter((item) => {
          if (city && normalizeText(item.location?.city) !== normalizeText(city)) return false;
          if (propertyType) {
            const typeValue = normalizeText(item.propertyType || item?.listing?.type || item?.type);
            if (typeValue !== normalizeText(propertyType)) return false;
          }
          const q = normalizeText(query);
          if (q) {
            const combined = `${item.title || ""} ${item.location?.city || ""} ${item.location?.locality || ""}`;
            if (!normalizeText(combined).includes(q)) return false;
          }
          const price = getPrice(item);
          if (minPrice && (price == null || price < Number(minPrice))) return false;
          if (maxPrice && (price == null || price > Number(maxPrice))) return false;
          return true;
        });
        const sliced = filtered.slice(0, 200);
        setRawProperties(sliced);
        setProperties(
          sliced.map((item) => {
            const geo = item.location?.geo;
            const lat = typeof geo?.lat === "number" ? geo.lat : item.location?.lat;
            const lng = typeof geo?.lng === "number" ? geo.lng : item.location?.lng;
            const heroPath = getHeroObjectPath(item);
            const price = getPrice(item);
            return {
              id: `property-${item.id}`,
              kind: "property",
              title: item.title || item.name || item.headline || "Untitled",
              priceLabel:
                typeof price === "number"
                  ? new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0
                    }).format(price)
                  : undefined,
              city: item.location?.city || item.location?.citySlug,
              area: item.location?.locality,
              href: `/p/${item.id}`,
              lat: typeof lat === "number" ? lat : undefined,
              lng: typeof lng === "number" ? lng : undefined,
              thumbPath: heroPath || undefined,
              thumbUrl: heroPath ? propertyUrls[heroPath] : undefined
            };
          })
        );
        setPropertyError(null);
      } catch (err: any) {
        setPropertyError(err.message || "Failed to load properties");
      } finally {
        setLoadingProperties(false);
      }
    }
    if (!showProperties) {
      setProperties([]);
      setLoadingProperties(false);
      return;
    }
    loadProperties();
  }, [city, query, minPrice, maxPrice, propertyType, showProperties]);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const data = await publicListProjects({
          city,
          q: query || undefined,
          type: projectType || undefined,
          status: projectStatus || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          limit: 200
        });
        const items = (data.items || []).slice(0, 200);
        setRawProjects(items);
        setProjects(
          items.map((project: PublicProject) => {
            const lat = project.location?.lat;
            const lng = project.location?.lng;
            const coverPath = project.media?.cover?.objectPath;
            return {
              id: `project-${project.id}`,
              kind: "project",
              title: project.name || "Project",
              priceLabel: formatPriceRange(project.priceRange?.min, project.priceRange?.max, project.priceRange?.currency),
              city: project.location?.city,
              area: project.location?.area,
              href: `/projects/${project.slug}`,
              lat: typeof lat === "number" ? lat : undefined,
              lng: typeof lng === "number" ? lng : undefined,
              thumbPath: coverPath || undefined,
              thumbUrl: coverPath ? projectUrls[coverPath] : undefined
            };
          })
        );
        setProjectError(null);
      } catch (err: any) {
        setProjectError(err.message || "Failed to load projects");
      } finally {
        setLoadingProjects(false);
      }
    }
    if (!showProjects) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }
    loadProjects();
  }, [city, query, minPrice, maxPrice, projectType, projectStatus, showProjects]);

  useEffect(() => {
    const heroPaths = new Set<string>();
    rawProperties.forEach((item) => {
      const heroPath = getHeroObjectPath(item);
      if (heroPath && !propertyUrls[heroPath]) heroPaths.add(heroPath);
    });
    if (!heroPaths.size) return;
    hydrateSignedUrls(Array.from(heroPaths).map((objectPath) => ({ objectPath }))).then((items) => {
      setPropertyUrls((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.objectPath] = item.signedUrl;
        });
        return next;
      });
    });
  }, [rawProperties, propertyUrls]);

  useEffect(() => {
    const coverPaths = new Set<string>();
    rawProjects.forEach((project) => {
      const cover = project.media?.cover?.objectPath;
      if (cover && !projectUrls[cover]) coverPaths.add(cover);
    });
    if (!coverPaths.size) return;
    hydrateSignedUrls(Array.from(coverPaths).map((objectPath) => ({ objectPath }))).then((items) => {
      setProjectUrls((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.objectPath] = item.signedUrl;
        });
        return next;
      });
    });
  }, [rawProjects, projectUrls]);

  useEffect(() => {
    if (!mapBounds) return;
    setPendingBounds(mapBounds);
    if (!appliedBounds) setAppliedBounds(mapBounds);
  }, [mapBounds, appliedBounds]);

  const propertyTypeOptions = useMemo(() => {
    const set = new Set<string>();
    rawProperties.forEach((item) => {
      const value = item.propertyType || item?.listing?.type || item?.type;
      if (value) set.add(String(value));
    });
    return Array.from(set).map((value) => ({ label: value, value }));
  }, [rawProperties]);

  const propertyItems = useMemo(
    () =>
      properties.map((item) => ({
        ...item,
        thumbUrl: item.thumbPath ? propertyUrls[item.thumbPath] : undefined
      })),
    [properties, propertyUrls]
  );
  const projectItems = useMemo(
    () =>
      projects.map((item) => ({
        ...item,
        thumbUrl: item.thumbPath ? projectUrls[item.thumbPath] : undefined
      })),
    [projects, projectUrls]
  );

  const propertyInBounds = propertyItems.filter((item) => inBounds(item, appliedBounds));
  const projectInBounds = projectItems.filter((item) => inBounds(item, appliedBounds));
  const propertyNoPin = propertyItems.filter((item) => item.lat == null || item.lng == null);
  const projectNoPin = projectItems.filter((item) => item.lat == null || item.lng == null);

  const markers: MapMarker[] = useMemo(() => {
    const items = [
      ...(showProperties ? propertyInBounds : []),
      ...(showProjects ? projectInBounds : [])
    ];
    return items
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => ({
        id: item.id,
        lat: item.lat as number,
        lng: item.lng as number,
        kind: item.kind,
        popup: (
          <MarkerPopupCard
            title={item.title}
            priceLabel={item.priceLabel}
            city={item.city}
            area={item.area}
            thumbUrl={item.thumbUrl}
            href={item.href}
            kind={item.kind}
          />
        )
      }));
  }, [propertyInBounds, projectInBounds, showProperties, showProjects]);

  const isLoading = loadingProperties || loadingProjects;
  const listSkeleton = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-theme bg-surface/40 p-4 space-y-3 animate-pulse">
          <div className="h-4 w-3/4 rounded bg-surface-strong" />
          <div className="h-3 w-1/2 rounded bg-surface" />
          <div className="h-4 w-1/3 rounded bg-surface" />
        </div>
      )),
    []
  );

  const handleSelectItem = (item: MapItem) => {
    setSelectedId(item.id);
    if (item.lat != null && item.lng != null) {
      setMapCenter({ lat: item.lat, lng: item.lng });
      setView("map");
    } else {
      navigate(item.href);
    }
  };

  const searchThisArea = () => {
    if (pendingBounds) setAppliedBounds(pendingBounds);
  };

  const showSearchArea = pendingBounds && appliedBounds && JSON.stringify(pendingBounds) !== JSON.stringify(appliedBounds);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Map search | ChandaNest</title>
        <meta name="description" content="Explore properties and projects on the map in Chandrapur." />
      </Helmet>

      {isMobile && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("map")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              view === "map" ? "bg-indigo-600 text-white" : "border border-theme text-secondary"
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              view === "list" ? "bg-surface text-primary border border-theme" : "border border-theme text-secondary"
            }`}
          >
            List
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {(!isMobile || view === "list") && (
          <div className="space-y-4">
            <MapFiltersBar
              city={city}
              onCityChange={setCity}
              query={query}
              onQueryChange={setQuery}
              propertyType={propertyType}
              onPropertyTypeChange={setPropertyType}
              projectType={projectType}
              onProjectTypeChange={setProjectType}
              projectStatus={projectStatus}
              onProjectStatusChange={setProjectStatus}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              showProperties={showProperties}
              showProjects={showProjects}
              onToggleProperties={() => setShowProperties((prev) => !prev)}
              onToggleProjects={() => setShowProjects((prev) => !prev)}
              onReset={() => {
                setCity(DEFAULT_CITY);
                setQuery("");
                setMinPrice("");
                setMaxPrice("");
                setPropertyType("");
                setProjectType("");
                setProjectStatus("");
                setShowProperties(true);
                setShowProjects(true);
              }}
              cityOptions={Object.values(TARGET_CITIES).map((c) => ({ label: c.name, value: c.name }))}
              propertyTypeOptions={propertyTypeOptions}
              projectTypeOptions={PROJECT_TYPE_OPTIONS}
              projectStatusOptions={PROJECT_STATUS_OPTIONS}
            />

            {(propertyError || projectError) && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                {propertyError || projectError}
              </div>
            )}

            <div className="rounded-2xl border border-theme bg-surface/40 p-4">
              {isLoading ? (
                <div className="space-y-3">{listSkeleton}</div>
              ) : (
                <ResultListPanel
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  properties={propertyItems}
                  projects={projectItems}
                  propertiesInBounds={propertyInBounds}
                  projectsInBounds={projectInBounds}
                  propertiesNoPin={propertyNoPin}
                  projectsNoPin={projectNoPin}
                  selectedId={selectedId}
                  onSelectItem={handleSelectItem}
                />
              )}
            </div>
          </div>
        )}

        {(!isMobile || view === "map") && (
          <div className="relative">
            {showSearchArea && (
              <button
                type="button"
                onClick={searchThisArea}
                className="absolute left-4 top-4 z-10 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm"
              >
                Search this area
              </button>
            )}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-theme bg-surface/70">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            )}
            <MapCanvas
              center={mapCenter}
              zoom={12}
              markers={markers}
              selectedId={selectedId}
              onBoundsChange={setMapBounds}
              onMarkerSelect={setSelectedId}
              height={isMobile ? 420 : 640}
            />
            <div className="mt-3 flex items-center justify-between text-xs text-secondary">
              <span>
                {markers.length} pinned results in view
              </span>
              <button
                type="button"
                onClick={() => navigate(`/search${buildSearchParams({ city, q: query || undefined })}`)}
                className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-secondary"
              >
                View list
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
