import { requireAdminSession } from "@/src/lib/auth-guard";
import {
  getEmployeeFormDataAction,
  getUserByIdAction,
} from "@/src/features/users/actions";
import { EmployeeForm } from "@/src/features/users/employee-form";
import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Edit Employee | Stock Emphasis CRM",
  description: "Update employee working profile, credentials, and lead fetch permissions.",
};

interface EditEmployeePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditEmployeePage({ params }: EditEmployeePageProps) {
  await requireAdminSession();
  const { id } = await params;

  const [formDataRes, userRes] = await Promise.all([
    getEmployeeFormDataAction(),
    getUserByIdAction(id),
  ]);

  const formData = formDataRes.success && formDataRes.data
    ? formDataRes.data
    : { departments: [], profiles: [], managers: [], leadSources: [] };

  if (!userRes.success || !userRes.user) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
          <AlertCircle className="size-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Employee Not Found
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested employee record does not exist or may have been deleted.
        </p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back to Employee Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <EmployeeForm
        mode="edit"
        initialUser={userRes.user}
        departments={formData.departments}
        profiles={formData.profiles}
        managers={formData.managers}
        leadSources={formData.leadSources}
      />
    </div>
  );
}

