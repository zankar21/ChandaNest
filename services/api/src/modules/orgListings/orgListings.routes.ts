import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  createOrgListingHandler,
  getOrgListingHandler,
  listOrgListingsHandler,
  transitionOrgListingHandler,
  updateOrgListingHandler
} from "./orgListings.controller";

export const orgListingsRouter = Router({ mergeParams: true });

orgListingsRouter.post("/", authMiddleware, createOrgListingHandler);
orgListingsRouter.get("/", authMiddleware, listOrgListingsHandler);
orgListingsRouter.get("/:orgListingId", authMiddleware, getOrgListingHandler);
orgListingsRouter.patch("/:orgListingId", authMiddleware, updateOrgListingHandler);
orgListingsRouter.post("/:orgListingId/transition", authMiddleware, transitionOrgListingHandler);
