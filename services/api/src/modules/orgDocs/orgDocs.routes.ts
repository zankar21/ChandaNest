import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { createOrgDocHandler, listOrgDocsHandler, updateOrgDocHandler } from "./orgDocs.controller";

export const orgDocsRouter = Router({ mergeParams: true });

orgDocsRouter.post("/", authMiddleware, createOrgDocHandler);
orgDocsRouter.get("/", authMiddleware, listOrgDocsHandler);
orgDocsRouter.patch("/:docId", authMiddleware, updateOrgDocHandler);
