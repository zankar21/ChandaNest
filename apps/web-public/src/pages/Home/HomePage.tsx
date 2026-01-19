import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { type PublicProperty } from "../../components/PropertyCard";
import FeaturedPropertyCard from "../../components/home/FeaturedPropertyCard";
import ProjectCard from "../../components/projects/ProjectCard";
import { ProjectCardSkeleton } from "../../components/projects/ProjectSkeletons";
import { TARGET_CITIES } from "../../constants/market";
import { getPublicProperties, publicListProjects, type PublicProject } from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";
import { getHeroObjectPath } from "../../utils/media";
import heroCityNight from "../../assets/brand/hero-city-night.png";
import heroAbstractDark from "../../assets/brand/hero-abstract-dark.png";
import heroChandrapurDay from "../../assets/brand/hero-chandrapur-day.png";

const PROPERTY_CHIPS = [
  { key: "land", label: "Land" },
  { key: "flat", label: "Flat" },
  { key: "shop", label: "Shop" },
  { key: "project", label: "Project" }
];

const quickCategories = [
  {
    key: "land",
    title: "Land",
    subtitle: "Plots, farmland, and layouts",
    href: "/search?type=land",
    accent: "from-emerald-400/18 via-cyan-400/10 to-transparent",
    icon: "land"
  },
  {
    key: "flat",
    title: "Flat",
    subtitle: "1-4 BHK apartments",
    href: "/search?type=flat",
    accent: "from-indigo-400/18 via-sky-400/10 to-transparent",
    icon: "flat"
  },
  {
    key: "rent",
    title: "Rent",
    subtitle: "Ready-to-move rentals",
    href: "/search?mode=rent",
    accent: "from-fuchsia-400/16 via-indigo-400/10 to-transparent",
    icon: "rent"
  },
  {
    key: "projects",
    title: "Projects",
    subtitle: "Verified new launches",
    href: "/projects",
    accent: "from-cyan-400/22 via-indigo-400/12 to-transparent",
    icon: "projects",
    featured: true
  },
  {
    key: "commercial",
    title: "Commercial",
    subtitle: "Shops, offices, and warehouses",
    href: "/search?type=commercial",
    accent: "from-amber-400/16 via-orange-400/10 to-transparent",
    icon: "commercial"
  }
];

const TRUST_STATS = [
  { label: "Verified listings", value: "120+" },
  { label: "Local experts", value: "15+" },
  { label: "Fast enquiry", value: "< 15 min" }
];

const HERO_VARIANT: "cityNight" | "abstract" | "day" = "cityNight";

const HERO_IMAGES = {
  cityNight: heroCityNight,
  abstract: heroAbstractDark,
  day: heroChandrapurDay
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

function buildSearchParams(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) sp.set(key, value);
  });
  const value = sp.toString();
  return value ? `?${value}` : "";
}

