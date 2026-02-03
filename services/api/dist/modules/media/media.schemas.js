"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignGetRequestSchema = exports.SignPutRequestSchema = void 0;
const zod_1 = require("zod");
exports.SignPutRequestSchema = zod_1.z.object({
    objectPath: zod_1.z.string().min(5),
    contentType: zod_1.z.string().min(3),
    cacheControl: zod_1.z.string().optional(),
    contentLength: zod_1.z.number().int().min(1).max(50000000).optional()
});
exports.SignGetRequestSchema = zod_1.z.object({
    paths: zod_1.z.array(zod_1.z.string().min(5)).min(1).max(50)
});
