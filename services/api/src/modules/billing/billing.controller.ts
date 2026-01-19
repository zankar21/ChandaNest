import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  GetSubscriptionQuerySchema,
  OnboardingOverrideSchema,
  SubscriptionOverrideSchema
} from "./billing.schema";
import {
  cancelSubscription,
  getSubscriptionSummary,
  isPlatformAdmin,
  overrideOnboarding,
  overrideSubscription
} from "./billing.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code =
      err.message === "Forbidden"
        ? "FORBIDDEN"
        : err.message === "TENANT_NOT_FOUND"
        ? "NOT_FOUND"
        : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function getSubscriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const query = GetSubscriptionQuerySchema.parse(req.query);
    const tenantId = isPlatformAdmin(user) ? query.tenantId ?? "" : user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: { message: "tenantId is required", code: "VALIDATION_ERROR" } });
    }
    const summary = await getSubscriptionSummary(tenantId, user);
    return res.json({ ok: true, ...summary });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function overrideSubscriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const body = SubscriptionOverrideSchema.parse(req.body);
    await overrideSubscription(user, body);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function cancelSubscriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const tenantId = user.tenantId;
    await cancelSubscription(user, tenantId);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function overrideOnboardingHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const body = OnboardingOverrideSchema.parse(req.body);
    await overrideOnboarding(user, body);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}
