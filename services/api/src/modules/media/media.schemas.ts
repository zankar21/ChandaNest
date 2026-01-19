import { z } from "zod";

export const SignPutRequestSchema = z.object({
  objectPath: z.string().min(5),
  contentType: z.string().min(3),
  cacheControl: z.string().optional(),
  contentLength: z.number().int().min(1).max(50_000_000).optional()
});

export type SignPutRequest = z.infer<typeof SignPutRequestSchema>;

export const SignGetRequestSchema = z.object({
  paths: z.array(z.string().min(5)).min(1).max(50)
});

export type SignGetRequest = z.infer<typeof SignGetRequestSchema>;
