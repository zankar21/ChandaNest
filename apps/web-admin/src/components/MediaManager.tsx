import { useEffect, useRef, useState } from "react";
import { patchListingMedia, patchProjectMedia, signGetMedia, signPutMedia } from "../services/apiClient";

type MediaItem = {
  objectPath: string;
  contentType?: string;
  fileName?: string;
  kind?: "image" | "video";
};

type Props = {
  propertyId?: string;
  projectId?: string;
  tenantId: string;
  media: { hero?: MediaItem | null; gallery?: MediaItem[] };
  onChange: (next: { hero?: MediaItem | null; gallery?: MediaItem[] }) => void;
  allowVideo?: boolean;
  maxItems?: number;
  maxVideos?: number;
  maxVideoBytes?: number;
  requireHeroImage?: boolean;
  onEnsureId?: () => Promise<string | null>;
};

const cache = new Map<string, string>();

function isVideoItem(item: MediaItem) {
  if (item.kind === "video") return true;
  if (item.contentType?.startsWith("video/")) return true;
  return item.objectPath.toLowerCase().endsWith(".mp4");
}

function isVideoFile(file: File) {
  return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
}

export default function MediaManager({
  propertyId,
  projectId,
  tenantId,
  media,
  onChange,
  allowVideo = false,
  maxItems = 25,
  maxVideos = 3,
  maxVideoBytes = 60 * 1024 * 1024,
  requireHeroImage = false,
  onEnsureId
}: Props) {
  const [heroSignedUrl, setHeroSignedUrl] = useState<string | null>(null);
  const [gallerySignedMap, setGallerySignedMap] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const resourceId = propertyId || projectId;
  const resourceType = projectId ? "projects" : "listings";

  useEffect(() => {
    async function hydrate() {
      const paths: string[] = [];
      if (media.hero?.objectPath) paths.push(media.hero.objectPath);
      (media.gallery || []).forEach((g) => g.objectPath && paths.push(g.objectPath));
      const uncached = paths.filter((p) => !cache.has(p));
      if (uncached.length) {
        try {
          const signed = await signGetMedia(uncached);
          Object.entries(signed).forEach(([k, v]) => cache.set(k, v));
        } catch {
          // ignore
        }
      }
      const map: Record<string, string> = {};
      (media.gallery || []).forEach((g) => {
        const u = cache.get(g.objectPath);
        if (u) map[g.objectPath] = u;
      });
      setHeroSignedUrl(media.hero?.objectPath ? cache.get(media.hero.objectPath) || null : null);
      setGallerySignedMap(map);
    }
    hydrate();
  }, [media.hero?.objectPath, media.gallery]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!tenantId) {
      setError("Missing tenant.");
      return;
    }
    let effectiveId = resourceId;
    if (!effectiveId && onEnsureId) {
      effectiveId = (await onEnsureId()) || undefined;
    }
    if (!effectiveId) {
      setError("Save this item before uploading media.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const existingGallery = media.gallery || [];
      const existingVideos = existingGallery.filter(isVideoItem).length;
      const incoming = Array.from(files);
      if (existingGallery.length + incoming.length > maxItems) {
        throw new Error(`Gallery limit is ${maxItems} items.`);
      }
      const uploaded: MediaItem[] = [];
      let nextVideoCount = existingVideos;
      for (const file of incoming) {
        const isVideo = isVideoFile(file);
        if (isVideo && !allowVideo) {
          throw new Error("Videos are not allowed here.");
        }
        if (!isVideo && !file.type.startsWith("image/")) {
          throw new Error("Only image files are allowed.");
        }
        if (isVideo) {
          if (file.type !== "video/mp4") {
            throw new Error("Only MP4 videos are supported.");
          }
          if (file.size > maxVideoBytes) {
            throw new Error(`Video must be under ${Math.floor(maxVideoBytes / (1024 * 1024))}MB.`);
          }
          nextVideoCount += 1;
          if (nextVideoCount > maxVideos) {
            throw new Error(`You can upload up to ${maxVideos} videos.`);
          }
        }
        const effectiveBasePath = `tenants/${tenantId}/${resourceType}/${effectiveId}/media`;
        const objectPath = `${effectiveBasePath}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name}`;
        const sign = await signPutMedia(objectPath, file.type);
        const putRes = await fetch(sign.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!putRes.ok) throw new Error("Upload failed");
        uploaded.push({
          objectPath,
          contentType: file.type,
          fileName: file.name,
          kind: isVideo ? "video" : "image"
        });
      }
      const nextGallery = [...(media.gallery || []), ...uploaded];
      if (projectId) {
        await patchProjectMedia(tenantId, effectiveId, { hero: media.hero, gallery: nextGallery });
      } else {
        await patchListingMedia(tenantId, effectiveId, { hero: media.hero, gallery: nextGallery });
      }
      onChange({ hero: media.hero, gallery: nextGallery });
      if (uploaded.length === 1) {
        setMessage("1 item added to gallery");
      } else {
        setMessage(`${uploaded.length} items added to gallery`);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const setHero = async (item: MediaItem | null) => {
    try {
      if (!resourceId) throw new Error("Missing media owner");
      if (item && requireHeroImage && isVideoItem(item)) {
        throw new Error("Hero must be an image.");
      }
      if (projectId) {
        await patchProjectMedia(tenantId, resourceId, { hero: item, gallery: media.gallery || [] });
      } else {
        await patchListingMedia(tenantId, resourceId, { hero: item, gallery: media.gallery || [] });
      }
      onChange({ hero: item, gallery: media.gallery || [] });
      setMessage(item ? "Hero image updated" : "Hero removed");
    } catch (err: any) {
      setError(err.message || "Failed to set hero");
    }
  };

  const removeItem = async (index: number) => {
    const next = (media.gallery || []).filter((_, i) => i !== index);
    try {
      if (!resourceId) throw new Error("Missing media owner");
      if (projectId) {
        await patchProjectMedia(tenantId, resourceId, { hero: media.hero, gallery: next });
      } else {
        await patchListingMedia(tenantId, resourceId, { hero: media.hero, gallery: next });
      }
      onChange({ hero: media.hero, gallery: next });
      setMessage("Gallery item removed");
    } catch (err: any) {
      setError(err.message || "Failed to remove");
    }
  };

  const handleReorder = async (from: number, to: number) => {
    const list = [...(media.gallery || [])];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    try {
      if (!resourceId) throw new Error("Missing media owner");
      if (projectId) {
        await patchProjectMedia(tenantId, resourceId, { hero: media.hero, gallery: list });
      } else {
        await patchListingMedia(tenantId, resourceId, { hero: media.hero, gallery: list });
      }
      onChange({ hero: media.hero, gallery: list });
      setMessage("Reordered");
    } catch (err: any) {
      setError(err.message || "Failed to reorder");
    }
  };

  const openPreview = (item: MediaItem, url?: string) => {
    if (!url) return;
    setPreviewItem(item);
    setPreviewUrl(url);
  };

  const closePreview = () => {
    setPreviewItem(null);
    setPreviewUrl(null);
  };

  return (
  <div className="rounded-2xl card-glass border border-theme p-6 shadow-sm space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs text-muted">
          Add a hero image and gallery assets. Videos must be MP4.
        </p>
      </div>
      <div className="text-xs text-muted">{uploading ? "Uploading..." : message}</div>
    </div>

    <div className="flex flex-wrap gap-2 text-[11px] text-secondary">
      {requireHeroImage && <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">Hero image required</span>}
      <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">Max {maxItems} items</span>
      {allowVideo && <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">Max {maxVideos} videos</span>}
      {allowVideo && (
        <span className="rounded-full bg-surface px-2.5 py-1 font-semibold">MP4 videos - Max ${Math.floor(maxVideoBytes / (1024 * 1024))}MB</span>
      )}
    </div>

    {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div
          className="group relative overflow-hidden rounded-2xl border border-theme bg-surface shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/40"
          tabIndex={0}
        >
          {heroSignedUrl ? (
            <img src={heroSignedUrl} alt="Hero" className="h-64 w-full object-cover" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center bg-surface-strong text-sm text-muted">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-theme bg-surface text-muted">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 7h4l2-2h4l2 2h4v12H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
                <div className="text-sm font-semibold text-primary">Upload hero image</div>
                <div className="text-xs text-muted">(Recommended: front-facing, daylight)</div>
              </div>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
            HERO
          </span>
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100">
            <div className="flex w-full items-center justify-end gap-2 p-3">
              <button
                type="button"
                onClick={() => heroSignedUrl && openPreview(media.hero as MediaItem, heroSignedUrl)}
                className="rounded-md bg-surface/90 px-2.5 py-1 text-xs font-semibold text-primary"
                aria-label="View hero"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                className="rounded-md bg-surface/90 px-2.5 py-1 text-xs font-semibold text-primary"
                aria-label="Replace hero"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setHero(null)}
                className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                aria-label="Remove hero"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => heroInputRef.current?.click()}
            className="btn-primary px-4 py-2 text-xs font-semibold"
          >
            Upload hero image
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="rounded-full border border-theme px-4 py-2 text-xs font-semibold text-primary hover-border-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!resourceId}
          >
            Add to gallery
          </button>
          <p className="text-xs text-muted">Uploads are added to the gallery; set hero from gallery if needed.</p>
        </div>
        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept={allowVideo ? "image/*,video/mp4" : "image/*"}
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-primary">Gallery</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(media.gallery || []).map((item, index) => {
            const url = gallerySignedMap[item.objectPath];
            const isVideo = isVideoItem(item);
            return (
              <div
                key={item.objectPath}
                className="group relative overflow-hidden rounded-2xl border border-theme bg-surface shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/40"
                draggable
                tabIndex={0}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  handleReorder(dragIndex, index);
                  setDragIndex(null);
                }}
              >
                {url ? (
                  isVideo ? (
                    <div className="relative h-36 w-full bg-black">
                      <video src={url} className="h-36 w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="rounded-full bg-surface/90 px-2 py-1 text-[10px] font-semibold text-primary">
                          MP4
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img src={url} alt={item.objectPath} className="h-36 w-full object-cover" />
                  )
                ) : (
                  <div className="h-36 w-full bg-surface-strong animate-pulse" />
                )}
                {isVideo && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    MP4
                  </span>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100">
                  <div className="flex w-full flex-wrap items-center justify-between gap-2 p-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => url && openPreview(item, url)}
                        className="rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-primary"
                        aria-label="View item"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-primary"
                        aria-label="Replace item"
                      >
                        Replace
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHero(item)}
                        className="rounded-md bg-surface/90 px-2 py-1 text-[11px] font-semibold text-primary disabled:opacity-60"
                        disabled={requireHeroImage && isVideoItem(item)}
                        aria-label="Set hero"
                      >
                        Set hero
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white"
                        aria-label="Remove item"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-2 py-2 text-[11px] text-secondary truncate">
                  {item.fileName || item.objectPath.split("/").pop()}
                </div>
              </div>
            );
          })}
          {(media.gallery || []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-theme p-4 text-sm text-secondary">
              <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                <div className="text-sm font-semibold text-primary">No gallery items yet.</div>
                <div className="text-xs text-muted">Add photos or MP4 videos (max 3).</div>
                <div className="flex items-center gap-2 text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-strong" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-strong" />
                  <span className="h-1.5 w-1.5 rounded-full bg-surface-strong" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {previewItem && previewUrl && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-3xl rounded-2xl card-glass-strong border border-theme shadow-xl">
          <div className="flex items-center justify-between border-b border-theme px-4 py-3">
            <div className="text-sm font-semibold text-primary">
              Preview - {previewItem.fileName || previewItem.objectPath.split("/").pop()}
            </div>
            <button
              type="button"
              onClick={closePreview}
              className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-primary hover-border-strong"
            >
              Close
            </button>
          </div>
          <div className="p-4">
            {isVideoItem(previewItem) ? (
              <video src={previewUrl} controls className="max-h-[60vh] w-full rounded-xl bg-black" />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-h-[60vh] w-full rounded-xl object-contain" />
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
}




