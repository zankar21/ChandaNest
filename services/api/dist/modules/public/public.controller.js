"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSignGet = publicSignGet;
const zod_1 = require("zod");
const media_service_1 = require("../media/media.service");
const objectPath_1 = require("../../utils/objectPath");
const PublicMediaSignGetSchema = zod_1.z.object({
    paths: zod_1.z.array(zod_1.z.string().min(5)).min(1).max(50)
});
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        return res.status(400).json({ ok: false, error: { message: err.message, code: "BAD_REQUEST" } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
function extractTenantFromPath(path) {
    const match = /^tenants\/([^/]+)\/(properties|listings|projects)\/[^/]+\/media\/.+$/.exec(path);
    return match ? match[1] : null;
}
function validatePublicPath(path) {
    if (!(0, objectPath_1.isSafeObjectPath)(path)) {
        return "Invalid path";
    }
    if (!/^[A-Za-z0-9._/\\-]+$/.test(path)) {
        return "Invalid characters in path";
    }
    if (/^https?:\/\//i.test(path) || path.toLowerCase().includes("gs://")) {
        return "Invalid path";
    }
    if (!/^tenants\/[^/]+\/(properties|listings|projects)\/[^/]+\/media\/.+$/.test(path)) {
        return "Path not allowed";
    }
    return null;
}
function respondInvalidCharacters(res, badPath) {
    const details = process.env.NODE_ENV !== "production" ? { details: { badPath } } : {};
    return res.status(400).json({
        ok: false,
        error: {
            code: "BAD_REQUEST",
            message: "Invalid characters in path",
            ...details
        }
    });
}
// Example: curl -X POST http://localhost:8080/v1/public/media/sign-get -H "Content-Type: application/json" -d "{\"paths\":[\"tenants/demo/properties/prop123/media/hero.webp\"]}"
async function publicSignGet(req, res) {
    try {
        const payload = PublicMediaSignGetSchema.parse(req.body);
        const firstPath = payload.paths[0];
        const firstError = validatePublicPath(firstPath);
        if (firstError) {
            if (firstError === "Invalid characters in path") {
                return respondInvalidCharacters(res, firstPath);
            }
            throw new Error(firstError);
        }
        const tenantId = extractTenantFromPath(firstPath);
        if (!tenantId) {
            throw new Error("Invalid path");
        }
        for (const p of payload.paths) {
            const error = validatePublicPath(p);
            if (error) {
                if (error === "Invalid characters in path") {
                    return respondInvalidCharacters(res, p);
                }
                throw new Error(error);
            }
            const t = extractTenantFromPath(p);
            if (t !== tenantId) {
                throw new Error("All paths must be under the same tenant");
            }
        }
        const data = await (0, media_service_1.createSignedGetUrls)({ tenantId, paths: payload.paths }, { expiresMs: 5 * 60 * 1000 });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
