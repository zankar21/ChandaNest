"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
function unauthorized(res, message = "Unauthorized", code = "UNAUTHORIZED") {
    return res.status(401).json({ ok: false, error: { message, code } });
}
function forbidden(res, message = "Forbidden", code = "FORBIDDEN") {
    return res.status(403).json({ ok: false, error: { message, code } });
}
async function fetchTenantFromUserDoc(uid) {
    const docRef = firebase_1.firestore.collection("users").doc(uid);
    try {
        const snap = await docRef.get();
        const data = snap.data();
        return {
            tenantId: data?.tenantId,
            role: data?.role ?? undefined
        };
    }
    catch (err) {
        const isPermissionDenied = err?.code === 7 ||
            err?.code === "PERMISSION_DENIED" ||
            err?.message?.includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
            logger_1.logger.error("Firestore PERMISSION_DENIED while reading auth user doc", {
                path: `users/${uid}`
            });
        }
        throw err;
    }
}
async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
        return unauthorized(res, "Missing bearer token");
    }
    const token = header.slice("bearer ".length).trim();
    if (!token) {
        return unauthorized(res, "Missing bearer token");
    }
    try {
        const decoded = await firebase_admin_1.default.auth().verifyIdToken(token);
        const tenantIdClaim = decoded.tenantId || decoded["https://example.com/tenantId"] || undefined;
        const roleClaim = decoded.role || decoded["https://example.com/role"] || undefined;
        const fromDoc = await fetchTenantFromUserDoc(decoded.uid);
        const resolvedTenantId = tenantIdClaim || fromDoc.tenantId || undefined;
        const allowPathTenant = req.path.includes("/owner/onboard") || req.path.endsWith("/me") ? req.params.tenantId : undefined;
        const finalTenantId = resolvedTenantId || allowPathTenant;
        if (!finalTenantId) {
            logger_1.logger.warn("Tenant ID missing for user", decoded.uid);
            return forbidden(res, "Tenant access not configured");
        }
        const resolvedRole = roleClaim || fromDoc.role || "user";
        const user = {
            uid: decoded.uid,
            email: decoded.email ?? "",
            tenantId: finalTenantId,
            role: resolvedRole,
            phoneNumber: decoded.phone_number ?? undefined
        };
        req.user = user;
        next();
    }
    catch (err) {
        logger_1.logger.error("Auth verification failed", err);
        return unauthorized(res, "Invalid or expired token");
    }
}
