"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycApproveRequestSchema = exports.KycSubmitRequestSchema = exports.KycSignPutRequestSchema = void 0;
const zod_1 = require("zod");
const docTypes = ["aadhaar", "pan", "passport", "driving_license", "other"];
const sides = ["front", "back"];
exports.KycSignPutRequestSchema = zod_1.z.object({
    docType: zod_1.z.enum(docTypes),
    side: zod_1.z.enum(sides),
    contentType: zod_1.z
        .string()
        .min(5)
        .refine((v) => v.startsWith("image/") || v === "application/pdf", "contentType must be image/* or application/pdf"),
    fileName: zod_1.z.string().optional()
});
const KycDocumentSchema = zod_1.z.object({
    type: zod_1.z.enum(docTypes),
    idNumberMasked: zod_1.z.string().optional(),
    front: zod_1.z
        .object({
        objectPath: zod_1.z.string().min(5),
        contentType: zod_1.z.string().min(3)
    })
        .optional(),
    back: zod_1.z
        .object({
        objectPath: zod_1.z.string().min(5),
        contentType: zod_1.z.string().min(3)
    })
        .optional()
}).refine((doc) => doc.front || doc.back, {
    message: "At least front or back document must be provided"
});
exports.KycSubmitRequestSchema = zod_1.z.object({
    countryCode: zod_1.z.string().default("IN"),
    documents: zod_1.z.array(KycDocumentSchema).min(1)
});
exports.KycApproveRequestSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    action: zod_1.z.enum(["verify", "reject"]),
    remarks: zod_1.z.string().optional()
});
