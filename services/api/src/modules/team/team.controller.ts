import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  TeamInviteCreateSchema,
  TeamInviteListQuerySchema,
  TeamTenantQuerySchema,
  TeamUserActionSchema
} from "./team.schema";
import {
  createTeamInvite,
  disableTeamUser,
  enableTeamUser,
  getTeamMe,
  listTeamInvites,
  listTeamUsers,
  revokeTeamInvite
} from "./team.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code =
      err.message === "FORBIDDEN"
        ? "FORBIDDEN"
        : err.message === "TENANT_ID_REQUIRED"
        ? "TENANT_ID_REQUIRED"
        : err.message === "NOT_FOUND"
        ? "NOT_FOUND"
        : err.message === "INVALID_ROLE"
        ? "INVALID_ROLE"
        : err.message === "ALREADY_MEMBER"
        ? "ALREADY_MEMBER"
        : err.message === "SEAT_LIMIT_REACHED"
        ? "SEAT_LIMIT_REACHED"
        : "BAD_REQUEST";
    const status =
      code === "FORBIDDEN"
        ? 403
        : code === "NOT_FOUND"
        ? 404
        : code === "ALREADY_MEMBER" || code === "SEAT_LIMIT_REACHED"
        ? 409
        : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function getTeamMeHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const data = await getTeamMe(user, query.tenantId);
    return res.json({ ok: true, ...data });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function listTeamUsersHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const users = await listTeamUsers(user, query.tenantId);
    return res.json({ ok: true, users });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function listTeamInvitesHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamInviteListQuerySchema.parse(req.query);
    const invites = await listTeamInvites(user, query.tenantId, query.status);
    return res.json({ ok: true, invites });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function createTeamInviteHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const body = TeamInviteCreateSchema.parse(req.body ?? {});
    const data = await createTeamInvite(user, body, query.tenantId);
    return res.status(201).json({ ok: true, ...data });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function revokeTeamInviteHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const inviteId = TeamUserActionSchema.parse({ uid: req.params.inviteId }).uid;
    await revokeTeamInvite(user, inviteId, query.tenantId);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function disableTeamUserHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const uid = TeamUserActionSchema.parse({ uid: req.params.uid }).uid;
    await disableTeamUser(user, uid, query.tenantId);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function enableTeamUserHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    const query = TeamTenantQuerySchema.parse(req.query);
    const uid = TeamUserActionSchema.parse({ uid: req.params.uid }).uid;
    await enableTeamUser(user, uid, query.tenantId);
    return res.json({ ok: true });
  } catch (err) {
    return handleError(err, res);
  }
}
