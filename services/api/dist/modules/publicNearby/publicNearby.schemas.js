"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicNearbyParamsSchema = void 0;
const zod_1 = require("zod");
exports.PublicNearbyParamsSchema = zod_1.z.object({
    propertyId: zod_1.z.string().min(4).max(128).regex(/^[A-Za-z0-9_-]+$/)
});
