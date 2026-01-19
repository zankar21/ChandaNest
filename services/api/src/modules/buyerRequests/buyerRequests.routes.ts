import { Router } from "express";
import {
  getBuyerRequestHandler,
  listBuyerRequestsHandler,
  publicCreateBuyerRequestHandler,
  updateBuyerRequestHandler
} from "./buyerRequests.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

export const buyerRequestsRouter = Router();

// Public creation
buyerRequestsRouter.post("/public/buyer-requests", publicCreateBuyerRequestHandler);

// Tenant-scoped admin routes
buyerRequestsRouter.get(
  "/tenants/:tenantId/buyer-requests",
  authMiddleware,
  listBuyerRequestsHandler
);
buyerRequestsRouter.get(
  "/tenants/:tenantId/buyer-requests/:requestId",
  authMiddleware,
  getBuyerRequestHandler
);
buyerRequestsRouter.patch(
  "/tenants/:tenantId/buyer-requests/:requestId",
  authMiddleware,
  updateBuyerRequestHandler
);
