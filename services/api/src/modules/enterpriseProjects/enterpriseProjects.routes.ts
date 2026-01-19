import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  requireOrgMembership,
  requirePermission
} from "../memberships/membership.middleware";
import {
  createEnterpriseProjectHandler,
  getEnterpriseProjectHandler,
  listEnterpriseProjectsHandler,
  updateEnterpriseProjectHandler
} from "./enterpriseProjects.controller";

export const enterpriseProjectsRouter = Router({ mergeParams: true });

enterpriseProjectsRouter.post(
  "/",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.projects.manage"),
  createEnterpriseProjectHandler
);
enterpriseProjectsRouter.get(
  "/",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.projects.read"),
  listEnterpriseProjectsHandler
);
enterpriseProjectsRouter.get(
  "/:projectId",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.projects.read"),
  getEnterpriseProjectHandler
);
enterpriseProjectsRouter.patch(
  "/:projectId",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.projects.manage"),
  updateEnterpriseProjectHandler
);
