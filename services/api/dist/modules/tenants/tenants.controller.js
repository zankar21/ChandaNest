"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeHandler = getMeHandler;
exports.completePhoneKycHandler = completePhoneKycHandler;
exports.onboardOwnerHandler = onboardOwnerHandler;
const zod_1 = require("zod");
const tenants_schemas_1 = require("./tenants.schemas");
const tenants_service_1 = require("./tenants.service");
const logger_1 = require("../../utils/logger");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        logger_1.logger.warn("Tenant onboarding validation failed", {
            issues: err.errors.map((issue) => ({ path: issue.path, message: issue.message }))
        });
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        if (err.message === "handle_taken") {
            return res.status(409).json({ ok: false, error: { message: "handle_taken", code: "HANDLE_TAKEN" } });
        }
        if (err.message === "phone_required") {
            return res.status(400).json({ ok: false, error: { message: "phone_required", code: "PHONE_REQUIRED" } });
        }
        const code = err.message === "Forbidden" ? "FORBIDDEN" : "BAD_REQUEST";
        const status = code === "FORBIDDEN" ? 403 : 400;
        if (status === 400) {
            logger_1.logger.warn("Tenant onboarding error", { message: err.message });
        }
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function getMeHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, tenants_service_1.getTenantMe)({ tenantId: req.params.tenantId, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function completePhoneKycHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        tenants_schemas_1.EmptyBodySchema.parse(req.body ?? {});
        const data = await (0, tenants_service_1.completePhoneKyc)({ tenantId: req.params.tenantId, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function onboardOwnerHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = tenants_schemas_1.OwnerOnboardSchema.parse(req.body ?? {});
        const data = await (0, tenants_service_1.onboardOwner)({
            tenantId: req.params.tenantId,
            user,
            fullName: payload.fullName,
            ownerType: payload.ownerType,
            city: payload.city,
            contactPreference: payload.contactPreference,
            bestTimeToContact: payload.bestTimeToContact,
            alternatePhone: payload.alternatePhone,
            email: payload.email
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            const body = (req.body ?? {});
            logger_1.logger.warn("Tenant onboard invalid payload", {
                ownerType: body.ownerType,
                city: body.city,
                contactPreference: body.contactPreference,
                bestTimeToContact: body.bestTimeToContact,
                fullNameLength: typeof body.fullName === "string" ? body.fullName.trim().length : null,
                hasAlternatePhone: Boolean(body.alternatePhone),
                hasEmail: Boolean(body.email),
                consentOwner: body.consentOwner,
                consentTerms: body.consentTerms,
                consentContact: body.consentContact
            });
        }
        handleError(err, res);
    }
}
