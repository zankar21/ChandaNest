import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User, onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { getTenantMe, setAuthToken } from "../services/apiClient";
import { OWNER_TENANT_ID } from "../constants/marketplace";

type OwnerAuthContextValue = {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  idToken: string | null;
  me: OwnerMe | null;
  ownerReady: boolean;
  refreshProfile: (overrideUser?: User | null) => Promise<OwnerMe | null>;
  logout: () => Promise<void>;
};

const OwnerAuthContext = createContext<OwnerAuthContextValue | undefined>(undefined);

type OwnerMe = {
  role?: string | null;
  tenantId?: string | null;
  kycStatus?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  fullName?: string | null;
  ownerType?: string | null;
  city?: string | null;
  contactPreference?: string | null;
  bestTimeToContact?: string | null;
  alternatePhone?: string | null;
  onboardedAt?: string | null;
};

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [me, setMe] = useState<OwnerMe | null>(null);
  const [ownerReady, setOwnerReady] = useState(false);

  const refreshProfile = async (overrideUser?: User | null) => {
    const activeUser = overrideUser ?? user;
    if (!activeUser) {
      setMe(null);
      setOwnerReady(false);
      setProfileLoading(false);
      return null;
    }
    try {
      setProfileLoading(true);
      const data = await getTenantMe(OWNER_TENANT_ID);
      const next: OwnerMe = {
        role: (data.role as string) || null,
        tenantId: (data.tenantId as string) || null,
        kycStatus: (data.kycStatus as string) || null,
        email: (data.email as string) || null,
        phoneNumber: (data.phoneNumber as string) || null,
        fullName: (data.fullName as string) || null,
        ownerType: (data.ownerType as string) || null,
        city: (data.city as string) || null,
        contactPreference: (data.contactPreference as string) || null,
        bestTimeToContact: (data.bestTimeToContact as string) || null,
        alternatePhone: (data.alternatePhone as string) || null,
        onboardedAt: (data.onboardedAt as string) || null
      };
      setMe(next);
      const ready =
        next.role === "owner" &&
        next.tenantId === OWNER_TENANT_ID &&
        next.kycStatus === "verified" &&
        Boolean(next.onboardedAt);
      setOwnerReady(ready);
      return next;
    } catch {
      setMe(null);
      setOwnerReady(false);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (!currentUser) {
        setIdToken(null);
        setAuthToken(null);
        setMe(null);
        setOwnerReady(false);
        setProfileLoading(false);
        setLoading(false);
        return;
      }
      try {
        const tokenResult = await currentUser.getIdTokenResult();
        setIdToken(tokenResult.token);
        setAuthToken(tokenResult.token);
        await refreshProfile(currentUser);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
    setAuthToken(null);
    setMe(null);
    setOwnerReady(false);
  };

  const value = useMemo(
    () => ({ user, loading, profileLoading, idToken, me, ownerReady, refreshProfile, logout }),
    [user, loading, profileLoading, idToken, me, ownerReady]
  );

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used within OwnerAuthProvider");
  return ctx;
}



