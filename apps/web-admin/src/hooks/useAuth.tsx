import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { setAuthToken } from "../services/apiClient";

interface AuthContextValue {
  loading: boolean;
  user: User | null;
  idToken: string | null;
  tenantId: string | null;
  role: string | null;
  refreshToken: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setLoading(true);
      setUser(u);
      if (!u) {
        setIdToken(null);
        setAuthToken(null);
        setTenantId(null);
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const tokenResult = await u.getIdTokenResult();
        console.log("claims", tokenResult.claims);
        const token = tokenResult.token;
        const claims = tokenResult.claims as Record<string, any>;
        setIdToken(token);
        setAuthToken(token);
        setTenantId((claims["tenantId"] as string) || (claims["https://example.com/tenantId"] as string) || null);
        setRole((claims["role"] as string) || (claims["https://example.com/role"] as string) || null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const refreshToken = async () => {
    if (!user) return;
    const tokenResult = await user.getIdTokenResult(true);
    console.log("claims", tokenResult.claims);
    const token = tokenResult.token;
    const claims = tokenResult.claims as Record<string, any>;
    setIdToken(token);
    setAuthToken(token);
    setTenantId((claims["tenantId"] as string) || (claims["https://example.com/tenantId"] as string) || null);
    setRole((claims["role"] as string) || (claims["https://example.com/role"] as string) || null);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
    setAuthToken(null);
  };

  const value = useMemo(
    () => ({ loading, user, idToken, tenantId, role, refreshToken, logout }),
    [loading, user, idToken, tenantId, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type AuthTenantContext = ReturnType<typeof useAuth>;


