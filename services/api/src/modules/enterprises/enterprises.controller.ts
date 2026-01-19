import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  addEnterpriseMember,
  createEnterprise,
  getEnterprise,
  listEnterpriseMembers,
  listEnterprises,
  updateEnterpriseMember
} from "./enterprises.service";
import {
  EnterpriseCreateSchema,
  EnterpriseMemberCreateSchema,
  EnterpriseMemberUpdateSchema
} from "./enterprises.schemas";

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

export async function createEnterpriseHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = EnterpriseCreateSchema.parse(req.body);
    const data = await createEnterprise({ tenantId: req.params.tenantId, user, body: payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listEnterprisesHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listEnterprises({ tenantId: req.params.tenantId, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getEnterpriseHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await getEnterprise({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function addEnterpriseMemberHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = EnterpriseMemberCreateSchema.parse(req.body);
    const data = await addEnterpriseMember({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      userId: payload.userId,
      role: payload.role,
      status: payload.status,
      actor: user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateEnterpriseMemberHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = EnterpriseMemberUpdateSchema.parse(req.body);
    const data = await updateEnterpriseMember({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      membershipId: req.params.membershipId,
      role: payload.role,
      status: payload.status,
      actor: user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listEnterpriseMembersHandler(req: Request, res: Response) {
  try {
    const data = await listEnterpriseMembers({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
