import { Router } from "express";
import { publicSignGet } from "./public.controller";
import { publicGetHandler, publicListHandler } from "../properties/properties.controller";
import { publicCreateLeadHandler } from "../leads/leads.controller";
import { publicBusinessRequestsRouter } from "../publicBusinessRequests";
import { publicInvitesRouter } from "../publicInvites";

export const publicRouter = Router();

publicRouter.get("/properties", publicListHandler);
publicRouter.get("/properties/:propertyId", publicGetHandler);
publicRouter.post("/media/sign-get", publicSignGet);
publicRouter.post("/leads", publicCreateLeadHandler);
publicRouter.use("/business-requests", publicBusinessRequestsRouter);
publicRouter.use("/invites", publicInvitesRouter);
