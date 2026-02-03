"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanceMatrixHandler = distanceMatrixHandler;
const zod_1 = require("zod");
const nearby_schemas_1 = require("./nearby.schemas");
const nearby_service_1 = require("./nearby.service");
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
async function distanceMatrixHandler(req, res) {
    try {
        const payload = nearby_schemas_1.DistanceMatrixRequestSchema.parse(req.body);
        const data = await (0, nearby_service_1.getDistanceMatrix)(payload);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
