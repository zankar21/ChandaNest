import { Router } from "express";
import { citySeoHandler, robotsHandler, sitemapHandler } from "./publicSeo.controller";

export const publicSeoRouter = Router();

publicSeoRouter.get("/public/seo/cities/:citySlug", citySeoHandler);
publicSeoRouter.get("/public/sitemap.xml", sitemapHandler);
publicSeoRouter.get("/robots.txt", robotsHandler);
