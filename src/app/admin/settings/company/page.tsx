import { requireAdminSession } from "@/src/lib/auth-guard";
import { getCompanyDetailsAction } from "@/src/features/company/actions";
import { CompanyClient } from "@/src/features/company/company-client";

export const instant = false;

export const metadata = {
  title: "Company Details | Stock Emphasis CRM",
  description: "Configure company details, business month cycle, and organizational policies.",
};

export default async function CompanyDetailsPage() {
  await requireAdminSession();

  const res = await getCompanyDetailsAction();

  const initialData = res.company ?? {
    name: "",
    website: "",
    state: "",
    city: "",
    address: "",
    monthStartDay: "01",
    monthEndDay: "Last Day Of Month",
    policy: "",
  };

  return <CompanyClient initialData={initialData} />;
}

