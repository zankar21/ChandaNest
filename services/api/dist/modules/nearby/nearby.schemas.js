"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistanceMatrixRequestSchema = void 0;
const zod_1 = require("zod");
const LatLngSchema = zod_1.z.object({
    lat: zod_1.z.number().finite(),
    lng: zod_1.z.number().finite()
});
const DestinationSchema = LatLngSchema.extend({
    label: zod_1.z.string().min(1).max(120).optional(),
    type: zod_1.z.string().min(1).max(60).optional()
});
exports.DistanceMatrixRequestSchema = zod_1.z.object({
    origin: LatLngSchema,
    destinations: zod_1.z.array(DestinationSchema).min(1).max(20),
    mode: zod_1.z.enum(["driving", "walking"]).default("driving")
});
