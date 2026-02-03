"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgDocPatchSchema = exports.OrgDocListQuerySchema = exports.OrgDocCreateSchema = exports.DocStatusSchema = exports.DocCategorySchema = exports.OrgTypeSchema = void 0;
const zod_1 = require("zod");
exports.OrgTypeSchema = zod_1.z.enum(["agency", "enterprise"]);
exports.DocCategorySchema = zod_1.z.enum([
    "rera",
    "gst",
    "pan",
    "address_proof",
    "firm_registration",
    "authorization_letter",
    "brochure",
    "layout_plan",
    "other"
]);
exports.DocStatusSchema = zod_1.z.enum(["active", "archived"]);
exports.OrgDocCreateSchema = zod_1.z.object({
    orgType: exports.OrgTypeSchema,
    orgId: zod_1.z.string().min(1),
    category: exports.DocCategorySchema,
    objectPath: zod_1.z.string().min(5),
    contentType: zod_1.z.string().min(1).optional(),
    sizeBytes: zod_1.z.number().int().positive().optional(),
    name: zod_1.z.string().min(1).optional(),
    title: zod_1.z.string().min(1).optional()
});
exports.OrgDocListQuerySchema = zod_1.z.object({
    orgType: exports.OrgTypeSchema,
    orgId: zod_1.z.string().min(1),
    category: exports.DocCategorySchema.optional()
});
exports.OrgDocPatchSchema = zod_1.z
    .object({
    status: exports.DocStatusSchema.optional(),
    title: zod_1.z.string().min(1).optional()
})
    .refine((val) => val.status || val.title, { message: "No updates provided" });
