import { Router } from "express";
import { publicCreateBusinessRequestHandler } from "./publicBusinessRequests.controller";

export const publicBusinessRequestsRouter = Router();

publicBusinessRequestsRouter.post("/", publicCreateBusinessRequestHandler);
