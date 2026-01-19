"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateAiDescriptionSchema = void 0;
const zod_1 = require("zod");
exports.GenerateAiDescriptionSchema = zod_1.z.object({
    setActive: zod_1.z.boolean().optional(),
    force: zod_1.z.boolean().optional()
});
