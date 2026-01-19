"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestMandateHandler = requestMandateHandler;
exports.listMandatesHandler = listMandatesHandler;
exports.getMandateHandler = getMandateHandler;
exports.approveMandateHandler = approveMandateHandler;
exports.rejectMandateHandler = rejectMandateHandler;
exports.revokeMandateHandler = revokeMandateHandler;
const zod_1 = require("zod");
const mandates_schemas_1 = require("./mandates.schemas");
const mandates_service_1 = require("./mandates.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const errAny = err;
        const code = typeof errAny?.code === "string"
            ? errAny.code
            : err.message === "Forbidden"
                ? "FORBIDDEN"
                : err.message === "Not found"
                    ? "NOT_FOUND"
                    : "BAD_REQUEST";
        const status = typeof errAny?.status === "number"
            ? errAny.status
            : code === "FORBIDDEN" || code === "MANDATE_REQUIRED"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : 400;
        const message = err.message || "Request failed";
        return res.status(status).json({ ok: false, error: { message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function requestMandateHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = mandates_schemas_1.MandateRequestSchema.parse(req.body);
        const data = await (0, mandates_service_1.requestMandate)({ tenantId: req.params.tenantId, user, body: payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listMandatesHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, mandates_service_1.listMandates)({ tenantId: req.params.tenantId, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getMandateHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, mandates_service_1.getMandate)({
            tenantId: req.params.tenantId,
            user,
            mandateId: req.params.mandateId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function approveMandateHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = mandates_schemas_1.MandateApproveSchema.parse(req.body ?? {});
        const data = await (0, mandates_service_1.approveMandate)({
            tenantId: req.params.tenantId,
            user,
            mandateId: req.params.mandateId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function rejectMandateHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = mandates_schemas_1.MandateRejectSchema.parse(req.body);
        const data = await (0, mandates_service_1.rejectMandate)({
            tenantId: req.params.tenantId,
            user,
            mandateId: req.params.mandateId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function revokeMandateHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = mandates_schemas_1.MandateRevokeSchema.parse(req.body ?? {});
        const data = await (0, mandates_service_1.revokeMandate)({
            tenantId: req.params.tenantId,
            user,
            mandateId: req.params.mandateId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
