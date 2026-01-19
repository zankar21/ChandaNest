import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  createTeamInviteHandler,
  disableTeamUserHandler,
  enableTeamUserHandler,
  getTeamMeHandler,
  listTeamInvitesHandler,
  listTeamUsersHandler,
  revokeTeamInviteHandler
} from "./team.controller";

export const teamRouter = Router();

teamRouter.get("/me", authMiddleware, getTeamMeHandler);
teamRouter.get("/users", authMiddleware, listTeamUsersHandler);
teamRouter.post("/invites", authMiddleware, createTeamInviteHandler);
teamRouter.get("/invites", authMiddleware, listTeamInvitesHandler);
teamRouter.post("/invites/:inviteId/revoke", authMiddleware, revokeTeamInviteHandler);
teamRouter.post("/users/:uid/disable", authMiddleware, disableTeamUserHandler);
teamRouter.post("/users/:uid/enable", authMiddleware, enableTeamUserHandler);
