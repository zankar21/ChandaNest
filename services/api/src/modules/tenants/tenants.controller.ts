import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import { EmptyBodySchema, OwnerOnboardSchema } from "./tenants.schemas";
import { completePhoneKyc, getTenantMe, onboardOwner } from "./tenants.service";
import { logger } from "../../utils/logger";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    logger.warn("Tenant onboarding validation failed", {
      issues: err.errors.map((issue) => ({ path: issue.path, message: issue.message }))
    });
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    if (err.message === "handle_taken") {
      return res.status(409).json({ ok: false, error: { message: "handle_taken", code: "HANDLE_TAKEN" } });
    }
    if (err.message === "phone_required") {
      return res.status(400).json({ ok: false, error: { message: "phone_required", code: "PHONE_REQUIRED" } });
    }
    const code = err.message === "Forbidden" ? "FORBIDDEN" : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : 400;
    if (status === 400) {
      logger.warn("Tenant onboarding error", { message: err.message });
    }
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function getMeHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const data = await getTenantMe({ tenantId: req.params.tenantId, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function completePhoneKycHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    EmptyBodySchema.parse(req.body ?? {});
    const data = await completePhoneKyc({ tenantId: req.params.tenantId, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function onboardOwnerHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    const payload = OwnerOnboardSchema.parse(req.body ?? {});
    const data = await onboardOwner({
      tenantId: req.params.tenantId,
      user,
      fullName: payload.fullName,
      ownerType: payload.ownerType,
      city: payload.city,
      contactPreference: payload.contactPreference,
      bestTimeToContact: payload.bestTimeToContact,
      alternatePhone: payload.alternatePhone,
      email: payload.email
    });
    res.json({ ok: true, data });
  } catch (err) {
    if (err instanceof ZodError) {
      const body = (req.body ?? {}) as Record<string, unknown>;
      logger.warn("Tenant onboard invalid payload", {
        ownerType: body.ownerType,
        city: body.city,
        contactPreference: body.contactPreference,
        bestTimeToContact: body.bestTimeToContact,
        fullNameLength: typeof body.fullName === "string" ? body.fullName.trim().length : null,
        hasAlternatePhone: Boolean(body.alternatePhone),
        hasEmail: Boolean(body.email),
        consentOwner: body.consentOwner,
        consentTerms: body.consentTerms,
        consentContact: body.consentContact
      });
    }
    handleError(err, res);
  }
}
