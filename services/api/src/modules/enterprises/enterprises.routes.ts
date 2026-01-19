import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  requireOrgMembership,
  requirePermission,
  requireTenantAdmin
} from "../memberships/membership.middleware";
import {
  addEnterpriseMemberHandler,
  createEnterpriseHandler,
  getEnterpriseHandler,
  listEnterpriseMembersHandler,
  listEnterprisesHandler,
  updateEnterpriseMemberHandler
} from "./enterprises.controller";

export const enterprisesRouter = Router({ mergeParams: true });

enterprisesRouter.post("/", authMiddleware, requireTenantAdmin, createEnterpriseHandler);
enterprisesRouter.get("/", authMiddleware, listEnterprisesHandler);
enterprisesRouter.get("/:enterpriseId", authMiddleware, getEnterpriseHandler);

enterprisesRouter.post(
  "/:enterpriseId/members",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("members.manage"),
  addEnterpriseMemberHandler
);
enterprisesRouter.patch(
  "/:enterpriseId/members/:membershipId",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("members.manage"),
  updateEnterpriseMemberHandler
);
enterprisesRouter.get(
  "/:enterpriseId/members",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("members.read"),
  listEnterpriseMembersHandler
);
