"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionHandler = getSubscriptionHandler;
exports.overrideSubscriptionHandler = overrideSubscriptionHandler;
exports.cancelSubscriptionHandler = cancelSubscriptionHandler;
exports.overrideOnboardingHandler = overrideOnboardingHandler;
const zod_1 = require("zod");
const billing_schema_1 = require("./billing.schema");
const billing_service_1 = require("./billing.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Forbidden"
            ? "FORBIDDEN"
            : err.message === "TENANT_NOT_FOUND"
                ? "NOT_FOUND"
                : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function getSubscriptionHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const query = billing_schema_1.GetSubscriptionQuerySchema.parse(req.query);
        const tenantId = (0, billing_service_1.isPlatformAdmin)(user) ? query.tenantId ?? "" : user.tenantId;
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: { message: "tenantId is required", code: "VALIDATION_ERROR" } });
        }
        const summary = await (0, billing_service_1.getSubscriptionSummary)(tenantId, user);
        return res.json({ ok: true, ...summary });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function overrideSubscriptionHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const body = billing_schema_1.SubscriptionOverrideSchema.parse(req.body);
        await (0, billing_service_1.overrideSubscription)(user, body);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function cancelSubscriptionHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const tenantId = user.tenantId;
        await (0, billing_service_1.cancelSubscription)(user, tenantId);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
async function overrideOnboardingHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const body = billing_schema_1.OnboardingOverrideSchema.parse(req.body);
        await (0, billing_service_1.overrideOnboarding)(user, body);
        return res.json({ ok: true });
    }
    catch (err) {
        return handleError(err, res);
    }
}
