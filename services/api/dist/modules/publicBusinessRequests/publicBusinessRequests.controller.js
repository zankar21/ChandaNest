"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCreateBusinessRequestHandler = publicCreateBusinessRequestHandler;
const zod_1 = require("zod");
const publicBusinessRequests_schema_1 = require("./publicBusinessRequests.schema");
const publicBusinessRequests_service_1 = require("./publicBusinessRequests.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        if (err.message === "RATE_LIMITED") {
            return res.status(429).json({ ok: false, error: { message: "Too many requests", code: "RATE_LIMITED" } });
        }
        return res.status(400).json({ ok: false, error: { message: err.message, code: "BAD_REQUEST" } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip;
}
async function publicCreateBusinessRequestHandler(req, res) {
    try {
        const rawHp = typeof req.body?.hp === "string" ? req.body.hp.trim() : "";
        if (rawHp) {
            return res.status(200).json({ ok: true });
        }
        const body = publicBusinessRequests_schema_1.PublicBusinessRequestBodySchema.parse(req.body);
        const input = publicBusinessRequests_schema_1.PublicBusinessRequestInputSchema.parse(body);
        const data = await (0, publicBusinessRequests_service_1.createBusinessRequest)(input, {
            ip: getClientIp(req),
            userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined
        });
        return res.status(201).json({ ok: true, requestId: data.requestId });
    }
    catch (err) {
        return handleError(err, res);
    }
}
