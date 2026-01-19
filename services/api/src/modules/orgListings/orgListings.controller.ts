import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  createOrgListing,
  getOrgListing,
  listOrgListings,
  transitionOrgListing,
  updateOrgListing
} from "./orgListings.service";
import { OrgListingCreateSchema, OrgListingPatchSchema, TransitionRequestSchema } from "./orgListings.schemas";

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
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function createOrgListingHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = OrgListingCreateSchema.parse(req.body);
    const data = await createOrgListing({ tenantId: req.params.tenantId, user, body: payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listOrgListingsHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listOrgListings({
      tenantId: req.params.tenantId,
      user,
      query: req.query
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getOrgListingHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await getOrgListing({
      tenantId: req.params.tenantId,
      user,
      id: req.params.orgListingId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateOrgListingHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = OrgListingPatchSchema.parse(req.body);
    const data = await updateOrgListing({
      tenantId: req.params.tenantId,
      user,
      id: req.params.orgListingId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function transitionOrgListingHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = TransitionRequestSchema.parse(req.body);
    const data = await transitionOrgListing({
      tenantId: req.params.tenantId,
      user,
      id: req.params.orgListingId,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
