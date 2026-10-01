import { TenantProvider } from "@/lib/tenant-context";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <TenantProvider>
      <div className="ambient" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="relative z-[1] min-h-screen">
        <Sidebar />
        {/* Below lg the sidebar is hidden, so the tail clears the floating tab bar. */}
        <div className="pb-28 lg:pb-0 lg:pl-[248px]">{children}</div>
        <MobileNav />
      </div>
    </TenantProvider>
  );
}
