import { Router } from "express";
import { publicNearbyHandler } from "./publicNearby.controller";

export const publicNearbyRouter = Router();

publicNearbyRouter.get("/properties/:propertyId/nearby", publicNearbyHandler);
