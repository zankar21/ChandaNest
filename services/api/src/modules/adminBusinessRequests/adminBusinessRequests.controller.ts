import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  ApproveBusinessRequestSchema,
  ListBusinessRequestsQuerySchema,
  RejectBusinessRequestSchema
} from "./adminBusinessRequests.schema";
import { approveBusinessRequest, listBusinessRequests, rejectBusinessRequest } from "./adminBusinessRequests.service";

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
        : err.message === "ALREADY_REVIEWED"
        ? "ALREADY_REVIEWED"
        : err.message === "TENANT_ID_CONFLICT"
        ? "TENANT_ID_CONFLICT"
        : err.message === "INVALID_TENANT_SLUG"
        ? "INVALID_TENANT_SLUG"
        : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "ALREADY_REVIEWED" ? 409 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function listBusinessRequestsHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = ListBusinessRequestsQuerySchema.parse(req.query);
    const data = await listBusinessRequests(user, query);
    return res.json({ ok: true, ...data });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function approveBusinessRequestHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const body = ApproveBusinessRequestSchema.parse(req.body ?? {});
    const data = await approveBusinessRequest(user, req.params.id, body);
    return res.json({ ok: true, ...data });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function rejectBusinessRequestHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const body = RejectBusinessRequestSchema.parse(req.body ?? {});
    await rejectBusinessRequest(user, req.params.id, body);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}
