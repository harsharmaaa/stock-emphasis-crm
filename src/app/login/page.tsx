import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import {
  Boxes,
  ShieldCheck,
  PackageSearch,
  Activity,
  Warehouse,
} from "lucide-react";


export const instant = false;

export const metadata = {
  title: "Sign In | Stock Emphasis CRM",
  description: "Secure enterprise login portal for Stock Emphasis CRM stock and inventory management system.",
};

export default async function LoginPage() {
  const session = await auth();

  // If user is already authenticated, redirect to their role-specific dashboard
  if (session?.user) {
    const role = session.user.role;
    if (role === "ADMIN") {
      redirect("/admin");
    } else if (role === "MANAGER") {
      redirect("/manager");
    } else {
      redirect("/employee");
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Column: Focused Login Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-16 xl:p-24 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-850">
        {/* Top bar with quick brand mark on mobile */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 text-white">
              <Boxes className="size-4.5" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
              Stock Emphasis
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CRM v1.0
          </span>
        </div>

        {/* Center: The interactive Login Form */}
        <div className="my-auto py-6">
          <LoginForm />
        </div>

        {/* Bottom footer note */}
        <div className="pt-8 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-900">
          <p>© {new Date().getFullYear()} Stock Emphasis CRM. All rights reserved.</p>
          <p className="font-mono text-[11px]">System: Operational</p>
        </div>
      </div>

      {/* Right Column: Platform Capabilities Showcase (Visible on Large Screens) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 size-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          <Warehouse className="size-4" />
          <span>Warehouse & Inventory Intelligence</span>
        </div>

        {/* Center Showcase Content */}
        <div className="relative z-10 max-w-lg my-auto py-12 space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Operational Precision for Modern Inventory & Stock Control.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              Stock Emphasis empowers your logistics teams with real-time stock levels, purchase reconciliations, and role-governed workflows.
            </p>
          </div>

          {/* Core Feature Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <PackageSearch className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Real-Time Stock Auditing
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Continuous multi-location stock tracking, low-inventory alerts, and instantaneous variance detection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs">
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Role-Governed Privilege Isolation
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Dedicated workspaces tailored to Admin controllers, Operations Managers, and Warehouse Employees.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Activity className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Traceable Operations & Audit Trails
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Comprehensive history of stock transfers, receiving dispatches, and warehouse inventory changes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Platform Stat & Pill */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span>NextAuth v5 Beta • Secure JWT Session</span>
          </div>
          <span className="font-mono text-slate-500">PostgreSQL + Prisma</span>
        </div>
      </div>
    </div>
  );
}
