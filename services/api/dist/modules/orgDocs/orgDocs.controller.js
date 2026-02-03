"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrgDocHandler = createOrgDocHandler;
exports.listOrgDocsHandler = listOrgDocsHandler;
exports.updateOrgDocHandler = updateOrgDocHandler;
const zod_1 = require("zod");
const orgDocs_schemas_1 = require("./orgDocs.schemas");
const orgDocs_service_1 = require("./orgDocs.service");
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
async function createOrgDocHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = orgDocs_schemas_1.OrgDocCreateSchema.parse(req.body);
        const data = await (0, orgDocs_service_1.createOrgDoc)({ tenantId: req.params.tenantId, user, body: payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listOrgDocsHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const query = orgDocs_schemas_1.OrgDocListQuerySchema.parse(req.query);
        const data = await (0, orgDocs_service_1.listOrgDocs)({ tenantId: req.params.tenantId, user, query });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateOrgDocHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = orgDocs_schemas_1.OrgDocPatchSchema.parse(req.body);
        const data = await (0, orgDocs_service_1.updateOrgDoc)({
            tenantId: req.params.tenantId,
            user,
            docId: req.params.docId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
