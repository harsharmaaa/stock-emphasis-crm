import { requireEmployeeSession } from "@/src/lib/auth-guard";
import { EmployeeShell } from "@/src/components/layout/employee-shell";

export const instant = false;

export const metadata = {
  title: "Employee Portal | Stock Emphasis CRM",
  description: "Warehouse inventory staff workspace, team assignment, and task management.",
};

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await requireEmployeeSession();

  return (
    <EmployeeShell employeeName={employee.name} employeeEmail={employee.email}>
      {children}
    </EmployeeShell>
  );
}
