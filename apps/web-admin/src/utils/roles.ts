import { User } from "firebase/auth";

function extractRole(user: User | null) {
  if (!user) return null;
  const anyUser = user as any;
  return (
    anyUser?.role ||
    anyUser?.claims?.role ||
    anyUser?.customClaims?.role ||
    anyUser?.stsTokenManager?.claims?.role ||
    anyUser?.stsTokenManager?.claims?.roles?.[0] ||
    null
  );
}

export function isClientAdmin(user: User | null) {
  const role = extractRole(user);
  if (Array.isArray(role)) {
    return role.includes("client_admin");
  }
  return role === "client_admin";
}

export function isTenantAdminRole(role?: string | null) {
  return role === "tenant_admin";
}

export function isPlatformAdminRole(role?: string | null) {
  return role === "platform_admin";
}