function renderCategoryIcon(icon: string) {
  switch (icon) {
    case "land":
      return (
        <svg className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 17l6-6 4 4 6-6" />
          <path d="M4 20h16" />
        </svg>
      );
    case "flat":
      return (
        <svg className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h2M9 12h2M9 16h2M13 8h2M13 12h2M13 16h2" />
        </svg>
      );
    case "rent":
      return (
        <svg className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9z" />
        </svg>
      );
    case "projects":
      return (
        <svg className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "commercial":
      return (
        <svg className="h-5 w-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 10h16v10H4z" />
          <path d="M6 10V6h12v4" />
          <path d="M9 14h2M13 14h2" />
        </svg>
      );
    default:
      return null;
  }
}

function renderArrowIcon() {
  return (
    <svg className="h-4 w-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [city, setCity] = useState("Chandrapur");
  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState("land");
  const [featuredProperties, setFeaturedProperties] = useState<PublicProperty[]>([]);
  const [propertyUrls, setPropertyUrls] = useState<Record<string, string>>({});
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<PublicProject[]>([]);
  const [projectCoverUrls, setProjectCoverUrls] = useState<Record<string, string>>({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  const heroBg = HERO_IMAGES[HERO_VARIANT];
  const canonicalUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
  const ogImage =
    typeof window !== "undefined"
      ? new URL(heroCityNight, window.location.origin).toString()
      : heroCityNight;
  const metaTitle = "ChandaNest | Real estate in Chandrapur";
  const metaDescription =
    "Discover verified properties and premium projects in Chandrapur with ChandaNest.";

  useEffect(() => {
    async function loadProperties() {
      try {
        setLoadingProperties(true);
        const data = await getPublicProperties();
        const unique = new Map<string, PublicProperty>();
        data.forEach((d: any) => {
          const id = d.id || d.propertyId;
          if (!id) return;
          unique.set(id, { ...d, id });
        });
        const list = Array.from(unique.values());
        const byCity = list.filter((item) => (item?.location?.city || "").toLowerCase() === city.toLowerCase());
        const candidate = byCity.length ? byCity : list;
        const deduped: PublicProperty[] = [];
        const seen = new Set<string>();
        const formatPriceKey = (item: PublicProperty) => {
          const amount =
            item.pricing?.totalPrice ?? item.pricing?.rentPerMonth ?? item.pricing?.amount ?? "";
          return String(amount);
        };
        const titleKey = (item: PublicProperty) =>
          (item.title || item.name || item.headline || "").toLowerCase().trim();
        candidate.forEach((item) => {
          const key = `${titleKey(item)}|${formatPriceKey(item)}`;
          if (!titleKey(item)) return;
          if (seen.has(key)) return;
          seen.add(key);
          deduped.push(item);
        });
        const sorted = deduped.sort((a, b) => {
          const aSeeded = titleKey(a).includes("seeded public property");
          const bSeeded = titleKey(b).includes("seeded public property");
          if (aSeeded !== bSeeded) return aSeeded ? 1 : -1;
          const aHasMedia = Boolean(getHeroObjectPath(a));
          const bHasMedia = Boolean(getHeroObjectPath(b));
          if (aHasMedia !== bHasMedia) return aHasMedia ? -1 : 1;
          return 0;
        });
        setFeaturedProperties(sorted.slice(0, 6));
      } catch (err: any) {
        setPropertyError(err.message || "Failed to load featured properties");
      } finally {
        setLoadingProperties(false);
      }
    }
    loadProperties();
  }, [city]);

  useEffect(() => {
    const paths = new Set<string>();
    featuredProperties.forEach((listing) => {
      const heroPath = getHeroObjectPath(listing);
      if (heroPath) paths.add(heroPath);
    });
    if (paths.size === 0) return;
    hydrateSignedUrls(Array.from(paths).map((objectPath) => ({ objectPath }))).then((items) => {
      if (!items.length) return;
      setPropertyUrls((prev) => {
        const map = { ...prev };
        items.forEach((item) => {
          map[item.objectPath] = item.signedUrl;
        });
        return map;
      });
    });
  }, [featuredProperties]);

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const data = await publicListProjects({ city, limit: 6 });
        setFeaturedProjects(data.items || []);
      } catch (err: any) {
        setProjectError(err.message || "Failed to load featured projects");
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, [city]);

  useEffect(() => {
    const coverPaths = featuredProjects
      .map((project) => project.media?.cover?.objectPath)
      .filter((path): path is string => Boolean(path))
      .filter((path) => !projectCoverUrls[path]);
    if (!coverPaths.length) return;
    hydrateSignedUrls(coverPaths.map((objectPath) => ({ objectPath }))).then((items) => {
      if (!items.length) return;
      setProjectCoverUrls((prev) => {
        const map = { ...prev };
        items.forEach((item) => {
          map[item.objectPath] = item.signedUrl;
        });
        return map;
      });
    });
  }, [featuredProjects, projectCoverUrls]);

  const handleSearch = () => {
    if (activeChip === "project") {
      navigate(`/projects${buildSearchParams({ city, q: query || undefined })}`);
      return;
    }
    navigate(`/search${buildSearchParams({ city, q: query || undefined, type: activeChip })}`);
  };

  const propertySkeletons = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-3xl border border-white/10 bg-surface/40 p-4 space-y-3 animate-pulse"
        >
          <div className="h-44 rounded-2xl bg-surface-strong" />
          <div className="h-4 w-2/3 rounded bg-surface" />
          <div className="h-3 w-1/2 rounded bg-surface" />
          <div className="h-5 w-1/3 rounded bg-surface" />
        </div>
      )),
    []
  );

  return (
    <div className="overflow-x-hidden">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage} />
      </Helmet>

      <section
        className="relative w-full overflow-hidden"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(3,4,8,0.75)_70%,rgba(3,4,8,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(45,212,191,0.18),transparent_55%)] blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_30%,rgba(129,140,248,0.22),transparent_60%)] blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(125,211,252,0.14),transparent_50%)] mix-blend-screen" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#0b0d14]" />
        <div className="relative min-h-[520px] md:min-h-[560px]">
          <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
            <div className="relative max-w-[720px] space-y-4">
              <div className="pointer-events-none absolute -left-10 top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.22),transparent_70%)] blur-2xl" />
              <div className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-secondary backdrop-blur">
                Premium marketplace for Chandrapur
              </div>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-primary md:text-6xl">
                Find property in Chandrapur
              </h1>
              <p className="text-sm text-secondary/80 md:text-base">
                Curated listings, verified projects, and local experts to help you move fast.
              </p>
            </div>

            <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-white/15 via-transparent to-transparent" />
              <div className="grid gap-3 md:grid-cols-[200px_1fr_auto_auto] md:items-end">
                <div>
                  <label className="text-xs text-secondary">City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-primary outline-none transition duration-200 ease-out focus:ring-2 focus:ring-indigo-500/60"
                  >
                  {Object.values(TARGET_CITIES).map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary">Search</label>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Area, landmark, or builder"
                    className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-primary outline-none transition duration-200 ease-out focus:ring-2 focus:ring-indigo-500/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  className="h-11 w-full rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-[0_12px_30px_rgba(79,70,229,0.45)] md:w-auto"
                >
                  Search
                </button>
                <Link
                  to="/owner/post-property"
                  className="h-11 w-full rounded-full border border-white/10 px-4 text-center text-xs font-semibold text-secondary transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/30 md:w-auto"
                >
                  Post Property
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {PROPERTY_CHIPS.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setActiveChip(chip.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition duration-200 ease-out hover:-translate-y-0.5 ${
                      activeChip === chip.key
                        ? "bg-indigo-600 text-white shadow-[0_0_18px_rgba(99,102,241,0.4)]"
                        : "border border-white/10 text-secondary hover:border-white/30"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-secondary">
                {TRUST_STATS.map((stat) => (
                  <span
                    key={stat.label}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-1"
                  >
                    {stat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="h-6 w-0.5 rounded-full bg-white/20 animate-pulse" />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">Quick categories</h2>
            <p className="text-sm text-secondary">Explore curated entry points across the marketplace.</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-5 md:gap-5">
            {quickCategories.map((card) => (
              <Link
                key={card.key}
                to={card.href}
                className={`group relative min-w-[260px] snap-start rounded-2xl border bg-white/[0.03] p-5 transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.05] hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 ${
                  card.featured ? "border-white/16" : "border-white/10"
                }`}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accent}`} />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 ring-1 ring-white/12">
                      {renderCategoryIcon(card.icon)}
                    </div>
                    {card.featured && (
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Featured
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-primary">{card.title}</div>
                    <div className="mt-1 text-sm text-white/65">{card.subtitle}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-secondary">
                    <span className="font-semibold">Explore</span>
                    <span className="transition duration-200 ease-out group-hover:translate-x-1">
                      {renderArrowIcon()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-primary">Featured properties</h2>
              <p className="text-sm text-secondary">Fresh listings in {city} with verified owners.</p>
            </div>
            <Link to={`/search${buildSearchParams({ city })}`} className="text-sm font-semibold text-secondary">
              View all
            </Link>
          </div>
          {loadingProperties ? (
            <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-6">
              {propertySkeletons}
            </div>
          ) : propertyError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {propertyError}
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-surface/40 p-6 text-sm text-secondary">
              <div className="text-lg font-semibold text-primary">No featured listings yet</div>
              <div className="mt-2 text-sm text-secondary">
                Explore the full marketplace to find available listings.
              </div>
              <Link
                to={`/search${buildSearchParams({ city })}`}
                className="mt-4 inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Explore all
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-6">
              {featuredProperties.map((property, idx) => {
                const heroPath = getHeroObjectPath(property);
                const heroSignedUrl = heroPath ? propertyUrls[heroPath] : undefined;
                return (
                  <div
                    key={property.id}
                    className={`snap-start min-w-[260px] sm:min-w-[300px] ${idx >= 4 ? "hidden md:block" : ""}`}
                  >
                    <FeaturedPropertyCard property={property} heroUrl={heroSignedUrl} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-primary">Featured projects</h2>
              <p className="text-sm text-secondary">Handpicked launches and ready projects in {city}.</p>
            </div>
            <Link to={`/projects${buildSearchParams({ city })}`} className="text-sm font-semibold text-secondary">
              View all
            </Link>
          </div>
          {loadingProjects ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProjectCardSkeleton key={idx} />
              ))}
            </div>
          ) : projectError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {projectError}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  slug={project.slug}
                  name={project.name}
                  city={project.location?.city}
                  area={project.location?.area}
                  type={project.type}
                  status={project.status}
                  priceLabel={formatPriceRange(project.priceRange?.min, project.priceRange?.max, project.priceRange?.currency)}
                  coverUrl={project.media?.cover?.objectPath ? projectCoverUrls[project.media.cover.objectPath] : undefined}
                />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-theme bg-surface/50 p-6 space-y-3">
            <div className="text-sm font-semibold text-primary">Explore on map</div>
            <p className="text-sm text-secondary">
              Scan neighborhoods to compare listings quickly. Map view will deepen as more data arrives.
            </p>
            <Link
              to={`/map${buildSearchParams({ city })}`}
              className="inline-flex items-center rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary hover-border-strong"
            >
              Open map view
            </Link>
          </div>
          <div className="rounded-3xl border border-theme bg-surface/40 p-6">
            <div className="text-sm font-semibold text-primary">Trusted by locals</div>
            <div className="mt-4 grid gap-4">
              {TRUST_STATS.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm text-secondary">
                  <span>{stat.label}</span>
                  <span className="text-base font-semibold text-primary">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
