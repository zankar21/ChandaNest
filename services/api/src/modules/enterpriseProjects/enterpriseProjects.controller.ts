import { Request, Response } from "express";
import { ZodError } from "zod";
import { AugmentedRequest } from "../../types";
import {
  createEnterpriseProject,
  getEnterpriseProject,
  listEnterpriseProjects,
  updateEnterpriseProject
} from "./enterpriseProjects.service";
import { ProjectCreateSchema, ProjectPatchSchema } from "./enterpriseProjects.schemas";

function handleError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ ok: false, error: { message, code: "VALIDATION_ERROR" } });
  }
  if (err instanceof Error) {
    const code = err.message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
    const status = code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ ok: false, error: { message: err.message, code } });
  }
  return res.status(500).json({ ok: false, error: { message: "Unexpected error", code: "INTERNAL_ERROR" } });
}

export async function createEnterpriseProjectHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = ProjectCreateSchema.parse(req.body);
    const data = await createEnterpriseProject({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function listEnterpriseProjectsHandler(req: Request, res: Response) {
  try {
    const data = await listEnterpriseProjects({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function getEnterpriseProjectHandler(req: Request, res: Response) {
  try {
    const data = await getEnterpriseProject({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}

export async function updateEnterpriseProjectHandler(req: Request, res: Response) {
  try {
    const user = (req as AugmentedRequest).user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const payload = ProjectPatchSchema.parse(req.body);
    const data = await updateEnterpriseProject({
      tenantId: req.params.tenantId,
      enterpriseId: req.params.enterpriseId,
      projectId: req.params.projectId,
      user,
      body: payload
    });
    res.json({ ok: true, data });
  } catch (err) {
    handleError(err, res);
  }
}
