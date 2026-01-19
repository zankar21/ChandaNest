"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAppCheckForWrites = requireAppCheckForWrites;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const APP_CHECK_HEADERS = ["x-firebase-appcheck", "x-firebase-app-check"];
function unauthorized(res, message, code = "APPCHECK_REQUIRED") {
    return res.status(401).json({ ok: false, error: { message, code } });
}
async function requireAppCheckForWrites(req, res, next) {
    const role = req.user?.role;
    if (role === "owner") {
        return next();
    }
    if (req.path.includes("/owner/onboard")) {
        return next();
    }
    const tokenHeader = req.header(APP_CHECK_HEADERS[0]) || req.header(APP_CHECK_HEADERS[1]) || undefined;
    const shouldEnforce = env_1.env.nodeEnv === "production" && env_1.env.appCheckStrict;
    const allowOptional = env_1.env.allowAppCheckOptional;
    if (!tokenHeader) {
        if (shouldEnforce) {
            return unauthorized(res, "App Check token required");
        }
        if (!allowOptional) {
            return unauthorized(res, "App Check token required");
        }
        logger_1.logger.warn("App Check token missing (optional allowed)");
        return next();
    }
    try {
        await firebase_admin_1.default.appCheck().verifyToken(tokenHeader);
        return next();
    }
    catch (err) {
        if (shouldEnforce) {
            logger_1.logger.error("App Check verification failed", err);
            return unauthorized(res, "Invalid App Check token");
        }
        if (!allowOptional) {
            return unauthorized(res, "Invalid App Check token");
        }
        logger_1.logger.warn("App Check verification failed (optional allowed)", err);
        return next();
    }
}
