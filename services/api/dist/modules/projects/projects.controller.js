"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectHandler = createProjectHandler;
exports.updateProjectHandler = updateProjectHandler;
exports.deleteProjectHandler = deleteProjectHandler;
exports.getProjectHandler = getProjectHandler;
exports.listProjectsHandler = listProjectsHandler;
exports.publishProjectHandler = publishProjectHandler;
exports.unpublishProjectHandler = unpublishProjectHandler;
exports.createUnitHandler = createUnitHandler;
exports.updateUnitHandler = updateUnitHandler;
exports.deleteUnitHandler = deleteUnitHandler;
exports.listUnitsHandler = listUnitsHandler;
exports.publicListProjectsHandler = publicListProjectsHandler;
exports.publicGetProjectHandler = publicGetProjectHandler;
exports.publicListProjectUnitsHandler = publicListProjectUnitsHandler;
const zod_1 = require("zod");
const projects_schemas_1 = require("./projects.schemas");
const projects_service_1 = require("./projects.service");
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
                    : err.message === "TENANT_ID_REQUIRED"
                        ? "TENANT_ID_REQUIRED"
                        : "BAD_REQUEST";
        const status = typeof errAny?.status === "number"
            ? errAny.status
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "TENANT_ID_REQUIRED"
                        ? 400
                        : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
function requireUser(req, res) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        return null;
    }
    return user;
}
async function createProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const payload = projects_schemas_1.ProjectCreateSchema.parse(req.body);
        const data = await (0, projects_service_1.createProject)({ tenantId: req.query.tenantId || req.params.tenantId, user, body: payload });
        res.status(201).json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const payload = projects_schemas_1.ProjectUpdateSchema.parse(req.body);
        const data = await (0, projects_service_1.updateProject)({
            tenantId: req.query.tenantId || req.params.tenantId,
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
async function deleteProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.deleteProject)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.getProject)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listProjectsHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const query = projects_schemas_1.ProjectListQuerySchema.parse(req.query);
        const data = await (0, projects_service_1.listProjects)({
            tenantId: req.query.tenantId || req.params.tenantId,
            user,
            query
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publishProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.publishProject)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function unpublishProjectHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.unpublishProject)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function createUnitHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const payload = projects_schemas_1.UnitCreateSchema.parse(req.body);
        const data = await (0, projects_service_1.createUnit)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user,
            body: payload
        });
        res.status(201).json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateUnitHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const payload = projects_schemas_1.UnitUpdateSchema.parse(req.body);
        const data = await (0, projects_service_1.updateUnit)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            unitId: req.params.unitId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function deleteUnitHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.deleteUnit)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            unitId: req.params.unitId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listUnitsHandler(req, res) {
    try {
        const user = requireUser(req, res);
        if (!user)
            return;
        const data = await (0, projects_service_1.listUnits)({
            tenantId: req.query.tenantId || req.params.tenantId,
            projectId: req.params.projectId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publicListProjectsHandler(req, res) {
    try {
        const query = projects_schemas_1.PublicProjectListQuerySchema.parse(req.query);
        const data = await (0, projects_service_1.publicListProjects)(query);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publicGetProjectHandler(req, res) {
    try {
        const data = await (0, projects_service_1.publicGetProject)(req.params.slug);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publicListProjectUnitsHandler(req, res) {
    try {
        const data = await (0, projects_service_1.publicListProjectUnits)(req.params.slug);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
