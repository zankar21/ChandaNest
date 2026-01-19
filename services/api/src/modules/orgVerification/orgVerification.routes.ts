import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  decideVerificationHandler,
  getVerificationCaseHandler,
  initVerificationCaseHandler
} from "./orgVerification.controller";

export const orgVerificationRouter = Router({ mergeParams: true });

orgVerificationRouter.get("/:orgType/:orgId", authMiddleware, getVerificationCaseHandler);
orgVerificationRouter.post("/:orgType/:orgId/init", authMiddleware, initVerificationCaseHandler);
orgVerificationRouter.post("/:orgType/:orgId/decide", authMiddleware, decideVerificationHandler);
