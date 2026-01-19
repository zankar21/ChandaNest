"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryQuerySchema = exports.InventoryStatusPatchSchema = exports.InventoryPatchSchema = exports.InventoryCreateSchema = exports.InventoryTypeSchema = exports.InventoryStatusSchema = void 0;
const zod_1 = require("zod");
exports.InventoryStatusSchema = zod_1.z.enum(["available", "hold", "booked", "sold"]);
exports.InventoryTypeSchema = zod_1.z.enum([
    "unit",
    "plot",
    "shop",
    "office",
    "other"
]);
exports.InventoryCreateSchema = zod_1.z.object({
    inventoryType: exports.InventoryTypeSchema,
    code: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1).optional(),
    areaSqFt: zod_1.z.number().positive().optional(),
    areaSqM: zod_1.z.number().positive().optional(),
    facing: zod_1.z.string().min(1).optional(),
    floor: zod_1.z.number().int().min(0).optional(),
    priceTotal: zod_1.z.number().positive().optional(),
    attributes: zod_1.z.record(zod_1.z.any()).optional(),
    status: exports.InventoryStatusSchema.default("available")
});
exports.InventoryPatchSchema = exports.InventoryCreateSchema.partial();
exports.InventoryStatusPatchSchema = zod_1.z.object({
    status: exports.InventoryStatusSchema
});
exports.InventoryQuerySchema = zod_1.z.object({
    status: exports.InventoryStatusSchema.optional(),
    inventoryType: exports.InventoryTypeSchema.optional()
});
