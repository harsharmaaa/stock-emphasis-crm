import { requireEmployeeSession } from "@/src/lib/auth-guard";
import {
  createEmployeeLeadAction,
  checkEmployeePhoneDuplicateAction,
} from "@/src/features/employee/lead-actions";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { getActiveLeadResponseNames } from "@/src/lib/lead-responses-helper";
import { AddLeadForm } from "@/src/features/leads/add-lead-form";

export const instant = false;

export const metadata = {
  title: "Add Lead | Employee Portal",
  description: "Register a new prospective client, contact information, and investment preferences.",
};

export default async function EmployeeAddLeadPage() {
  const employee = await requireEmployeeSession();

  const [activeSources, activeResponses] = await Promise.all([
    getActiveLeadSourceNames(),
    getActiveLeadResponseNames(),
  ]);

  const allotmentUsers = [
    {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      teamName: null,
    },
  ];

  return (
    <AddLeadForm
      portal="employee"
      allotmentUsers={allotmentUsers}
      leadSources={activeSources}
      leadResponses={activeResponses}
      customCreateAction={createEmployeeLeadAction}
      customCheckPhoneAction={checkEmployeePhoneDuplicateAction}
    />
  );
}
