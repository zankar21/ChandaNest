"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgVerificationDecideSchema = exports.ChecklistSchema = exports.OrgVerificationStatusSchema = exports.OrgTypeSchema = void 0;
const zod_1 = require("zod");
exports.OrgTypeSchema = zod_1.z.enum(["agency", "enterprise"]);
exports.OrgVerificationStatusSchema = zod_1.z.enum(["pending", "verified", "rejected"]);
exports.ChecklistSchema = zod_1.z.object({
    rera: zod_1.z.boolean().optional(),
    firmRegistration: zod_1.z.boolean().optional(),
    addressProof: zod_1.z.boolean().optional(),
    gst: zod_1.z.boolean().optional(),
    pan: zod_1.z.boolean().optional(),
    authorizationLetter: zod_1.z.boolean().optional()
});
exports.OrgVerificationDecideSchema = zod_1.z.object({
    status: zod_1.z.enum(["verified", "rejected"]),
    checklist: exports.ChecklistSchema.optional(),
    notes: zod_1.z.string().min(1).optional(),
    reason: zod_1.z.string().min(1).optional()
});
