"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgencyHandler = createAgencyHandler;
exports.listAgenciesHandler = listAgenciesHandler;
exports.getAgencyHandler = getAgencyHandler;
exports.addAgencyMemberHandler = addAgencyMemberHandler;
exports.updateAgencyMemberHandler = updateAgencyMemberHandler;
exports.listAgencyMembersHandler = listAgencyMembersHandler;
const zod_1 = require("zod");
const agencies_service_1 = require("./agencies.service");
const agencies_schemas_1 = require("./agencies.schemas");
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
async function createAgencyHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = agencies_schemas_1.AgencyCreateSchema.parse(req.body);
        const data = await (0, agencies_service_1.createAgency)({ tenantId: req.params.tenantId, user, body: payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listAgenciesHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, agencies_service_1.listAgencies)({ tenantId: req.params.tenantId, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getAgencyHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, agencies_service_1.getAgency)({
            tenantId: req.params.tenantId,
            agencyId: req.params.agencyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function addAgencyMemberHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = agencies_schemas_1.AgencyMemberCreateSchema.parse(req.body);
        const data = await (0, agencies_service_1.addAgencyMember)({
            tenantId: req.params.tenantId,
            agencyId: req.params.agencyId,
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
async function updateAgencyMemberHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = agencies_schemas_1.AgencyMemberUpdateSchema.parse(req.body);
        const data = await (0, agencies_service_1.updateAgencyMember)({
            tenantId: req.params.tenantId,
            agencyId: req.params.agencyId,
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
async function listAgencyMembersHandler(req, res) {
    try {
        const data = await (0, agencies_service_1.listAgencyMembers)({
            tenantId: req.params.tenantId,
            agencyId: req.params.agencyId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
