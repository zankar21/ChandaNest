"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectPatchSchema = exports.ProjectCreateSchema = exports.ProjectStatusSchema = void 0;
const zod_1 = require("zod");
exports.ProjectStatusSchema = zod_1.z.enum(["active", "inactive"]);
exports.ProjectCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    reraId: zod_1.z.string().min(2).optional(),
    city: zod_1.z.string().min(2).optional(),
    addressLine: zod_1.z.string().min(2).optional(),
    propertyTypesSupported: zod_1.z.array(zod_1.z.string().min(2)).optional(),
    status: exports.ProjectStatusSchema.default("active"),
    amenities: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    possessionDate: zod_1.z.string().min(4).optional()
});
exports.ProjectPatchSchema = exports.ProjectCreateSchema.partial();
