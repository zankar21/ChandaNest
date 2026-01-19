import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { OrgDocCreateSchema, OrgDocListQuerySchema, OrgDocPatchSchema } from "./orgDocs.schemas";
import { createOrgDoc, listOrgDocs, updateOrgDoc } from "./orgDocs.service";

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

export async function createOrgDocHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = OrgDocCreateSchema.parse(req.body);
    const data = await createOrgDoc({ tenantId: req.params.tenantId, user, body: payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listOrgDocsHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const query = OrgDocListQuerySchema.parse(req.query);
    const data = await listOrgDocs({ tenantId: req.params.tenantId, user, query });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateOrgDocHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = OrgDocPatchSchema.parse(req.body);
    const data = await updateOrgDoc({
      tenantId: req.params.tenantId,
      user,
      docId: req.params.docId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
