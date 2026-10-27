import { requireAdminSession } from "@/src/lib/auth-guard";
import { getLeadAllotmentUsersAction } from "@/src/features/leads/actions";
import { AddLeadForm } from "@/src/features/leads/add-lead-form";

export const instant = false;

export const metadata = {
  title: "Add Lead | Stock Emphasis CRM",
  description: "Register prospective clients, KYC details, and allocate to operations personnel.",
};

export default async function AdminAddLeadPage() {
  await requireAdminSession();

  const usersRes = await getLeadAllotmentUsersAction();
  const allotmentUsers = usersRes.success && usersRes.users ? usersRes.users : [];

  return <AddLeadForm allotmentUsers={allotmentUsers} />;
}
