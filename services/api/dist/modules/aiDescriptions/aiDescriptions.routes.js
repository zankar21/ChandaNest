"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const aiDescriptions_controller_1 = require("./aiDescriptions.controller");
const aiDescriptionsRouter = (0, express_1.Router)();
aiDescriptionsRouter.post("/listings/:listingId/ai-description/generate", auth_middleware_1.authMiddleware, aiDescriptions_controller_1.generateAiDescriptionHandler);
exports.default = aiDescriptionsRouter;
