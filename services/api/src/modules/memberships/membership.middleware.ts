import { NextFunction, Request, Response } from "express";
import { firestore } from "../../config/firebase";
import { hasPermission, type Permission } from "./permissions";

type MembershipDoc = {
  id?: string;
  tenantId?: string;
  orgType?: "agency" | "enterprise";
  orgId?: string;
  userId?: string;
  role?: string;
  status?: "active" | "suspended";
};

function forbidden(res: Response, message = "Forbidden") {
  return res.status(403).json({ ok: false, error: { message, code: "FORBIDDEN" } });
}

export function isActiveMembership(member?: MembershipDoc | null) {
  return member?.status === "active";
}

export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
  if (user.role !== "tenant_admin" && user.role !== "platform_admin") {
    return forbidden(res);
  }
  next();
}

export function requireOrgMembership(orgType: "agency" | "enterprise", orgIdParam: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    const tenantId = req.params.tenantId;
    const orgId = req.params[orgIdParam];
    const snap = await firestore
      .collection("tenants")
      .doc(tenantId)
      .collection("memberships")
      .where("orgType", "==", orgType)
      .where("orgId", "==", orgId)
      .where("userId", "==", user.uid)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (snap.empty) {
      return forbidden(res);
    }
    const member = snap.docs[0].data() as MembershipDoc;
    if (!isActiveMembership(member)) {
      return forbidden(res);
    }
    req.orgMembership = { id: snap.docs[0].id, ...member };
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const membership = req.orgMembership;
    if (!membership || !hasPermission(membership.role, permission)) {
      return forbidden(res);
    }
    next();
  };
}
