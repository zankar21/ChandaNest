"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicNearbyRouter = void 0;
const express_1 = require("express");
const publicNearby_controller_1 = require("./publicNearby.controller");
exports.publicNearbyRouter = (0, express_1.Router)();
exports.publicNearbyRouter.get("/properties/:propertyId/nearby", publicNearby_controller_1.publicNearbyHandler);
