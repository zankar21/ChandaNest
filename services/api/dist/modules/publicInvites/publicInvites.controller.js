"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInviteHandler = acceptInviteHandler;
const zod_1 = require("zod");
const publicInvites_schema_1 = require("./publicInvites.schema");
const publicInvites_service_1 = require("./publicInvites.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        if (err.message === "RATE_LIMITED") {
            return res.status(429).json({ ok: false, error: { message: "Too many requests", code: "RATE_LIMITED" } });
        }
        if (err.message === "EMAIL_MISMATCH") {
            return res.status(403).json({ ok: false, error: { message: "Invite email mismatch", code: "FORBIDDEN" } });
        }
        if (err.message === "INVITE_USED") {
            return res.status(409).json({ ok: false, error: { message: "Invite already used", code: "INVITE_USED" } });
        }
        if (err.message === "SEAT_LIMIT_REACHED") {
            return res.status(409).json({ ok: false, error: { message: "Seat limit reached", code: "SEAT_LIMIT_REACHED" } });
        }
        if (err.message === "INVALID_INVITE") {
            return res.status(400).json({ ok: false, error: { message: "Invalid or expired invite", code: "INVALID_INVITE" } });
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
async function acceptInviteHandler(req, res) {
    try {
        const payload = publicInvites_schema_1.AcceptInviteSchema.parse(req.body);
        const data = await (0, publicInvites_service_1.acceptInvite)(payload, { ip: getClientIp(req) });
        return res.json({ ok: true, ...data });
    }
    catch (err) {
        return handleError(err, res);
    }
}
