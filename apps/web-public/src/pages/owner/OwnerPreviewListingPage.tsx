import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchListingConfig, getOwnerListing, publishOwnerListing, validateOwnerListing } from "../../services/apiClient";
import { hydrateOwnerSignedUrls } from "../../services/signedMedia";
import { OWNER_TENANT_ID } from "../../constants/marketplace";
import { useOwnerAuth } from "../../hooks/useOwnerAuth";
import { Helmet } from "react-helmet-async";
import PropertyDetailsPage from "../PropertyDetails/PropertyDetailsPage";
import { getHeroObjectPath } from "../../utils/media";
import { fieldSection, friendlyFieldLabel } from "../../utils/fieldLabels";

type GalleryItem = { objectPath: string; signedUrl: string; kind: "image" | "video" };

type ValidationIssue = { path: (string | number)[]; message: string };

type ListingPreviewState = {
  listing: any | null;
  heroSignedUrl?: string;
  galleryItems: GalleryItem[];
  videoItems: GalleryItem[];
};

function isVideoPath(path: string) {
  return path.toLowerCase().endsWith(".mp4");
}

export default function OwnerPreviewListingPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { me } = useOwnerAuth();
  const [listingConfig, setListingConfig] = useState<any>(null);
  const [state, setState] = useState<ListingPreviewState>({ listing: null, galleryItems: [], videoItems: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validation, setValidation] = useState<{ canSubmit: boolean; canPublish: boolean; missing: string[] } | null>(
    null
  );
  const [validationFields, setValidationFields] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      if (!listingId) return;
      setLoading(true);
      setError(null);
      setIssues([]);
      try {
        const [listing, config] = await Promise.all([
          getOwnerListing(OWNER_TENANT_ID, listingId),
          fetchListingConfig(OWNER_TENANT_ID)
        ]);
        setListingConfig(config);
        const v = await validateOwnerListing(OWNER_TENANT_ID, listingId);
        setValidation(v);
        setValidationFields(v.missing || []);

        const heroPath = getHeroObjectPath(listing);
        const gallery = listing.media?.gallery || [];
        const galleryPaths = gallery
          .map((item: any) => item?.objectPath as string | undefined)
          .filter((path: string | undefined): path is string => Boolean(path))
          .filter((path: string) => path !== heroPath);
        const imagePaths = galleryPaths.filter((path: string) => !isVideoPath(path));
        const videoPaths = galleryPaths.filter((path: string) => isVideoPath(path));
        const signPaths = Array.from(new Set([heroPath, ...galleryPaths].filter(Boolean))).filter(
          (path: string): path is string => Boolean(path)
        );
        if (signPaths.length > 0) {
          const hydrated = await hydrateOwnerSignedUrls(signPaths.map((objectPath) => ({ objectPath })));
          const urlMap = new Map(
            hydrated.map((item: { objectPath: string; signedUrl: string }) => [item.objectPath, item.signedUrl])
          );
          const nextGallery = imagePaths
            .map((objectPath: string) => {
              const signedUrl = urlMap.get(objectPath);
              return signedUrl ? { objectPath, signedUrl, kind: "image" as const } : null;
            })
            .filter((item: GalleryItem | null): item is GalleryItem => Boolean(item));
          const nextVideos = videoPaths
            .map((objectPath: string) => {
              const signedUrl = urlMap.get(objectPath);
              return signedUrl ? { objectPath, signedUrl, kind: "video" as const } : null;
            })
            .filter((item: GalleryItem | null): item is GalleryItem => Boolean(item));
          const heroSignedUrl = heroPath ? urlMap.get(heroPath) : undefined;
          setState({ listing, galleryItems: nextGallery, heroSignedUrl, videoItems: nextVideos });
        } else {
          setState({ listing, galleryItems: [], heroSignedUrl: undefined, videoItems: [] });
        }
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          setError("Session expired or access denied. Please login again.");
        } else {
          setError(err.message || "Failed to load preview");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [listingId]);

  const publish = async () => {
    if (!listingId || !state.listing) return;
    if (me?.kycStatus !== "verified") {
      setError("Complete onboarding before publishing.");
      return;
    }
    if (!validation?.canPublish) {
      setError("Complete required fields before publishing.");
      return;
    }
    setPublishing(true);
    setError(null);
    setIssues([]);
    try {
      await publishOwnerListing(OWNER_TENANT_ID, listingId);
      navigate("/owner/my-listings", { state: { justPublishedId: listingId } });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError("Session expired or access denied. Please login again.");
      } else {
        setError(err.message || "Publish failed");
        setIssues(err.issues || []);
        if (err.code === "VALIDATION_FAILED" && Array.isArray(err.fields)) {
          setValidationFields(err.fields);
        }
      }
    } finally {
      setPublishing(false);
    }
  };

  const groupedMissing = validationFields.reduce<Record<string, string[]>>((acc, field) => {
    const section = fieldSection(field);
    if (!acc[section]) acc[section] = [];
    acc[section].push(friendlyFieldLabel(field));
    return acc;
  }, {});

  const banner = (
    <>
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Preview</div>
          <div className="text-sm text-amber-200">
            This is a read-only preview. Review details before publishing.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-amber-500/30 bg-surface px-4 py-2 text-sm font-semibold text-amber-200"
            onClick={() => navigate(`/owner/my-listings/${listingId}/edit`)}
          >
            Edit Listing
          </button>
          <button
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            onClick={() => setConfirmOpen(true)}
            disabled={publishing || !validation?.canPublish}
          >
            {publishing ? "Publishing..." : "Publish Listing"}
          </button>
        </div>
      </div>
      {validationFields.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {Object.entries(groupedMissing).map(([section, fields]) => (
            <div key={section} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{section}</div>
              <ul className="space-y-1">
                {fields.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {error && <div className="mt-3 text-sm text-rose-200">{error}</div>}
      {issues.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-rose-200">
          {issues.map((issue, index) => (
            <li key={`${issue.message}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
    </>
  );

  const listingData = state.listing;
  const previewContent = useMemo(() => {
    if (!listingData) return null;
    return (
      <div className="space-y-6">
        {state.videoItems.length > 0 && (
          <section className="rounded-2xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-primary">Videos</div>
            <div className="grid gap-3 md:grid-cols-2">
              {state.videoItems.map((item) => (
                <video
                  key={item.objectPath}
                  className="w-full rounded-lg input-glass"
                  src={item.signedUrl}
                  controls
                  preload="metadata"
                />
              ))}
            </div>
          </section>
        )}
        <PropertyDetailsPage
          dataOverride={listingData}
          heroSignedUrlOverride={state.heroSignedUrl}
          galleryItemsOverride={state.galleryItems}
          renderBanner={banner}
        />
      </div>
    );
  }, [banner, listingData, state.galleryItems, state.heroSignedUrl, state.videoItems]);

  if (loading) {
    return <div className="text-sm text-secondary">Loading preview...</div>;
  }

  if (!listingData) {
    return <div className="text-sm text-rose-200">Preview unavailable.</div>;
  }

  return (<>
      {previewContent}

      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 space-y-3 shadow-lg">
            <div className="text-lg font-semibold text-primary">Publish listing?</div>
            <div className="text-sm text-secondary">
              Once published, your listing will be visible to the public. You can unpublish later if needed.
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 rounded-full border border-theme px-4 py-2 text-sm font-semibold text-secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={publishing}
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                onClick={async () => {
                  setConfirmOpen(false);
                  await publish();
                }}
                disabled={publishing}
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>);
}



