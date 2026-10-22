import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/src/components/shared/sign-out-button";
import { Briefcase, PackageCheck } from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Manager Portal | Stock Emphasis CRM",
  description: "Manager portal placeholder for Stock Emphasis CRM.",
};

export default async function ManagerPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  // Enforce role — redirect wrong roles to their own dashboard
  if (user.role !== "MANAGER") {
    redirect(user.role === "ADMIN" ? "/admin" : "/employee");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg border border-slate-800 rounded-2xl p-8 shadow-2xl bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Briefcase className="size-5" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                Stock Emphasis CRM
              </span>
              <h1 className="text-xl font-bold text-white">Manager Workspace</h1>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            MANAGER
          </span>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-slate-400 leading-relaxed">
            Welcome to the Operations Manager portal. This is a placeholder confirming
            successful role-based authentication.
          </p>

          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">User ID:</span>
              <span className="font-mono text-xs text-slate-300">{user.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Name:</span>
              <span className="font-medium text-slate-200">{user.name ?? "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Email:</span>
              <span className="font-mono text-xs text-slate-200">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Role:</span>
              <span className="font-bold text-blue-400">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <PackageCheck className="size-3.5 text-emerald-400" />
            Full Manager dashboard coming soon
          </span>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
