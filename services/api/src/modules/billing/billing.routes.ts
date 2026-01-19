import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  cancelSubscriptionHandler,
  getSubscriptionHandler,
  overrideOnboardingHandler,
  overrideSubscriptionHandler
} from "./billing.controller";

export const billingRouter = Router();

billingRouter.get("/subscription", authMiddleware, getSubscriptionHandler);
billingRouter.post("/subscription/override", authMiddleware, overrideSubscriptionHandler);
billingRouter.post("/subscription/cancel", authMiddleware, cancelSubscriptionHandler);
billingRouter.post("/onboarding/override", authMiddleware, overrideOnboardingHandler);
