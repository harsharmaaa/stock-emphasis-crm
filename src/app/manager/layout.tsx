import { requireManagerSession } from "@/src/lib/auth-guard";
import { ManagerShell } from "@/src/components/layout/manager-shell";

export const instant = false;

export const metadata = {
  title: "Manager Portal | Stock Emphasis CRM",
  description: "Operations supervision, team monitoring, and subordinate employee management.",
};

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const manager = await requireManagerSession();

  return (
    <ManagerShell managerName={manager.name} managerEmail={manager.email}>
      {children}
    </ManagerShell>
  );
}
