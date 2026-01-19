import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import {
  addLeadNoteHandler,
  assignLeadHandler,
  createLeadHandler,
  getLeadHandler,
  listLeadNotesHandler,
  listLeadsHandler,
  updateLeadHandler,
  updateLeadStageHandler
} from "./leads.controller";

export const leadsRouter = Router();

leadsRouter.get("/", authMiddleware, listLeadsHandler);
leadsRouter.get("/:leadId", authMiddleware, getLeadHandler);
leadsRouter.post("/", authMiddleware, requireAppCheckForWrites, createLeadHandler);
leadsRouter.put("/:leadId", authMiddleware, requireAppCheckForWrites, updateLeadHandler);
leadsRouter.post("/:leadId/assign", authMiddleware, requireAppCheckForWrites, assignLeadHandler);
leadsRouter.post("/:leadId/stage", authMiddleware, requireAppCheckForWrites, updateLeadStageHandler);
leadsRouter.post("/:leadId/notes", authMiddleware, requireAppCheckForWrites, addLeadNoteHandler);
leadsRouter.get("/:leadId/notes", authMiddleware, listLeadNotesHandler);
