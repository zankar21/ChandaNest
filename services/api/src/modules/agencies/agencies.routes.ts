import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  requireOrgMembership,
  requirePermission,
  requireTenantAdmin
} from "../memberships/membership.middleware";
import {
  addAgencyMemberHandler,
  createAgencyHandler,
  getAgencyHandler,
  listAgencyMembersHandler,
  listAgenciesHandler,
  updateAgencyMemberHandler
} from "./agencies.controller";

export const agenciesRouter = Router({ mergeParams: true });

agenciesRouter.post("/", authMiddleware, requireTenantAdmin, createAgencyHandler);
agenciesRouter.get("/", authMiddleware, listAgenciesHandler);
agenciesRouter.get("/:agencyId", authMiddleware, getAgencyHandler);

agenciesRouter.post(
  "/:agencyId/members",
  authMiddleware,
  requireOrgMembership("agency", "agencyId"),
  requirePermission("members.manage"),
  addAgencyMemberHandler
);
agenciesRouter.patch(
  "/:agencyId/members/:membershipId",
  authMiddleware,
  requireOrgMembership("agency", "agencyId"),
  requirePermission("members.manage"),
  updateAgencyMemberHandler
);
agenciesRouter.get(
  "/:agencyId/members",
  authMiddleware,
  requireOrgMembership("agency", "agencyId"),
  requirePermission("members.read"),
  listAgencyMembersHandler
);
