import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  addLeadNote,
  assignLead,
  createAdminLead,
  createPublicLead,
  getLead,
  listLeadNotes,
  listLeads,
  updateLead,
  updateLeadStage
} from "./leads.service";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    if (err.message === "RATE_LIMITED") {
      return res
        .status(429)
        .json({ ok: false, error: { message: "RATE_LIMITED", code: "RATE_LIMITED" } });
    }
    const code =
      err.message === "Forbidden"
        ? "FORBIDDEN"
        : err.message === "Not found"
          ? "NOT_FOUND"
          : err.message === "INVALID_TENANT" || err.message === "Tenant required"
            ? "INVALID_TENANT"
            : "BAD_REQUEST";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

function requireTenantId(req: Request) {
  const tenantId = String(req.query.tenantId || "").trim();
  if (!tenantId || !/^[A-Za-z0-9_-]+$/.test(tenantId)) {
    throw new Error("INVALID_TENANT");
  }
  return tenantId;
}

export async function publicCreateLeadHandler(req: Request, res: Response) {
  try {
    const data = await createPublicLead({
      body: req.body,
      meta: { userAgent: req.headers["user-agent"], ip: req.ip }
    });
    if ((data as any)?.ignored) {
      return res.status(204).send();
    }
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listLeadsHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listLeads({
      tenantId: requireTenantId(req),
      user,
      query: req.query
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getLeadHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await getLead({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function createLeadHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await createAdminLead({
      tenantId: requireTenantId(req),
      user,
      body: req.body
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateLeadHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await updateLead({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId,
      body: req.body
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function assignLeadHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await assignLead({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId,
      body: req.body
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateLeadStageHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await updateLeadStage({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId,
      body: req.body
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function addLeadNoteHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await addLeadNote({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId,
      body: req.body
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listLeadNotesHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const data = await listLeadNotes({
      tenantId: requireTenantId(req),
      user,
      leadId: req.params.leadId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
