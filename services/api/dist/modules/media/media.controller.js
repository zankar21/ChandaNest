"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPut = signPut;
exports.signGet = signGet;
const zod_1 = require("zod");
const media_service_1 = require("./media.service");
const media_schemas_1 = require("./media.schemas");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = "BAD_REQUEST";
        return res.status(400).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function signPut(req, res) {
    try {
        const payload = media_schemas_1.SignPutRequestSchema.parse(req.body);
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, media_service_1.createSignedPutUrl)({ tenantId: user.tenantId, ...payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function signGet(req, res) {
    try {
        const payload = media_schemas_1.SignGetRequestSchema.parse(req.body);
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, media_service_1.createSignedGetUrls)({ tenantId: user.tenantId, paths: payload.paths });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
