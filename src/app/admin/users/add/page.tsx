import { requireAdminSession } from "@/src/lib/auth-guard";
import { getEmployeeFormDataAction } from "@/src/features/users/actions";
import { EmployeeForm } from "@/src/features/users/employee-form";

export const instant = false;

export const metadata = {
  title: "Add Employee | Stock Emphasis CRM",
  description: "Create a new CRM employee with profile designation and lead fetch permissions.",
};

export default async function AdminAddEmployeePage() {
  await requireAdminSession();

  const formDataRes = await getEmployeeFormDataAction();
  const formData = formDataRes.success && formDataRes.data
    ? formDataRes.data
    : { departments: [], profiles: [], managers: [], leadSources: [] };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <EmployeeForm
        mode="create"
        departments={formData.departments}
        profiles={formData.profiles}
        managers={formData.managers}
        leadSources={formData.leadSources}
      />
    </div>
  );
}

