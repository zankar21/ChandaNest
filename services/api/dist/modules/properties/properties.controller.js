"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandler = createHandler;
exports.updateHandler = updateHandler;
exports.listHandler = listHandler;
exports.getHandler = getHandler;
exports.validateHandler = validateHandler;
exports.submitHandler = submitHandler;
exports.approveHandler = approveHandler;
exports.unpublishHandler = unpublishHandler;
exports.deleteHandler = deleteHandler;
exports.publishHandler = publishHandler;
exports.featureHandler = featureHandler;
exports.publicListHandler = publicListHandler;
exports.publicGetHandler = publicGetHandler;
exports.rejectHandler = rejectHandler;
exports.setVisibilityHandler = setVisibilityHandler;
const zod_1 = require("zod");
const properties_schemas_1 = require("./properties.schemas");
const properties_service_1 = require("./properties.service");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        const fields = err.errors.map((e) => e.path.filter((p) => p !== undefined).join(".")).filter(Boolean);
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR", fields } });
    }
    if (err instanceof Error) {
        const errAny = err;
        const code = typeof errAny?.code === "string"
            ? errAny.code
            : err.message === "Forbidden"
                ? "FORBIDDEN"
                : err.message === "Not found"
                    ? "NOT_FOUND"
                    : err.message === "Unpublish before deleting."
                        ? "CONFLICT"
                        : err.message === "Unpublish before editing."
                            ? "CONFLICT"
                            : "BAD_REQUEST";
        const status = typeof errAny?.status === "number"
            ? errAny.status
            : code === "FORBIDDEN"
                ? 403
                : code === "NOT_FOUND"
                    ? 404
                    : code === "CONFLICT" || code === "LIMIT_REACHED"
                        ? 409
                        : code === "PAYMENT_REQUIRED"
                            ? 402
                            : 400;
        return res.status(status).json({
            ok: false,
            error: { message: err.message, code, fields: Array.isArray(errAny?.fields) ? errAny.fields : undefined }
        });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function createHandler(req, res) {
    try {
        const payload = properties_schemas_1.CreatePropertySchema.parse(req.body);
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.createProperty)({ tenantId: req.params.tenantId, body: payload, user });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateHandler(req, res) {
    try {
        const payload = properties_schemas_1.PatchPropertySchema.parse(req.body);
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.updateProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            body: payload,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const query = properties_schemas_1.ListPropertiesQuerySchema.parse(req.query);
        const data = await (0, properties_service_1.listProperties)(req.params.tenantId, user, {
            mine: query.mine === "1" || query.mine === "true"
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.getProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function validateHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.validateProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function submitHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.submitProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function approveHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = properties_schemas_1.ApprovePropertySchema.parse(req.body);
        const data = await (0, properties_service_1.approveProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function unpublishHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.unpublishProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function deleteHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.deleteProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publishHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const data = await (0, properties_service_1.publishProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function featureHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = properties_schemas_1.FeaturePropertySchema.parse(req.body);
        const data = await (0, properties_service_1.setFeaturedProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            body: payload,
            user
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publicListHandler(req, res) {
    try {
        const query = properties_schemas_1.PublicListQuerySchema.parse(req.query);
        const data = await (0, properties_service_1.listPublicProperties)(query);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function publicGetHandler(req, res) {
    try {
        const data = await (0, properties_service_1.getPublicProperty)(req.params.propertyId);
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function rejectHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = properties_schemas_1.RejectPropertySchema.parse(req.body);
        const data = await (0, properties_service_1.rejectProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function setVisibilityHandler(req, res) {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        const payload = properties_schemas_1.SetVisibilitySchema.parse(req.body);
        const data = await (0, properties_service_1.setVisibilityProperty)({
            tenantId: req.params.tenantId,
            propertyId: req.params.propertyId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
