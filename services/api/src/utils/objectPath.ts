export function normalizeObjectPath(p: string): string {
  return p.trim();
}

export function isSafeObjectPath(p: string): boolean {
  const path = normalizeObjectPath(p);
  const lowered = path.toLowerCase();
  if (lowered.startsWith("http://") || lowered.startsWith("https://")) return false;
  if (lowered.includes("gs://")) return false;
  if (path === "" || path === "''" || path.includes("\"") || path.includes("#") || path.includes("&") || path.includes("'"))
    return false;
  if (path.startsWith("/")) return false;
  if (path.includes("..")) return false;
  if (path.includes("\\")) return false;
  return true;
}

export function requireTenantScopedPath(tenantId: string, objectPath: string): string {
  const normalized = normalizeObjectPath(objectPath);
  const prefix = `tenants/${tenantId}/`;
  if (!normalized.startsWith(prefix)) {
    throw new Error("Object path must be tenant scoped");
  }
  return normalized;
}

export function requireKycPath(uid: string, objectPath: string, platformTenantId: string): string {
  const normalized = normalizeObjectPath(objectPath);
  const prefix = `tenants/${platformTenantId}/kyc/${uid}/`;
  if (!normalized.startsWith(prefix)) {
    throw new Error("Object path must be KYC-scoped");
  }
  return normalized;
}
