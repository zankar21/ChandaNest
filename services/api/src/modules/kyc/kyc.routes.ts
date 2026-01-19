import { Router } from "express";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { approve, signPut, submit } from "./kyc.controller";

export const kycRouter = Router();

kycRouter.post("/sign-put", authMiddleware, requireAppCheckForWrites, signPut);
kycRouter.post("/submit", authMiddleware, requireAppCheckForWrites, submit);
kycRouter.post("/approve", authMiddleware, requireAppCheckForWrites, approve);
