import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { acceptInviteHandler } from "./publicInvites.controller";

export const publicInvitesRouter = Router();

publicInvitesRouter.post("/accept", authMiddleware, acceptInviteHandler);
