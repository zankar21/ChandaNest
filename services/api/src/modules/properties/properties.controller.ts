import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  ApprovePropertySchema,
  CreatePropertySchema,
  FeaturePropertySchema,
  ListPropertiesQuerySchema,
  PatchPropertySchema,
  RejectPropertySchema,
  SetVisibilitySchema,
  PublicListQuerySchema
} from "./properties.schemas";
import {
  approveProperty,
  createProperty,
  getProperty,
  getPublicProperty,
  listProperties,
  listPublicProperties,
  publishProperty,
  validateProperty,
  rejectProperty,
  setFeaturedProperty,
  setVisibilityProperty,
  submitProperty,
  deleteProperty,
  unpublishProperty,
  updateProperty
} from "./properties.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    const fields = err.errors.map((e) => e.path.filter((p) => p !== undefined).join(".")).filter(Boolean);
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR", fields } });
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
        : err.message === "Unpublish before deleting."
        ? "CONFLICT"
        : err.message === "Unpublish before editing."
        ? "CONFLICT"
        : "BAD_REQUEST";
    const status =
      typeof errAny?.status === "number"
        ? errAny.status
        : code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
        ? 404
        : code === "CONFLICT" || code === "LIMIT_REACHED"
        ? 409
        : code === "PAYMENT_REQUIRED"
        ? 402
        : 400;
    return res.status(status).json({
      ok: false,
      error: { message: err.message, code, fields: Array.isArray(errAny?.fields) ? errAny.fields : undefined }
    });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function createHandler(req: Request, res: Response) {
  try {
    const payload = CreatePropertySchema.parse(req.body);
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await createProperty({ tenantId: req.params.tenantId, body: payload, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateHandler(req: Request, res: Response) {
  try {
    const payload = PatchPropertySchema.parse(req.body);
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await updateProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      body: payload,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const query = ListPropertiesQuerySchema.parse(req.query);
    const data = await listProperties(req.params.tenantId, user, {
      mine: query.mine === "1" || query.mine === "true"
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await getProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function validateHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await validateProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function submitHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await submitProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function approveHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = ApprovePropertySchema.parse(req.body);
    const data = await approveProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function unpublishHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await unpublishProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function deleteHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await deleteProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publishHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await publishProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function featureHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = FeaturePropertySchema.parse(req.body);
    const data = await setFeaturedProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      body: payload,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publicListHandler(req: Request, res: Response) {
  try {
    const query = PublicListQuerySchema.parse(req.query);
    const data = await listPublicProperties(query);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publicGetHandler(req: Request, res: Response) {
  try {
    const data = await getPublicProperty(req.params.propertyId);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function rejectHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = RejectPropertySchema.parse(req.body);
    const data = await rejectProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function setVisibilityHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = SetVisibilitySchema.parse(req.body);
    const data = await setVisibilityProperty({
      tenantId: req.params.tenantId,
      propertyId: req.params.propertyId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
