import { signGetMedia, signGetPublic } from "./apiClient";

const cache = new Map<string, string>();
const ownerCache = new Map<string, string>();

export function isValidPublicObjectPath(p: string): boolean {
  if (!p) return false;
  const lower = p.toLowerCase();
  if (lower.startsWith("gs://")) return false;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return false;
  if (p.includes("?") || p.includes("\"") || p.includes("'")) return false;
  if (!(p.startsWith("tenants/") || p.startsWith("public/"))) return false;
  return true;
}

export async function hydrateSignedUrls(items: { objectPath: string }[]) {
  const uniquePaths = Array.from(
    new Set(
      items
        .map((i) => i.objectPath)
        .filter((p): p is string => Boolean(p) && isValidPublicObjectPath(p) && !cache.has(p))
    )
  );

  if (uniquePaths.length > 0) {
    try {
      const grouped = new Map<string, string[]>();
      uniquePaths.forEach((path) => {
        if (!path.startsWith("tenants/")) return;
        const parts = path.split("/");
        const tenantId = parts[1];
        if (!tenantId) return;
        const list = grouped.get(tenantId) || [];
        list.push(path);
        grouped.set(tenantId, list);
      });

      for (const paths of grouped.values()) {
        const signed = await signGetPublic(paths);
        Object.entries(signed).forEach(([path, url]) => {
          cache.set(path, url);
        });
      }
    } catch {
      // swallow errors; we'll return whatever is cached
    }
  }

  return items
    .map((item) => {
      const signedUrl = cache.get(item.objectPath);
      if (!signedUrl) return null;
      return { ...item, signedUrl };
    })
    .filter((i): i is { objectPath: string; signedUrl: string } => Boolean(i));
}

export async function hydrateOwnerSignedUrls(items: { objectPath: string }[]) {
  const uniquePaths = Array.from(
    new Set(
      items
        .map((i) => i.objectPath)
        .filter((p): p is string => Boolean(p) && isValidPublicObjectPath(p) && !ownerCache.has(p))
    )
  );

  if (uniquePaths.length > 0) {
    try {
      const signed = await signGetMedia(uniquePaths);
      Object.entries(signed).forEach(([path, url]) => {
        ownerCache.set(path, url);
      });
    } catch {
      // ignore
    }
  }

  return items
    .map((item) => {
      const signedUrl = ownerCache.get(item.objectPath);
      if (!signedUrl) return null;
      return { ...item, signedUrl };
    })
    .filter((i): i is { objectPath: string; signedUrl: string } => Boolean(i));
}
