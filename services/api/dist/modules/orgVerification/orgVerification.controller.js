"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerificationCaseHandler = getVerificationCaseHandler;
exports.initVerificationCaseHandler = initVerificationCaseHandler;
exports.decideVerificationHandler = decideVerificationHandler;
const zod_1 = require("zod");
const orgVerification_schemas_1 = require("./orgVerification.schemas");
const orgVerification_service_1 = require("./orgVerification.service");
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
                : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function getVerificationCaseHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const orgType = orgVerification_schemas_1.OrgTypeSchema.parse(req.params.orgType);
        const data = await (0, orgVerification_service_1.getVerificationCase)({
            tenantId: req.params.tenantId,
            user,
            orgType,
            orgId: req.params.orgId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function initVerificationCaseHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const orgType = orgVerification_schemas_1.OrgTypeSchema.parse(req.params.orgType);
        const data = await (0, orgVerification_service_1.initVerificationCase)({
            tenantId: req.params.tenantId,
            user,
            orgType,
            orgId: req.params.orgId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function decideVerificationHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const orgType = orgVerification_schemas_1.OrgTypeSchema.parse(req.params.orgType);
        const payload = orgVerification_schemas_1.OrgVerificationDecideSchema.parse(req.body);
        const data = await (0, orgVerification_service_1.decideVerification)({
            tenantId: req.params.tenantId,
            user,
            orgType,
            orgId: req.params.orgId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
