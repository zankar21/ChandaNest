"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicInvitesRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const publicInvites_controller_1 = require("./publicInvites.controller");
exports.publicInvitesRouter = (0, express_1.Router)();
exports.publicInvitesRouter.post("/accept", auth_middleware_1.authMiddleware, publicInvites_controller_1.acceptInviteHandler);
