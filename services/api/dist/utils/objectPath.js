"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeObjectPath = normalizeObjectPath;
exports.isSafeObjectPath = isSafeObjectPath;
exports.requireTenantScopedPath = requireTenantScopedPath;
exports.requireKycPath = requireKycPath;
function normalizeObjectPath(p) {
    return p.trim();
}
function isSafeObjectPath(p) {
    const path = normalizeObjectPath(p);
    const lowered = path.toLowerCase();
    if (lowered.startsWith("http://") || lowered.startsWith("https://"))
        return false;
    if (lowered.includes("gs://"))
        return false;
    if (path === "" || path === "''" || path.includes("\"") || path.includes("#") || path.includes("&") || path.includes("'"))
        return false;
    if (path.startsWith("/"))
        return false;
    if (path.includes(".."))
        return false;
    if (path.includes("\\"))
        return false;
    return true;
}
function requireTenantScopedPath(tenantId, objectPath) {
    const normalized = normalizeObjectPath(objectPath);
    const prefix = `tenants/${tenantId}/`;
    if (!normalized.startsWith(prefix)) {
        throw new Error("Object path must be tenant scoped");
    }
    return normalized;
}
function requireKycPath(uid, objectPath, platformTenantId) {
    const normalized = normalizeObjectPath(objectPath);
    const prefix = `tenants/${platformTenantId}/kyc/${uid}/`;
    if (!normalized.startsWith(prefix)) {
        throw new Error("Object path must be KYC-scoped");
    }
    return normalized;
}
