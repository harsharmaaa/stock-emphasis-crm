import { getEmployeeStocksAction } from "@/src/features/employee/actions";
import { EmployeeStocksClient } from "@/src/features/employee/employee-stocks-client";
import { AlertCircle } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Assigned Stocks & Leads | Stock Emphasis CRM",
  description: "View department inventory allocations, warehouse batches, and client fulfillment leads.",
};

export default async function EmployeeStocksPage() {
  const result = await getEmployeeStocksAction();

  if (!result.success || !result.stocks) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load assigned stocks and leads</h3>
        <p className="text-xs text-rose-400 mt-1">
          {result.error || "Unable to retrieve inventory data."}
        </p>
      </div>
    );
  }

  return (
    <EmployeeStocksClient
      initialStocks={result.stocks}
      teamName={result.teamName || "General Warehouse Unit"}
    />
  );
}
