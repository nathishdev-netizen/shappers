export interface TenantTheme {
  tenantId: string;
  appName: string;
  logoUrl: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

export const defaultTheme: TenantTheme = {
  tenantId: "default",
  appName: "Shappers Gym",
  logoUrl: "/assets/default-logo.png",
  colors: {
    primary: "#111827",
    secondary: "#f97316",
    background: "#ffffff",
    text: "#111827",
  },
};

export function resolveTenantTheme(theme: Partial<TenantTheme> | null | undefined): TenantTheme {
  if (!theme) return defaultTheme;
  return {
    ...defaultTheme,
    ...theme,
    colors: { ...defaultTheme.colors, ...(theme.colors ?? {}) },
  };
}
