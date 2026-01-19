"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.principalsRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const principals_controller_1 = require("./principals.controller");
exports.principalsRouter = (0, express_1.Router)({ mergeParams: true });
exports.principalsRouter.get("/me", auth_middleware_1.authMiddleware, principals_controller_1.principalsMeHandler);
