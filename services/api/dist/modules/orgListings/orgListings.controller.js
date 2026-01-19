"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrgListingHandler = createOrgListingHandler;
exports.listOrgListingsHandler = listOrgListingsHandler;
exports.getOrgListingHandler = getOrgListingHandler;
exports.updateOrgListingHandler = updateOrgListingHandler;
exports.transitionOrgListingHandler = transitionOrgListingHandler;
const zod_1 = require("zod");
const orgListings_service_1 = require("./orgListings.service");
const orgListings_schemas_1 = require("./orgListings.schemas");
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
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function createOrgListingHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = orgListings_schemas_1.OrgListingCreateSchema.parse(req.body);
        const data = await (0, orgListings_service_1.createOrgListing)({ tenantId: req.params.tenantId, user, body: payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listOrgListingsHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, orgListings_service_1.listOrgListings)({
            tenantId: req.params.tenantId,
            user,
            query: req.query
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getOrgListingHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, orgListings_service_1.getOrgListing)({
            tenantId: req.params.tenantId,
            user,
            id: req.params.orgListingId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateOrgListingHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = orgListings_schemas_1.OrgListingPatchSchema.parse(req.body);
        const data = await (0, orgListings_service_1.updateOrgListing)({
            tenantId: req.params.tenantId,
            user,
            id: req.params.orgListingId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function transitionOrgListingHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = orgListings_schemas_1.TransitionRequestSchema.parse(req.body);
        const data = await (0, orgListings_service_1.transitionOrgListing)({
            tenantId: req.params.tenantId,
            user,
            id: req.params.orgListingId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
