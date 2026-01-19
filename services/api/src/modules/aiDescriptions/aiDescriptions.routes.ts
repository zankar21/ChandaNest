import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { generateAiDescriptionHandler } from "./aiDescriptions.controller";

const aiDescriptionsRouter = Router();

aiDescriptionsRouter.post("/listings/:listingId/ai-description/generate", authMiddleware, generateAiDescriptionHandler);

export default aiDescriptionsRouter;
