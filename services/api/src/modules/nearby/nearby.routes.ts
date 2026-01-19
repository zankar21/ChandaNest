import { Router } from "express";
import { distanceMatrixHandler } from "./nearby.controller";

export const nearbyRouter = Router();

nearbyRouter.post("/nearby/distance-matrix", distanceMatrixHandler);
