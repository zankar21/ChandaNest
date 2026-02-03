"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicNearbyHandler = publicNearbyHandler;
const zod_1 = require("zod");
const publicNearby_schemas_1 = require("./publicNearby.schemas");
const publicNearby_service_1 = require("./publicNearby.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
        const status = code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function publicNearbyHandler(req, res) {
    try {
        const params = publicNearby_schemas_1.PublicNearbyParamsSchema.parse(req.params);
        const data = await (0, publicNearby_service_1.getPublicNearby)(params.propertyId);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
