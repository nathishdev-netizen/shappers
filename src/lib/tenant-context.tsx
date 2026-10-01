"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface SessionUser {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  colors: { primary?: string; secondary?: string } | null;
}

interface TenantContextValue {
  tenant: TenantInfo | null;
  user: SessionUser | null;
  logout: () => void;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  user: null,
  logout: () => {},
});

export const useTenant = () => useContext(TenantContext);

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
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, email, tenant_id, tenants(id, name, subdomain, logo_url, colors)")
        .eq("id", authUser.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setUser({
        userId: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        email: profile.email,
      });

      const t = profile.tenants;
      if (t) {
        setTenant({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          logoUrl: t.logo_url,
          colors: t.colors as TenantInfo["colors"],
        });
      }
      setChecked(true);
    }

    load();
  }, [router]);

  useEffect(() => {
    const primary = tenant?.colors?.primary;
    if (!primary) return;
    document.documentElement.style.setProperty("--brand", primary);
    document.documentElement.style.setProperty("--brand-ink", readableInk(primary));
  }, [tenant]);

  function logout() {
    const supabase = createClient();
    supabase.auth.signOut().then(() => router.replace("/login"));
  }

  if (!checked || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--page)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return <TenantContext.Provider value={{ tenant, user, logout }}>{children}</TenantContext.Provider>;
}
