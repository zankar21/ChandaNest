import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  addAgencyMember,
  createAgency,
  getAgency,
  listAgencies,
  listAgencyMembers,
  updateAgencyMember
} from "./agencies.service";
import {
  AgencyCreateSchema,
  AgencyMemberCreateSchema,
  AgencyMemberUpdateSchema
} from "./agencies.schemas";

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

export async function createAgencyHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = AgencyCreateSchema.parse(req.body);
    const data = await createAgency({ tenantId: req.params.tenantId, user, body: payload });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listAgenciesHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listAgencies({ tenantId: req.params.tenantId, user });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getAgencyHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await getAgency({
      tenantId: req.params.tenantId,
      agencyId: req.params.agencyId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function addAgencyMemberHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = AgencyMemberCreateSchema.parse(req.body);
    const data = await addAgencyMember({
      tenantId: req.params.tenantId,
      agencyId: req.params.agencyId,
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

export async function updateAgencyMemberHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = AgencyMemberUpdateSchema.parse(req.body);
    const data = await updateAgencyMember({
      tenantId: req.params.tenantId,
      agencyId: req.params.agencyId,
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

export async function listAgencyMembersHandler(req: Request, res: Response) {
  try {
    const data = await listAgencyMembers({
      tenantId: req.params.tenantId,
      agencyId: req.params.agencyId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
