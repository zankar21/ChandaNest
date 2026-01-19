import admin from "firebase-admin";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const APP_CHECK_HEADERS = ["x-firebase-appcheck", "x-firebase-app-check"];

function unauthorized(res: Response, message: string, code = "APPCHECK_REQUIRED") {
  return res.status(401).json({ ok: false, error: { message, code } });
}

export async function requireAppCheckForWrites(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).user?.role as string | undefined;
  if (role === "owner") {
    return next();
  }
  if (req.path.includes("/owner/onboard")) {
    return next();
  }
  const tokenHeader =
    req.header(APP_CHECK_HEADERS[0]) || req.header(APP_CHECK_HEADERS[1]) || undefined;
  const shouldEnforce = env.nodeEnv === "production" && env.appCheckStrict;
  const allowOptional = env.allowAppCheckOptional;

  if (!tokenHeader) {
    if (shouldEnforce) {
      return unauthorized(res, "App Check token required");
    }
    if (!allowOptional) {
      return unauthorized(res, "App Check token required");
    }
    logger.warn("App Check token missing (optional allowed)");
    return next();
  }

  try {
    await admin.appCheck().verifyToken(tokenHeader);
    return next();
  } catch (err) {
    if (shouldEnforce) {
      logger.error("App Check verification failed", err);
      return unauthorized(res, "Invalid App Check token");
    }
    if (!allowOptional) {
      return unauthorized(res, "Invalid App Check token");
    }
    logger.warn("App Check verification failed (optional allowed)", err);
    return next();
  }
}
