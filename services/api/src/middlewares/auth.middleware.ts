import admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import { firestore } from "../config/firebase";
import { logger } from "../utils/logger";
import { AuthUser } from "../types";

function unauthorized(res: Response, message = "Unauthorized", code = "UNAUTHORIZED") {
  return res.status(401).json({ ok: false, error: { message, code } });
}

function forbidden(res: Response, message = "Forbidden", code = "FORBIDDEN") {
  return res.status(403).json({ ok: false, error: { message, code } });
}

async function fetchTenantFromUserDoc(
  uid: string
): Promise<{ tenantId?: string; role?: string }> {
  const docRef = firestore.collection("users").doc(uid);
  try {
    const snap = await docRef.get();
    const data = snap.data();
    return {
      tenantId: data?.tenantId as string | undefined,
      role: (data?.role as string | undefined) ?? undefined
    };
  } catch (err) {
    const isPermissionDenied =
      (err as { code?: number | string; message?: string })?.code === 7 ||
      (err as { code?: number | string; message?: string })?.code === "PERMISSION_DENIED" ||
      (err as { code?: number | string; message?: string })?.message?.includes("PERMISSION_DENIED");
    if (isPermissionDenied) {
      logger.error("Firestore PERMISSION_DENIED while reading auth user doc", {
        path: `users/${uid}`
      });
    }
    throw err;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return unauthorized(res, "Missing bearer token");
  }

  const token = header.slice("bearer ".length).trim();
  if (!token) {
    return unauthorized(res, "Missing bearer token");
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const tenantIdClaim =
      (decoded as any).tenantId || (decoded as any)["https://example.com/tenantId"] || undefined;
    const roleClaim =
      (decoded as any).role || (decoded as any)["https://example.com/role"] || undefined;

    const fromDoc = await fetchTenantFromUserDoc(decoded.uid);

    const resolvedTenantId = tenantIdClaim || fromDoc.tenantId || undefined;
    const allowPathTenant =
      req.path.includes("/owner/onboard") || req.path.endsWith("/me") ? req.params.tenantId : undefined;
    const finalTenantId = resolvedTenantId || allowPathTenant;
    if (!finalTenantId) {
      logger.warn("Tenant ID missing for user", decoded.uid);
      return forbidden(res, "Tenant access not configured");
    }
    const resolvedRole = roleClaim || fromDoc.role || "user";

    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      tenantId: finalTenantId,
      role: resolvedRole,
      phoneNumber: (decoded as any).phone_number ?? undefined
    };

    req.user = user;
    next();
  } catch (err) {
    logger.error("Auth verification failed", err);
    return unauthorized(res, "Invalid or expired token");
  }
}
