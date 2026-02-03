import { Request, Response, NextFunction } from "express";

function resolveTenantId(req: Request): string | undefined {
  const headerTenantId = req.header("x-tenant-id");
  if (headerTenantId) return headerTenantId;
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== "production") {
    const host = typeof req.headers.host === "string" ? req.headers.host : "";
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const isLocalhost =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1");
    if (isLocalhost) {
      return process.env.DEFAULT_TENANT_ID || "powerpulsetech";
    }
  }
  return undefined;
}

export function tenantResolver(req: Request, res: Response, next: NextFunction) {
  const requestPath = req.originalUrl || req.baseUrl || req.path || "";
  if (requestPath.startsWith("/v1/webhooks/razorpay") || requestPath.startsWith("/v1/billing/razorpay/webhook")) {
    return next();
  }
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return res.status(403).json({
      ok: false,
      error: { message: "Tenant access not configured", code: "FORBIDDEN" }
    });
  }
  (req as Request & { tenantId?: string }).tenantId = tenantId;
  res.locals.tenantId = tenantId;
  next();
}
