import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { OrgTypeSchema, OrgVerificationDecideSchema } from "./orgVerification.schemas";
import { decideVerification, getVerificationCase, initVerificationCase } from "./orgVerification.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code =
      err.message === "Forbidden"
        ? "FORBIDDEN"
        : err.message === "Not found"
          ? "NOT_FOUND"
          : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function getVerificationCaseHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const orgType = OrgTypeSchema.parse(req.params.orgType);
    const data = await getVerificationCase({
      tenantId: req.params.tenantId,
      user,
      orgType,
      orgId: req.params.orgId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function initVerificationCaseHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const orgType = OrgTypeSchema.parse(req.params.orgType);
    const data = await initVerificationCase({
      tenantId: req.params.tenantId,
      user,
      orgType,
      orgId: req.params.orgId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function decideVerificationHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const orgType = OrgTypeSchema.parse(req.params.orgType);
    const payload = OrgVerificationDecideSchema.parse(req.body);
    const data = await decideVerification({
      tenantId: req.params.tenantId,
      user,
      orgType,
      orgId: req.params.orgId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
