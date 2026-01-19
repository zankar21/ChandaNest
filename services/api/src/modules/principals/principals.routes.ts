import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { principalsMeHandler } from "./principals.controller";

export const principalsRouter = Router({ mergeParams: true });

principalsRouter.get("/me", authMiddleware, principalsMeHandler);
