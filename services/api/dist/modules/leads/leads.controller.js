"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCreateLeadHandler = publicCreateLeadHandler;
exports.listLeadsHandler = listLeadsHandler;
exports.getLeadHandler = getLeadHandler;
exports.assignLeadHandler = assignLeadHandler;
exports.addLeadActivityHandler = addLeadActivityHandler;
exports.updateLeadStatusHandler = updateLeadStatusHandler;
const zod_1 = require("zod");
const leads_service_1 = require("./leads.service");
const leads_schemas_1 = require("./leads.schemas");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Forbidden"
            ? "FORBIDDEN"
            : err.message === "Not found" || err.message === "Listing not available"
                ? "NOT_FOUND"
                : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function publicCreateLeadHandler(req, res) {
    try {
        const payload = leads_schemas_1.PublicLeadCreateSchema.parse(req.body);
        const data = await (0, leads_service_1.createPublicLead)({
            body: payload,
            meta: { userAgent: req.headers["user-agent"], ip: req.ip }
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listLeadsHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, leads_service_1.listLeads)({
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
async function getLeadHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const data = await (0, leads_service_1.getLead)({
            tenantId: req.params.tenantId,
            user,
            leadId: req.params.leadId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function assignLeadHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = leads_schemas_1.LeadAssignSchema.parse(req.body);
        const data = await (0, leads_service_1.assignLead)({
            tenantId: req.params.tenantId,
            user,
            leadId: req.params.leadId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function addLeadActivityHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = leads_schemas_1.LeadActivityCreateSchema.parse(req.body);
        const data = await (0, leads_service_1.addLeadActivity)({
            tenantId: req.params.tenantId,
            user,
            leadId: req.params.leadId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateLeadStatusHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = leads_schemas_1.LeadStatusUpdateSchema.parse(req.body);
        const data = await (0, leads_service_1.updateLeadStatus)({
            tenantId: req.params.tenantId,
            user,
            leadId: req.params.leadId,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
