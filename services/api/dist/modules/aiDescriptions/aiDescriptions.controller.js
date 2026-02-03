"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiDescriptionHandler = generateAiDescriptionHandler;
const aiDescriptions_schema_1 = require("./aiDescriptions.schema");
const aiDescriptions_service_1 = require("./aiDescriptions.service");
async function generateAiDescriptionHandler(req, res) {
    try {
        const user = req.user;
        const { listingId } = req.params;
        const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : user.tenantId;
        const body = aiDescriptions_schema_1.GenerateAiDescriptionSchema.parse(req.body || {});
        const result = await (0, aiDescriptions_service_1.generateListingDescription)({
            tenantId,
            listingId,
            user,
            setActive: body.setActive,
            force: body.force
        });
        return res.json({ ok: true, data: result });
    }
    catch (err) {
        if (err?.message === "Forbidden") {
            return res.status(403).json({ ok: false, error: { message: "Forbidden", code: "FORBIDDEN" } });
        }
        if (err?.message === "NotFound") {
            return res.status(404).json({ ok: false, error: { message: "Listing not found", code: "NOT_FOUND" } });
        }
        if (err?.name === "ZodError") {
            return res.status(400).json({ ok: false, error: { message: "Invalid input", code: "BAD_REQUEST", issues: err.errors } });
        }
        return res.status(500).json({ ok: false, error: { message: "Failed to generate description", code: "INTERNAL_ERROR" } });
    }
}
