import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { createPublicLead, getOwnerTenantId, publicGetProject, type PublicProject } from "../../services/apiClient";
import { hydrateSignedUrls } from "../../services/signedMedia";

type SignedMedia = { objectPath: string; signedUrl: string };

type ProjectMeta = {
  heroUrl?: string;
  gallery: SignedMedia[];
  brochureUrl?: string;
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

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function ProjectDetailsPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [meta, setMeta] = useState<ProjectMeta>({ gallery: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "success" | "error">("idle");
  const [leadError, setLeadError] = useState<string | null>(null);

  useEffect(() => {
    const slugValue = slug ?? "";
    if (!slugValue) {
      setLoading(false);
      setError("Missing project slug");
      return;
    }
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await publicGetProject(slugValue);
        if (!active) return;
        setProject(data);

        const coverPath = data.media?.cover?.objectPath;
        const galleryPaths = (data.media?.gallery || []).map((item) => item.objectPath).filter(Boolean);
        const brochurePath = data.media?.brochure?.objectPath;
        const signTargets = [coverPath, brochurePath, ...galleryPaths].filter(
          (path): path is string => Boolean(path)
        );
        const signed = signTargets.length
          ? await hydrateSignedUrls(signTargets.map((objectPath) => ({ objectPath })))
          : [];
        if (!active) return;
        const map = new Map(signed.map((item) => [item.objectPath, item.signedUrl]));
        setMeta({
          heroUrl: coverPath ? map.get(coverPath) : undefined,
          gallery: galleryPaths
            .map((objectPath) => {
              const signedUrl = map.get(objectPath);
              if (!signedUrl) return null;
              return { objectPath, signedUrl };
            })
            .filter((item): item is SignedMedia => Boolean(item)),
          brochureUrl: brochurePath ? map.get(brochurePath) : undefined
        });
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load project");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (searchParams.get("enquire") === "1") {
      setShowEnquiry(true);
      searchParams.delete("enquire");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const locationLine = useMemo(() => {
    if (!project?.location) return null;
    const { area, city, addressLine } = project.location;
    return [area, city, addressLine].filter(Boolean).join(", ");
  }, [project]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[320px] rounded-3xl bg-surface-strong animate-pulse" />
        <div className="h-10 rounded-2xl bg-surface animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;
  if (!project) return null;

  const priceLabel = formatPriceRange(project.priceRange?.min, project.priceRange?.max, project.priceRange?.currency);
  const updatedLabel = formatDate(project.updatedAt);
  const gallery = meta.gallery;

  return (
    <div className="space-y-8">
      <Helmet>
        <title>{project.name} | ChandaNest Projects</title>
        <meta
          name="description"
          content={`Discover ${project.name} in ${project.location?.city || "India"} with curated unit options.`}
        />
      </Helmet>

      <div className="relative overflow-hidden rounded-3xl border border-theme card-glass">
        <div className="h-[320px] w-full">
          {meta.heroUrl ? (
            <img src={meta.heroUrl} alt={project.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-strong text-sm text-muted">
              Cover image pending
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-6 bottom-6 space-y-2">
          <div className="text-3xl font-semibold text-white">{project.name}</div>
          <div className="text-sm text-white/70">{locationLine || "Location pending"}</div>
          <div className="text-sm font-semibold text-white">{priceLabel}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="card-glass border border-theme p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-primary">Project overview</div>
                {updatedLabel && <div className="text-xs text-secondary">Updated {updatedLabel}</div>}
              </div>
              <Link
                to={`/projects/${project.slug}/units`}
                className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white"
              >
                View units
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-theme bg-surface/60 p-4">
                <div className="text-xs uppercase tracking-wide text-secondary">Type</div>
                <div className="mt-2 text-sm font-semibold text-primary">{project.type || "-"}</div>
              </div>
              <div className="rounded-2xl border border-theme bg-surface/60 p-4">
                <div className="text-xs uppercase tracking-wide text-secondary">Status</div>
                <div className="mt-2 text-sm font-semibold text-primary">{project.status || "-"}</div>
              </div>
              <div className="rounded-2xl border border-theme bg-surface/60 p-4">
                <div className="text-xs uppercase tracking-wide text-secondary">Units</div>
                <div className="mt-2 text-sm font-semibold text-primary">
                  {project.counts?.availableUnits ?? "-"} available / {project.counts?.totalUnits ?? "-"} total
                </div>
              </div>
            </div>
          </div>

          {project.highlights?.length ? (
            <div className="card-glass border border-theme p-6 shadow-sm">
              <div className="text-lg font-semibold text-primary">Highlights</div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {project.highlights.map((item) => (
                  <span key={item} className="rounded-full border border-theme px-3 py-1 text-secondary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {project.amenities?.length ? (
            <div className="card-glass border border-theme p-6 shadow-sm">
              <div className="text-lg font-semibold text-primary">Amenities</div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {project.amenities.map((item) => (
                  <span key={item} className="rounded-full border border-theme px-3 py-1 text-secondary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {gallery.length ? (
            <div className="card-glass border border-theme p-6 shadow-sm">
              <div className="text-lg font-semibold text-primary">Gallery</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {gallery.map((item) => (
                  <img
                    key={item.objectPath}
                    src={item.signedUrl}
                    alt={project.name}
                    className="h-52 w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-theme bg-surface/60 p-6 shadow-sm">
            <div className="text-sm text-secondary">City</div>
            <div className="mt-2 text-lg font-semibold text-primary">{project.location?.city || "-"}</div>
            {project.location?.area && (
              <div className="mt-1 text-sm text-secondary">{project.location.area}</div>
            )}
            <div className="mt-4 text-sm text-secondary">Price range</div>
            <div className="mt-1 text-lg font-semibold text-primary">{priceLabel}</div>
            <div className="mt-4 text-sm text-secondary">Availability</div>
            <div className="mt-1 text-lg font-semibold text-primary">
              {project.counts?.availableUnits ?? "-"} units available
            </div>
            <button
              className="mt-5 w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setShowEnquiry(true)}
            >
              Enquire
            </button>
          </div>

          {meta.brochureUrl ? (
            <a
              href={meta.brochureUrl}
              className="block rounded-2xl border border-theme bg-surface/60 px-4 py-3 text-center text-sm font-semibold text-primary"
              target="_blank"
              rel="noreferrer"
            >
              View brochure
            </a>
          ) : null}
        </div>
      </div>

      {showEnquiry && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 space-y-4">
            <div className="text-lg font-semibold text-primary">Enquire about this project</div>
            <div className="text-sm text-secondary">
              Share your details and we will connect you with the project team.
            </div>
            {leadStatus === "success" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Thanks! We will contact you soon.
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!project) return;
                  setLeadSubmitting(true);
                  setLeadError(null);
                  setLeadStatus("idle");
                  try {
                    const sourceParam = searchParams.get("source");
                    const sourcePage =
                      sourceParam === "map" || sourceParam === "search" || sourceParam === "home"
                        ? sourceParam
                        : "project";
                    await createPublicLead({
                      tenantId: getOwnerTenantId(),
                      subject: {
                        kind: "project",
                        projectId: project.id,
                        projectSlug: project.slug,
                        title: project.name,
                        href: window.location.href,
                        city: project.location?.city || undefined,
                        area: project.location?.area || undefined
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
