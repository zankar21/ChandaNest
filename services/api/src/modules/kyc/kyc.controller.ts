import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { createKycSignedPutUrl, submitKyc, approveKyc } from "./kyc.service";
import {
  KycApproveRequestSchema,
  KycSignPutRequestSchema,
  KycSubmitRequestSchema
} from "./kyc.schemas";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code = err.message.startsWith("Forbidden") ? "FORBIDDEN" : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function signPut(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = KycSignPutRequestSchema.parse(req.body);
    const data = await createKycSignedPutUrl({ uid: user.uid, ...payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function submit(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = KycSubmitRequestSchema.parse(req.body);
    const data = await submitKyc({ uid: user.uid, ...payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function approve(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = KycApproveRequestSchema.parse(req.body);
    const data = await approveKyc({
      uid: payload.uid,
      action: payload.action,
      remarks: payload.remarks,
      adminUid: user.uid,
      adminRole: user.role
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
