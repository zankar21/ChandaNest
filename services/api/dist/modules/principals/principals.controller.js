"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.principalsMeHandler = principalsMeHandler;
const zod_1 = require("zod");
const principals_service_1 = require("./principals.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        return res.status(400).json({ ok: false, error: { message: err.message, code: "BAD_REQUEST" } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function principalsMeHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const tenantId = req.params.tenantId;
        if (user.tenantId !== tenantId && user.role !== "platform_admin") {
            return res.status(403).json({ ok: false, error: { message: "Forbidden", code: "FORBIDDEN" } });
        }
        const data = await (0, principals_service_1.getMyPrincipals)({ tenantId, user });
        res.json(data);
    }
    catch (err) {
        handleError(err, res);
    }
}
