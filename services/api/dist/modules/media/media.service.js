"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignedPutUrl = createSignedPutUrl;
exports.createSignedGetUrls = createSignedGetUrls;
const storage_service_1 = require("../../services/storage.service");
const objectPath_1 = require("../../utils/objectPath");
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
async function createSignedPutUrl(input) {
    const { tenantId, objectPath, contentType, cacheControl } = input;
    if (!(0, objectPath_1.isSafeObjectPath)(objectPath)) {
        throw new Error("Invalid object path");
    }
    const normalizedPath = (0, objectPath_1.requireTenantScopedPath)(tenantId, objectPath);
    const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS);
    const bucket = (0, storage_service_1.getBucket)();
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
async function createSignedGetUrls(input, options) {
    const { tenantId, paths } = input;
    const bucket = (0, storage_service_1.getBucket)();
    const expiresMs = options?.expiresMs ?? FIFTEEN_MINUTES_MS;
    const expiresAt = new Date(Date.now() + expiresMs);
    const items = await Promise.all(paths.map(async (path) => {
        if (!(0, objectPath_1.isSafeObjectPath)(path)) {
            throw new Error("Invalid object path");
        }
        const normalizedPath = (0, objectPath_1.requireTenantScopedPath)(tenantId, path);
        const file = bucket.file(normalizedPath);
        const [url] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: expiresAt
        });
        return { objectPath: normalizedPath, url, expiresAt: expiresAt.toISOString() };
    }));
    return { items };
}
