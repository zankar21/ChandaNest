import { z } from "zod";

const docTypes = ["aadhaar", "pan", "passport", "driving_license", "other"] as const;
const sides = ["front", "back"] as const;

export const KycSignPutRequestSchema = z.object({
  docType: z.enum(docTypes),
  side: z.enum(sides),
  contentType: z
    .string()
    .min(5)
    .refine(
      (v) => v.startsWith("image/") || v === "application/pdf",
      "contentType must be image/* or application/pdf"
    ),
  fileName: z.string().optional()
});

export type KycSignPutRequest = z.infer<typeof KycSignPutRequestSchema>;

const KycDocumentSchema = z.object({
  type: z.enum(docTypes),
  idNumberMasked: z.string().optional(),
  front: z
    .object({
      objectPath: z.string().min(5),
      contentType: z.string().min(3)
    })
    .optional(),
  back: z
    .object({
      objectPath: z.string().min(5),
      contentType: z.string().min(3)
    })
    .optional()
}).refine((doc) => doc.front || doc.back, {
  message: "At least front or back document must be provided"
});

export const KycSubmitRequestSchema = z.object({
  countryCode: z.string().default("IN"),
  documents: z.array(KycDocumentSchema).min(1)
});

export type KycSubmitRequest = z.infer<typeof KycSubmitRequestSchema>;

export const KycApproveRequestSchema = z.object({
  uid: z.string().min(1),
  action: z.enum(["verify", "reject"]),
  remarks: z.string().optional()
});

export type KycApproveRequest = z.infer<typeof KycApproveRequestSchema>;
