"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearbyRouter = void 0;
const express_1 = require("express");
const nearby_controller_1 = require("./nearby.controller");
exports.nearbyRouter = (0, express_1.Router)();
exports.nearbyRouter.post("/nearby/distance-matrix", nearby_controller_1.distanceMatrixHandler);
