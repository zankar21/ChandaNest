import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import {
  createProjectHandler,
  createUnitHandler,
  deleteProjectHandler,
  deleteUnitHandler,
  getProjectHandler,
  listProjectsHandler,
  listUnitsHandler,
  publishProjectHandler,
  publicGetProjectHandler,
  publicListProjectUnitsHandler,
  publicListProjectsHandler,
  unpublishProjectHandler,
  updateProjectHandler,
  updateUnitHandler
} from "./projects.controller";

export const projectsRouter = Router({ mergeParams: true });

// Admin routes (tenant scoped via query or legacy param)
projectsRouter.post("/admin/projects", authMiddleware, requireAppCheckForWrites, createProjectHandler);
projectsRouter.get("/admin/projects", authMiddleware, listProjectsHandler);
projectsRouter.get("/admin/projects/:projectId", authMiddleware, getProjectHandler);
projectsRouter.put("/admin/projects/:projectId", authMiddleware, requireAppCheckForWrites, updateProjectHandler);
projectsRouter.delete("/admin/projects/:projectId", authMiddleware, requireAppCheckForWrites, deleteProjectHandler);
projectsRouter.post(
  "/admin/projects/:projectId/publish",
  authMiddleware,
  requireAppCheckForWrites,
  publishProjectHandler
);
projectsRouter.post(
  "/admin/projects/:projectId/unpublish",
  authMiddleware,
  requireAppCheckForWrites,
  unpublishProjectHandler
);

projectsRouter.post(
  "/admin/projects/:projectId/units",
  authMiddleware,
  requireAppCheckForWrites,
  createUnitHandler
);
projectsRouter.get("/admin/projects/:projectId/units", authMiddleware, listUnitsHandler);
projectsRouter.put(
  "/admin/projects/:projectId/units/:unitId",
  authMiddleware,
  requireAppCheckForWrites,
  updateUnitHandler
);
projectsRouter.delete(
  "/admin/projects/:projectId/units/:unitId",
  authMiddleware,
  requireAppCheckForWrites,
  deleteUnitHandler
);

// Legacy tenant-scoped routes (compat)
projectsRouter.post(
  "/tenants/:tenantId/projects",
  authMiddleware,
  requireAppCheckForWrites,
  createProjectHandler
);
projectsRouter.get("/tenants/:tenantId/projects", authMiddleware, listProjectsHandler);
projectsRouter.get("/tenants/:tenantId/projects/:projectId", authMiddleware, getProjectHandler);
projectsRouter.put(
  "/tenants/:tenantId/projects/:projectId",
  authMiddleware,
  requireAppCheckForWrites,
  updateProjectHandler
);
projectsRouter.delete(
  "/tenants/:tenantId/projects/:projectId",
  authMiddleware,
  requireAppCheckForWrites,
  deleteProjectHandler
);
projectsRouter.post(
  "/tenants/:tenantId/projects/:projectId/publish",
  authMiddleware,
  requireAppCheckForWrites,
  publishProjectHandler
);
projectsRouter.post(
  "/tenants/:tenantId/projects/:projectId/unpublish",
  authMiddleware,
  requireAppCheckForWrites,
  unpublishProjectHandler
);
projectsRouter.post(
  "/tenants/:tenantId/projects/:projectId/units",
  authMiddleware,
  requireAppCheckForWrites,
  createUnitHandler
);
projectsRouter.get("/tenants/:tenantId/projects/:projectId/units", authMiddleware, listUnitsHandler);
projectsRouter.put(
  "/tenants/:tenantId/projects/:projectId/units/:unitId",
  authMiddleware,
  requireAppCheckForWrites,
  updateUnitHandler
);
projectsRouter.delete(
  "/tenants/:tenantId/projects/:projectId/units/:unitId",
  authMiddleware,
  requireAppCheckForWrites,
  deleteUnitHandler
);

// Public routes
projectsRouter.get("/public/projects", publicListProjectsHandler);
projectsRouter.get("/public/projects/:slug", publicGetProjectHandler);
projectsRouter.get("/public/projects/:slug/units", publicListProjectUnitsHandler);
