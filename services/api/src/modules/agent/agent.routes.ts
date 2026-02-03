import { Router, Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { AuthUser } from "../../types";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  completeAgentOnboardingHandler,
  getAgentMeHandler,
  listAgentListingsHandler,
  startAgentSubscriptionHandler,
  submitAgentOnboardingHandler,
  verifyAgentSubscriptionHandler
} from "./agent.controller";

export const agentRouter = Router();

async function softAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ ok: false, error: { message: "Missing bearer token", code: "UNAUTHORIZED" } });
  }
  const token = header.slice("bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ ok: false, error: { message: "Missing bearer token", code: "UNAUTHORIZED" } });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const tenantIdClaim =
      (decoded as any).tenantId || (decoded as any)["https://example.com/tenantId"] || undefined;
    const roleClaim =
      (decoded as any).role || (decoded as any)["https://example.com/role"] || undefined;
    const headerTenantId =
      typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"] : undefined;
    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      tenantId: tenantIdClaim || headerTenantId || "",
      role: roleClaim || "user",
      phoneNumber: (decoded as any).phone_number ?? undefined
    };
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: { message: "Invalid or expired token", code: "UNAUTHORIZED" } });
  }
}

agentRouter.get("/me", softAuthMiddleware, getAgentMeHandler);
agentRouter.get("/listings", authMiddleware, listAgentListingsHandler);
agentRouter.post("/agent/onboarding/complete", authMiddleware, completeAgentOnboardingHandler);
agentRouter.post("/onboarding/submit", authMiddleware, submitAgentOnboardingHandler);
agentRouter.post("/subscription/start", authMiddleware, startAgentSubscriptionHandler);
agentRouter.post("/subscription/verify", authMiddleware, verifyAgentSubscriptionHandler);
