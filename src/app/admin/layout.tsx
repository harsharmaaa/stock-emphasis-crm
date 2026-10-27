import { requireAdminSession } from "@/src/lib/auth-guard";
import { AdminShell } from "@/src/components/layout/admin-shell";

export const instant = false;

export const metadata = {
  title: "Admin Portal | Stock Emphasis CRM",
  description: "Enterprise administration portal for Stock Emphasis CRM.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminSession();

  return (
    <AdminShell
      adminName={admin.name}
      adminEmail={admin.email}
      adminRole={admin.role}
    >
      {children}
    </AdminShell>
  );
}
