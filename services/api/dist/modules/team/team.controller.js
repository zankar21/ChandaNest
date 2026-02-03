"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMeHandler = getTeamMeHandler;
exports.listTeamUsersHandler = listTeamUsersHandler;
exports.listTeamInvitesHandler = listTeamInvitesHandler;
exports.createTeamInviteHandler = createTeamInviteHandler;
exports.revokeTeamInviteHandler = revokeTeamInviteHandler;
exports.disableTeamUserHandler = disableTeamUserHandler;
exports.enableTeamUserHandler = enableTeamUserHandler;
const zod_1 = require("zod");
const team_schema_1 = require("./team.schema");
const team_service_1 = require("./team.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "FORBIDDEN"
            ? "FORBIDDEN"
            : err.message === "TENANT_ID_REQUIRED"
                ? "TENANT_ID_REQUIRED"
                : err.message === "NOT_FOUND"
                    ? "NOT_FOUND"
                    : err.message === "INVALID_ROLE"
                        ? "INVALID_ROLE"
                        : err.message === "ALREADY_MEMBER"
                            ? "ALREADY_MEMBER"
                            : err.message === "SEAT_LIMIT_REACHED"
                                ? "SEAT_LIMIT_REACHED"
                                : "BAD_REQUEST";
        const status = code === "FORBIDDEN"
            ? 403
            : code === "NOT_FOUND"
                ? 404
                : code === "ALREADY_MEMBER" || code === "SEAT_LIMIT_REACHED"
                    ? 409
                    : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function getTeamMeHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const data = await (0, team_service_1.getTeamMe)(user, query.tenantId);
        return res.json({ ok: true, ...data });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function listTeamUsersHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const users = await (0, team_service_1.listTeamUsers)(user, query.tenantId);
        return res.json({ ok: true, users });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function listTeamInvitesHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamInviteListQuerySchema.parse(req.query);
        const invites = await (0, team_service_1.listTeamInvites)(user, query.tenantId, query.status);
        return res.json({ ok: true, invites });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function createTeamInviteHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const body = team_schema_1.TeamInviteCreateSchema.parse(req.body ?? {});
        const data = await (0, team_service_1.createTeamInvite)(user, body, query.tenantId);
        return res.status(201).json({ ok: true, ...data });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function revokeTeamInviteHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const inviteId = team_schema_1.TeamUserActionSchema.parse({ uid: req.params.inviteId }).uid;
        await (0, team_service_1.revokeTeamInvite)(user, inviteId, query.tenantId);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function disableTeamUserHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const uid = team_schema_1.TeamUserActionSchema.parse({ uid: req.params.uid }).uid;
        await (0, team_service_1.disableTeamUser)(user, uid, query.tenantId);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function enableTeamUserHandler(req, res) {
    try {
        const user = req.user;
        const query = team_schema_1.TeamTenantQuerySchema.parse(req.query);
        const uid = team_schema_1.TeamUserActionSchema.parse({ uid: req.params.uid }).uid;
        await (0, team_service_1.enableTeamUser)(user, uid, query.tenantId);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
