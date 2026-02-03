"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPut = signPut;
exports.submit = submit;
exports.approve = approve;
const zod_1 = require("zod");
const kyc_service_1 = require("./kyc.service");
const kyc_schemas_1 = require("./kyc.schemas");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message.startsWith("Forbidden") ? "FORBIDDEN" : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function signPut(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = kyc_schemas_1.KycSignPutRequestSchema.parse(req.body);
        const data = await (0, kyc_service_1.createKycSignedPutUrl)({ uid: user.uid, ...payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function submit(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = kyc_schemas_1.KycSubmitRequestSchema.parse(req.body);
        const data = await (0, kyc_service_1.submitKyc)({ uid: user.uid, ...payload });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function approve(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = kyc_schemas_1.KycApproveRequestSchema.parse(req.body);
        const data = await (0, kyc_service_1.approveKyc)({
            uid: payload.uid,
            action: payload.action,
            remarks: payload.remarks,
            adminUid: user.uid,
            adminRole: user.role
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
