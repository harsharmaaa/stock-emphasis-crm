import { requireAdminSession } from "@/src/lib/auth-guard";
import { getEmployeeProfilesAction } from "@/src/features/profiles/actions";
import { EmployeeProfilesClient } from "@/src/features/profiles/employee-profiles-client";

export const instant = false;

export const metadata = {
  title: "Employee Profiles | Stock Emphasis CRM",
  description: "Configure and manage employee working profiles, department assignments, and operational limits.",
};

export default async function AdminEmployeeProfilesPage() {
  await requireAdminSession();

  const data = await getEmployeeProfilesAction();

  return (
    <EmployeeProfilesClient
      initialProfiles={data.profiles ?? []}
      initialDepartments={data.departments ?? []}
    />
  );
}
