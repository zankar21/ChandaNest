import { Router } from "express";
import { expireTrialsHandler } from "./cron.controller";

export const cronRouter = Router();

cronRouter.post("/cron/expire-trials", expireTrialsHandler);
