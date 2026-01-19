"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buyerRequestsRouter = void 0;
const express_1 = require("express");
const buyerRequests_controller_1 = require("./buyerRequests.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
exports.buyerRequestsRouter = (0, express_1.Router)();
// Public creation
exports.buyerRequestsRouter.post("/public/buyer-requests", buyerRequests_controller_1.publicCreateBuyerRequestHandler);
// Tenant-scoped admin routes
exports.buyerRequestsRouter.get("/tenants/:tenantId/buyer-requests", auth_middleware_1.authMiddleware, buyerRequests_controller_1.listBuyerRequestsHandler);
exports.buyerRequestsRouter.get("/tenants/:tenantId/buyer-requests/:requestId", auth_middleware_1.authMiddleware, buyerRequests_controller_1.getBuyerRequestHandler);
exports.buyerRequestsRouter.patch("/tenants/:tenantId/buyer-requests/:requestId", auth_middleware_1.authMiddleware, buyerRequests_controller_1.updateBuyerRequestHandler);
