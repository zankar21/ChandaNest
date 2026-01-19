"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryItemHandler = createInventoryItemHandler;
exports.listInventoryItemsHandler = listInventoryItemsHandler;
exports.getInventoryItemHandler = getInventoryItemHandler;
exports.updateInventoryItemHandler = updateInventoryItemHandler;
exports.updateInventoryStatusHandler = updateInventoryStatusHandler;
const zod_1 = require("zod");
const enterpriseInventory_service_1 = require("./enterpriseInventory.service");
const enterpriseInventory_schemas_1 = require("./enterpriseInventory.schemas");
function handleError(err, res) {
    if (err instanceof zod_1.ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
    }
    if (err instanceof Error) {
        const code = err.message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
        const status = code === "NOT_FOUND" ? 404 : 400;
        return res.status(status).json({ ok: false, error: { message: err.message, code } });
    }
    return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}
async function createInventoryItemHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterpriseInventory_schemas_1.InventoryCreateSchema.parse(req.body);
        const data = await (0, enterpriseInventory_service_1.createInventoryItem)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function listInventoryItemsHandler(req, res) {
    try {
        const data = await (0, enterpriseInventory_service_1.listInventoryItems)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            query: req.query
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function getInventoryItemHandler(req, res) {
    try {
        const data = await (0, enterpriseInventory_service_1.getInventoryItem)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            itemId: req.params.itemId
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateInventoryItemHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterpriseInventory_schemas_1.InventoryPatchSchema.parse(req.body);
        const data = await (0, enterpriseInventory_service_1.updateInventoryItem)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            itemId: req.params.itemId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
async function updateInventoryStatusHandler(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const payload = enterpriseInventory_schemas_1.InventoryStatusPatchSchema.parse(req.body);
        const data = await (0, enterpriseInventory_service_1.updateInventoryStatus)({
            tenantId: req.params.tenantId,
            enterpriseId: req.params.enterpriseId,
            projectId: req.params.projectId,
            itemId: req.params.itemId,
            user,
            body: payload
        });
        res.json({ ok: true, data });
    }
    catch (err) {
        handleError(err, res);
    }
}
