"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, type TenantDto } from "./api";

export interface SessionUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  role: string;
  email: string;
}

interface TenantContextValue {
  tenant: TenantDto | null;
  user: SessionUser | null;
  setTenant: (tenant: TenantDto) => void;
  logout: () => void;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  user: null,
  setTenant: () => {},
  logout: () => {},
});

export const useTenant = () => useContext(TenantContext);

export function readSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem("shappers_user");
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

/** Relative luminance decides whether brand-colored surfaces take white or ink text. */
function readableInk(hex: string): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.55 ? "#0b0b0b" : "#ffffff";
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(readSessionUser());
    api
      .getMyTenant()
      .then(setTenant)
      .catch(() => {
        clearToken();
        router.replace("/login");
      })
      .finally(() => setChecked(true));
  }, [router]);

  useEffect(() => {
    const primary = tenant?.colors?.primary;
    if (!primary) return;
    document.documentElement.style.setProperty("--brand", primary);
    document.documentElement.style.setProperty("--brand-ink", readableInk(primary));
  }, [tenant]);

  function logout() {
    clearToken();
    localStorage.removeItem("shappers_user");
    router.replace("/login");
  }

  if (!checked || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--page)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, user, setTenant, logout }}>{children}</TenantContext.Provider>
  );
}
