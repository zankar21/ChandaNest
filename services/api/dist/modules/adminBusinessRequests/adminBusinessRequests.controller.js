"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusinessRequestsHandler = listBusinessRequestsHandler;
exports.approveBusinessRequestHandler = approveBusinessRequestHandler;
exports.rejectBusinessRequestHandler = rejectBusinessRequestHandler;
const zod_1 = require("zod");
const adminBusinessRequests_schema_1 = require("./adminBusinessRequests.schema");
const adminBusinessRequests_service_1 = require("./adminBusinessRequests.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Forbidden"
            ? "FORBIDDEN"
            : err.message === "Not found"
                ? "NOT_FOUND"
                : err.message === "ALREADY_REVIEWED"
                    ? "ALREADY_REVIEWED"
                    : err.message === "TENANT_ID_CONFLICT"
                        ? "TENANT_ID_CONFLICT"
                        : err.message === "INVALID_TENANT_SLUG"
                            ? "INVALID_TENANT_SLUG"
                            : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "ALREADY_REVIEWED" ? 409 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function listBusinessRequestsHandler(req, res) {
    try {
        const user = req.user;
        const query = adminBusinessRequests_schema_1.ListBusinessRequestsQuerySchema.parse(req.query);
        const data = await (0, adminBusinessRequests_service_1.listBusinessRequests)(user, query);
        return res.json({ ok: true, ...data });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function approveBusinessRequestHandler(req, res) {
    try {
        const user = req.user;
        const body = adminBusinessRequests_schema_1.ApproveBusinessRequestSchema.parse(req.body ?? {});
        const data = await (0, adminBusinessRequests_service_1.approveBusinessRequest)(user, req.params.id, body);
        return res.json({ ok: true, ...data });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function rejectBusinessRequestHandler(req, res) {
    try {
        const user = req.user;
        const body = adminBusinessRequests_schema_1.RejectBusinessRequestSchema.parse(req.body ?? {});
        await (0, adminBusinessRequests_service_1.rejectBusinessRequest)(user, req.params.id, body);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
