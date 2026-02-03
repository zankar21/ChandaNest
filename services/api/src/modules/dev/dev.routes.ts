import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { billingStatusDevHandler, makeAgentDevHandler, razorpayModeDevHandler } from "./dev.controller";

export const devRouter = Router();

devRouter.post("/dev/make-agent", authMiddleware, makeAgentDevHandler);
devRouter.get("/dev/billing/status", billingStatusDevHandler);
devRouter.get("/dev/razorpay/mode", razorpayModeDevHandler);
