import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  ProjectCreateSchema,
  ProjectListQuerySchema,
  ProjectUpdateSchema,
  PublicProjectListQuerySchema,
  UnitCreateSchema,
  UnitUpdateSchema
} from "./projects.schemas";
import {
  createProject,
  createUnit,
  deleteProject,
  deleteUnit,
  getProject,
  listProjects,
  listUnits,
  publishProject,
  publicGetProject,
  publicListProjectUnits,
  publicListProjects,
  unpublishProject,
  updateProject,
  updateUnit
} from "./projects.service";

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
            : err.message === "TENANT_ID_REQUIRED"
              ? "TENANT_ID_REQUIRED"
              : "BAD_REQUEST";
    const status =
      typeof errAny?.status === "number"
        ? errAny.status
        : code === "FORBIDDEN"
          ? 403
          : code === "NOT_FOUND"
            ? 404
            : code === "TENANT_ID_REQUIRED"
              ? 400
              : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

function requireUser(req: Request, res: Response) {
  const user = (req as AugmentedRequest).user;
  if (!user) {
    res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    return null;
  }
  return user;
}

export async function createProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = ProjectCreateSchema.parse(req.body);
    const data = await createProject({ tenantId: (req.query.tenantId as string) || req.params.tenantId, user, body: payload });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = ProjectUpdateSchema.parse(req.body);
    const data = await updateProject({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function deleteProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await deleteProject({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await getProject({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listProjectsHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const query = ProjectListQuerySchema.parse(req.query);
    const data = await listProjects({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      user,
      query
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publishProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await publishProject({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function unpublishProjectHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await unpublishProject({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function createUnitHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = UnitCreateSchema.parse(req.body);
    const data = await createUnit({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user,
      body: payload
    });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateUnitHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = UnitUpdateSchema.parse(req.body);
    const data = await updateUnit({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      unitId: req.params.unitId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function deleteUnitHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await deleteUnit({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      unitId: req.params.unitId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listUnitsHandler(req: Request, res: Response) {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const data = await listUnits({
      tenantId: (req.query.tenantId as string) || req.params.tenantId,
      projectId: req.params.projectId,
      user
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publicListProjectsHandler(req: Request, res: Response) {
  try {
    const query = PublicProjectListQuerySchema.parse(req.query);
    const data = await publicListProjects(query);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publicGetProjectHandler(req: Request, res: Response) {
  try {
    const data = await publicGetProject(req.params.slug);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function publicListProjectUnitsHandler(req: Request, res: Response) {
  try {
    const data = await publicListProjectUnits(req.params.slug);
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
