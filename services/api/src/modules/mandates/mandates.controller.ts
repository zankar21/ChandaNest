import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  MandateApproveSchema,
  MandateRejectSchema,
  MandateRequestSchema,
  MandateRevokeSchema
} from "./mandates.schemas";
import {
  approveMandate,
  getMandate,
  listMandates,
  rejectMandate,
  requestMandate,
  revokeMandate
} from "./mandates.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const errAny = err as any;
    const code =
      typeof errAny?.code === "string"
        ? errAny.code
        : err.message === "Forbidden"
          ? "FORBIDDEN"
          : err.message === "Not found"
            ? "NOT_FOUND"
            : "BAD_REQUEST";
    const status =
      typeof errAny?.status === "number"
        ? errAny.status
        : code === "FORBIDDEN" || code === "MANDATE_REQUIRED"
          ? 403
          : code === "NOT_FOUND"
            ? 404
            : 400;
    const message = err.message || "Request failed";
    return res.status(status).json({ ok: false, error: { message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function requestMandateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = MandateRequestSchema.parse(req.body);
    const data = await requestMandate({ tenantId: req.params.tenantId, user, body: payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listMandatesHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listMandates({ tenantId: req.params.tenantId, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getMandateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await getMandate({
      tenantId: req.params.tenantId,
      user,
      mandateId: req.params.mandateId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function approveMandateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = MandateApproveSchema.parse(req.body ?? {});
    const data = await approveMandate({
      tenantId: req.params.tenantId,
      user,
      mandateId: req.params.mandateId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function rejectMandateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = MandateRejectSchema.parse(req.body);
    const data = await rejectMandate({
      tenantId: req.params.tenantId,
      user,
      mandateId: req.params.mandateId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function revokeMandateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = MandateRevokeSchema.parse(req.body ?? {});
    const data = await revokeMandate({
      tenantId: req.params.tenantId,
      user,
      mandateId: req.params.mandateId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
