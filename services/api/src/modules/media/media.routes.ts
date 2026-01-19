import { Router } from "express";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { signGet, signPut } from "./media.controller";

export const mediaRouter = Router();

mediaRouter.post("/sign-put", authMiddleware, requireAppCheckForWrites, signPut);
mediaRouter.post("/sign-get", authMiddleware, requireAppCheckForWrites, signGet);
