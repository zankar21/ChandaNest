"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaRouter = void 0;
const express_1 = require("express");
const meta_controller_1 = require("./meta.controller");
exports.metaRouter = (0, express_1.Router)();
exports.metaRouter.get("/meta/enums", meta_controller_1.enumsHandler);
exports.metaRouter.get("/meta/listing-config", meta_controller_1.listingConfigHandler);
