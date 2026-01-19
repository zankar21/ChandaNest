import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  approveMandateHandler,
  getMandateHandler,
  listMandatesHandler,
  rejectMandateHandler,
  requestMandateHandler,
  revokeMandateHandler
} from "./mandates.controller";

export const mandatesRouter = Router({ mergeParams: true });

mandatesRouter.post("/request", authMiddleware, requestMandateHandler);
mandatesRouter.get("/", authMiddleware, listMandatesHandler);
mandatesRouter.get("/:mandateId", authMiddleware, getMandateHandler);
mandatesRouter.post("/:mandateId/approve", authMiddleware, approveMandateHandler);
mandatesRouter.post("/:mandateId/reject", authMiddleware, rejectMandateHandler);
mandatesRouter.post("/:mandateId/revoke", authMiddleware, revokeMandateHandler);
