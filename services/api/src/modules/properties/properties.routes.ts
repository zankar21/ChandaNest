import { Router } from "express";
import { requireAppCheckForWrites } from "../../middlewares/appCheck.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  approveHandler,
  createHandler,
  featureHandler,
  getHandler,
  listHandler,
  rejectHandler,
  validateHandler,
  deleteHandler,
  publishHandler,
  setVisibilityHandler,
  submitHandler,
  unpublishHandler,
  updateHandler
} from "./properties.controller";

export const propertiesRouter = Router({ mergeParams: true });

propertiesRouter.post(
  "/tenants/:tenantId/listings",
  authMiddleware,
  requireAppCheckForWrites,
  createHandler
);
propertiesRouter.patch(
  "/tenants/:tenantId/listings/:propertyId",
  authMiddleware,
  requireAppCheckForWrites,
  updateHandler
);
propertiesRouter.get("/tenants/:tenantId/listings", authMiddleware, listHandler);
propertiesRouter.get("/tenants/:tenantId/listings/:propertyId", authMiddleware, getHandler);
propertiesRouter.get("/tenants/:tenantId/listings/:propertyId/validate", authMiddleware, validateHandler);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/submit",
  authMiddleware,
  requireAppCheckForWrites,
  submitHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/approve",
  authMiddleware,
  requireAppCheckForWrites,
  approveHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/unpublish",
  authMiddleware,
  requireAppCheckForWrites,
  unpublishHandler
);
propertiesRouter.delete(
  "/tenants/:tenantId/listings/:propertyId",
  authMiddleware,
  requireAppCheckForWrites,
  deleteHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/publish",
  authMiddleware,
  requireAppCheckForWrites,
  publishHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/feature",
  authMiddleware,
  requireAppCheckForWrites,
  featureHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/reject",
  authMiddleware,
  requireAppCheckForWrites,
  rejectHandler
);
propertiesRouter.post(
  "/tenants/:tenantId/listings/:propertyId/visibility",
  authMiddleware,
  requireAppCheckForWrites,
  setVisibilityHandler
);
