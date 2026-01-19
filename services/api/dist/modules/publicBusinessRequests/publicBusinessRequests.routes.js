"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicBusinessRequestsRouter = void 0;
const express_1 = require("express");
const publicBusinessRequests_controller_1 = require("./publicBusinessRequests.controller");
exports.publicBusinessRequestsRouter = (0, express_1.Router)();
exports.publicBusinessRequestsRouter.post("/", publicBusinessRequests_controller_1.publicCreateBusinessRequestHandler);
