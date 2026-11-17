import { requireManagerSession } from "@/src/lib/auth-guard";
import {
  getManagerLeadAllotmentUsersAction,
  createManagerLeadAction,
  checkManagerPhoneDuplicateAction,
} from "@/src/features/manager/lead-actions";
import { getActiveLeadSourceNames } from "@/src/lib/lead-sources-helper";
import { getActiveLeadResponseNames } from "@/src/lib/lead-responses-helper";
import { AddLeadForm } from "@/src/features/leads/add-lead-form";

export const instant = false;

export const metadata = {
  title: "Add Team Lead | Manager Portal",
  description: "Register prospective clients, financial profiles, and allocate to team personnel.",
};

export default async function ManagerAddLeadPage() {
  await requireManagerSession();

  const [usersRes, activeSources, activeResponses] = await Promise.all([
    getManagerLeadAllotmentUsersAction(),
    getActiveLeadSourceNames(),
    getActiveLeadResponseNames(),
  ]);

  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];

  return (
    <AddLeadForm
      portal="manager"
      allotmentUsers={allotmentUsers}
      leadSources={activeSources}
      leadResponses={activeResponses}
      customCreateAction={createManagerLeadAction}
      customCheckPhoneAction={checkManagerPhoneDuplicateAction}
    />
  );
}
