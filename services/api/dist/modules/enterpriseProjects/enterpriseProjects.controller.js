"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnterpriseProjectHandler = createEnterpriseProjectHandler;
exports.listEnterpriseProjectsHandler = listEnterpriseProjectsHandler;
exports.getEnterpriseProjectHandler = getEnterpriseProjectHandler;
exports.updateEnterpriseProjectHandler = updateEnterpriseProjectHandler;
const zod_1 = require("zod");
const enterpriseProjects_service_1 = require("./enterpriseProjects.service");
const enterpriseProjects_schemas_1 = require("./enterpriseProjects.schemas");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
        const status = code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function createEnterpriseProjectHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterpriseProjects_schemas_1.ProjectCreateSchema.parse(req.body);
        const data = await (0, enterpriseProjects_service_1.createEnterpriseProject)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listEnterpriseProjectsHandler(req, res) {
    try {
        const data = await (0, enterpriseProjects_service_1.listEnterpriseProjects)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getEnterpriseProjectHandler(req, res) {
    try {
        const data = await (0, enterpriseProjects_service_1.getEnterpriseProject)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateEnterpriseProjectHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterpriseProjects_schemas_1.ProjectPatchSchema.parse(req.body);
        const data = await (0, enterpriseProjects_service_1.updateEnterpriseProject)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
