import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import { completePhoneKycHandler, getMeHandler, onboardOwnerHandler } from "./tenants.controller";

export const tenantsRouter = Router({ mergeParams: true });

tenantsRouter.get("/tenants/:tenantId/me", authMiddleware, getMeHandler);
tenantsRouter.post(
  "/tenants/:tenantId/kyc/phone/complete",
  authMiddleware,
  requireAppCheckForWrites,
  completePhoneKycHandler
);
tenantsRouter.post(
  "/tenants/:tenantId/owner/onboard",
  authMiddleware,
  requireAppCheckForWrites,
  onboardOwnerHandler
);
