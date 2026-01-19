import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  approveBusinessRequestHandler,
  listBusinessRequestsHandler,
  rejectBusinessRequestHandler
} from "./adminBusinessRequests.controller";

export const adminBusinessRequestsRouter = Router();

adminBusinessRequestsRouter.get("/", authMiddleware, listBusinessRequestsHandler);
adminBusinessRequestsRouter.post("/:id/approve", authMiddleware, approveBusinessRequestHandler);
adminBusinessRequestsRouter.post("/:id/reject", authMiddleware, rejectBusinessRequestHandler);
