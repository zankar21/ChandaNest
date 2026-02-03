"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCreateBuyerRequestHandler = publicCreateBuyerRequestHandler;
exports.listBuyerRequestsHandler = listBuyerRequestsHandler;
exports.getBuyerRequestHandler = getBuyerRequestHandler;
exports.updateBuyerRequestHandler = updateBuyerRequestHandler;
const zod_1 = require("zod");
const buyerRequests_schemas_1 = require("./buyerRequests.schemas");
const buyerRequests_service_1 = require("./buyerRequests.service");
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
                : err.message.includes("PUBLIC_DEFAULT_TENANT_ID")
                    ? "CONFIG_ERROR"
                    : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "CONFIG_ERROR" ? 500 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function publicCreateBuyerRequestHandler(req, res) {
    try {
        const payload = buyerRequests_schemas_1.CreateBuyerRequestSchema.parse(req.body);
        const data = await (0, buyerRequests_service_1.createBuyerRequestPublic)(payload);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listBuyerRequestsHandler(req, res) {
    try {
        const payload = buyerRequests_schemas_1.ListBuyerRequestQuerySchema.parse(req.query);
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, buyerRequests_service_1.listBuyerRequests)(user, req.params.tenantId, payload);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getBuyerRequestHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, buyerRequests_service_1.getBuyerRequest)(user, req.params.tenantId, req.params.requestId);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateBuyerRequestHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = buyerRequests_schemas_1.PatchBuyerRequestSchema.parse(req.body);
        const data = await (0, buyerRequests_service_1.updateBuyerRequest)(user, req.params.tenantId, req.params.requestId, payload);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
