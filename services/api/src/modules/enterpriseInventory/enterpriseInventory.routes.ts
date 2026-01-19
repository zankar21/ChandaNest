import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  requireOrgMembership,
  requirePermission
} from "../memberships/membership.middleware";
import {
  createInventoryItemHandler,
  getInventoryItemHandler,
  listInventoryItemsHandler,
  updateInventoryItemHandler,
  updateInventoryStatusHandler
} from "./enterpriseInventory.controller";

export const enterpriseInventoryRouter = Router({ mergeParams: true });

enterpriseInventoryRouter.post(
  "/",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.inventory.manage"),
  createInventoryItemHandler
);
enterpriseInventoryRouter.get(
  "/",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.inventory.read"),
  listInventoryItemsHandler
);
enterpriseInventoryRouter.get(
  "/:itemId",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.inventory.read"),
  getInventoryItemHandler
);
enterpriseInventoryRouter.patch(
  "/:itemId",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.inventory.manage"),
  updateInventoryItemHandler
);
enterpriseInventoryRouter.patch(
  "/:itemId/status",
  authMiddleware,
  requireOrgMembership("enterprise", "enterpriseId"),
  requirePermission("enterprise.inventory.manage"),
  updateInventoryStatusHandler
);
