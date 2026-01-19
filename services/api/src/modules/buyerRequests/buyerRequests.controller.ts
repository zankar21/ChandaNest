import { Request, Response } from "express";
import { ZodError } from "zod";
import { CreateBuyerRequestSchema, ListBuyerRequestQuerySchema, PatchBuyerRequestSchema } from "./buyerRequests.schemas";
import { createBuyerRequestPublic, getBuyerRequest, listBuyerRequests, updateBuyerRequest } from "./buyerRequests.service";
import { AugmentedRequest } from "../../types";

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
        : err.message.includes("PUBLIC_DEFAULT_TENANT_ID")
        ? "CONFIG_ERROR"
        : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "CONFIG_ERROR" ? 500 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function publicCreateBuyerRequestHandler(req: Request, res: Response) {
  try {
    const payload = CreateBuyerRequestSchema.parse(req.body);
    const data = await createBuyerRequestPublic(payload);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listBuyerRequestsHandler(req: Request, res: Response) {
  try {
    const payload = ListBuyerRequestQuerySchema.parse(req.query);
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await listBuyerRequests(user, req.params.tenantId, payload);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getBuyerRequestHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await getBuyerRequest(user, req.params.tenantId, req.params.requestId);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateBuyerRequestHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = PatchBuyerRequestSchema.parse(req.body);
    const data = await updateBuyerRequest(user, req.params.tenantId, req.params.requestId, payload);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
