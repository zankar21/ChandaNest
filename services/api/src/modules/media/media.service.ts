import { getBucket } from "../../services/storage.service";
import { isSafeObjectPath, requireTenantScopedPath } from "../../utils/objectPath";
import { SignGetRequest, SignPutRequest } from "./media.schemas";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type SignPutInput = SignPutRequest & { tenantId: string };
type SignGetInput = SignGetRequest & { tenantId: string };

export async function createSignedPutUrl(input: SignPutInput) {
  const { tenantId, objectPath, contentType, cacheControl } = input;

  if (!isSafeObjectPath(objectPath)) {
    throw new Error("Invalid object path");
  }

  const normalizedPath = requireTenantScopedPath(tenantId, objectPath);
  const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);
  const bucket = getBucket();
  const file = bucket.file(normalizedPath);

  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType,
    extensionHeaders: cacheControl ? { "Cache-Control": cacheControl } : undefined
  });

  return {
    url,
    objectPath: normalizedPath,
    expiresAt: expiresAt.toISOString()
  };
}

export async function createSignedGetUrls(
  input: SignGetInput,
  options?: { expiresMs?: number }
) {
  const { tenantId, paths } = input;

  const bucket = getBucket();
  const expiresMs = options?.expiresMs ?? FIFTEEN_MINUTES_MS;
  const expiresAt = new Date(Date.now() + expiresMs);

  const items = await Promise.all(
    paths.map(async (path) => {
      if (!isSafeObjectPath(path)) {
        throw new Error("Invalid object path");
      }
      const normalizedPath = requireTenantScopedPath(tenantId, path);
      const file = bucket.file(normalizedPath);
      const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: expiresAt
      });

      return { objectPath: normalizedPath, url, expiresAt: expiresAt.toISOString() };
    })
  );

  return { items };
}
