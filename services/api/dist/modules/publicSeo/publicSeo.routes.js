"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSeoRouter = void 0;
const express_1 = require("express");
const publicSeo_controller_1 = require("./publicSeo.controller");
exports.publicSeoRouter = (0, express_1.Router)();
exports.publicSeoRouter.get("/public/seo/cities/:citySlug", publicSeo_controller_1.citySeoHandler);
exports.publicSeoRouter.get("/public/sitemap.xml", publicSeo_controller_1.sitemapHandler);
exports.publicSeoRouter.get("/robots.txt", publicSeo_controller_1.robotsHandler);
