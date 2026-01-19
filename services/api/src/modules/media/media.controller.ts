import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { createSignedGetUrls, createSignedPutUrl } from "./media.service";
import { SignGetRequestSchema, SignPutRequestSchema } from "./media.schemas";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }

  if (err instanceof Error) {
    const code = "BAD_REQUEST";
    return res.status(400).json({ ok: false, error: { message: err.message, code } });
  }

  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function signPut(req: Request, res: Response) {
  try {
    const payload = SignPutRequestSchema.parse(req.body);
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await createSignedPutUrl({ tenantId: user.tenantId, ...payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function signGet(req: Request, res: Response) {
  try {
    const payload = SignGetRequestSchema.parse(req.body);
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await createSignedGetUrls({ tenantId: user.tenantId, paths: payload.paths });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
