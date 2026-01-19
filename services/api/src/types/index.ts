import type { Request } from "express";

export type AuthUser = {
  uid: string;
  email: string;
  tenantId: string;
  role: string;
  phoneNumber?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      orgMembership?: {
        id?: string;
        tenantId?: string;
        orgType?: "agency" | "enterprise";
        orgId?: string;
        userId?: string;
        role?: string;
        status?: "active" | "suspended";
      };
    }
  }
}

// This file ensures Request.user is available across handlers.
export type AugmentedRequest = Request & { user: AuthUser };
