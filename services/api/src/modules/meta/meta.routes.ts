import { Router } from "express";
import { enumsHandler, listingConfigHandler } from "./meta.controller";

export const metaRouter = Router();

metaRouter.get("/meta/enums", enumsHandler);
metaRouter.get("/meta/listing-config", listingConfigHandler);
