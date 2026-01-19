"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnterpriseHandler = createEnterpriseHandler;
exports.listEnterprisesHandler = listEnterprisesHandler;
exports.getEnterpriseHandler = getEnterpriseHandler;
exports.addEnterpriseMemberHandler = addEnterpriseMemberHandler;
exports.updateEnterpriseMemberHandler = updateEnterpriseMemberHandler;
exports.listEnterpriseMembersHandler = listEnterpriseMembersHandler;
const zod_1 = require("zod");
const enterprises_service_1 = require("./enterprises.service");
const enterprises_schemas_1 = require("./enterprises.schemas");
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
async function createEnterpriseHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterprises_schemas_1.EnterpriseCreateSchema.parse(req.body);
        const data = await (0, enterprises_service_1.createEnterprise)({ tenantId: req.params.tenantId, user, body: payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listEnterprisesHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, enterprises_service_1.listEnterprises)({ tenantId: req.params.tenantId, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getEnterpriseHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, enterprises_service_1.getEnterprise)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function addEnterpriseMemberHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterprises_schemas_1.EnterpriseMemberCreateSchema.parse(req.body);
        const data = await (0, enterprises_service_1.addEnterpriseMember)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            userId: payload.userId,
            role: payload.role,
            status: payload.status,
            actor: user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateEnterpriseMemberHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterprises_schemas_1.EnterpriseMemberUpdateSchema.parse(req.body);
        const data = await (0, enterprises_service_1.updateEnterpriseMember)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            membershipId: req.params.membershipId,
            role: payload.role,
            status: payload.status,
            actor: user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listEnterpriseMembersHandler(req, res) {
    try {
        const data = await (0, enterprises_service_1.listEnterpriseMembers)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
