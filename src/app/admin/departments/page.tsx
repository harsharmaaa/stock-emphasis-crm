import { requireAdminSession } from "@/src/lib/auth-guard";
import { getDepartmentsAction } from "@/src/features/departments/actions";
import { DepartmentsClient } from "@/src/features/departments/departments-client";

export const instant = false;

export const metadata = {
  title: "Department Management | Stock Emphasis CRM",
  description: "Configure and manage company departments for employee profiles.",
};

export default async function AdminDepartmentsPage() {
  await requireAdminSession();

  const data = await getDepartmentsAction();

  return <DepartmentsClient initialDepartments={data.departments ?? []} />;
}
