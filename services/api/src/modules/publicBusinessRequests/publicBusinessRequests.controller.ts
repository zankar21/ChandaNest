import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  PublicBusinessRequestBodySchema,
  PublicBusinessRequestInputSchema
} from "./publicBusinessRequests.schema";
import { createBusinessRequest } from "./publicBusinessRequests.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    if (err.message === "RATE_LIMITED") {
      return res.status(429).json({ ok: false, error: { message: "Too many requests", code: "RATE_LIMITED" } });
    }
    return res.status(400).json({ ok: false, error: { message: err.message, code: "BAD_REQUEST" } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip;
}

export async function publicCreateBusinessRequestHandler(req: Request, res: Response) {
  try {
    const rawHp = typeof req.body?.hp === "string" ? req.body.hp.trim() : "";
    if (rawHp) {
      return res.status(200).json({ ok: true });
    }

    const body = PublicBusinessRequestBodySchema.parse(req.body);
    const input = PublicBusinessRequestInputSchema.parse(body);
    const data = await createBusinessRequest(input, {
      ip: getClientIp(req),
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined
    });
    return res.status(201).json({ ok: true, requestId: data.requestId });
  } catch (err) {
    return handleError(err, res);
  }
}
