import { requireAdminSession } from "@/src/lib/auth-guard";
import { prisma } from "@/src/lib/prisma";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Boxes,
  ShieldCheck,
  ArrowRight,
  UserPlus,
  Layers,
  History,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Admin Overview | Stock Emphasis CRM",
  description: "Executive system metrics and real-time CRM administration.",
};

export default async function AdminOverviewPage() {
  const admin = await requireAdminSession();

  // Query real-time database metrics
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    activeManagers,
    activeEmployees,
    activeAdmins,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { role: "MANAGER", isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
  ]);

  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-violet-950/80 via-slate-900/80 to-indigo-950/80 dark:from-[#0c1224]/90 dark:via-[#14122e]/80 dark:to-[#09152a]/90 backdrop-blur-2xl border border-violet-500/25 shadow-2xl relative overflow-hidden text-white">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 size-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30 backdrop-blur-sm">
            <ShieldCheck className="size-3.5 text-violet-400" />
            <span>Administrator Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {admin.name}
          </h1>
          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Live database telemetry and governance controls for Stock Emphasis CRM.
            Review user distribution, provision operators, and monitor workspace integrity.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="size-4" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex flex-col justify-between hover:border-violet-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Accounts
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Users className="size-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{totalUsers}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{activeRate}%</span>
              <span>operational capacity</span>
            </div>
          </div>
        </div>

        {/* Active vs Inactive */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex flex-col justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Operators
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="size-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{activeUsers}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <UserX className="size-3 text-rose-500 dark:text-rose-400" />
                {inactiveUsers} deactivated
              </span>
            </div>
          </div>
        </div>

        {/* Active Managers */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex flex-col justify-between hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Managers
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Briefcase className="size-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{activeManagers}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Supervising inventory & logistics
            </div>
          </div>
        </div>

        {/* Active Employees */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex flex-col justify-between hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Employees
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Boxes className="size-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400">{activeEmployees}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Warehouse & stock dispatch staff
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Content: Recent Accounts & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Recent User Registrations */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  <Users className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recently Created Accounts
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Latest database records provisioned in the system
                  </p>
                </div>
              </div>

              <Link
                href="/admin/users"
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {recentUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                No user accounts recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-150 dark:divide-white/[0.06]">
                {recentUsers.map((u) => {
                  const roleBadgeColor =
                    u.role === "ADMIN"
                      ? "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30"
                      : u.role === "MANAGER"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

                  return (
                    <div
                      key={u.id}
                      className="py-3.5 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center size-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-white/[0.08] shrink-0">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                            {u.name}
                          </p>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${roleBadgeColor}`}
                        >
                          {u.role}
                        </span>

                        <span
                          className={`size-2 rounded-full ${
                            u.isActive
                              ? "bg-emerald-500 dark:bg-emerald-400 ring-2 ring-emerald-400/20"
                              : "bg-rose-500"
                          }`}
                          title={u.isActive ? "Active" : "Inactive"}
                        />

                        <span className="hidden sm:inline-block text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-400" />
              Real-time PostgreSQL read
            </span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {activeAdmins} active {activeAdmins === 1 ? "Admin" : "Admins"} configured
            </span>
          </div>
        </div>

        {/* Right Column (1 span): System Integrity & Architecture Cards */}
        <div className="space-y-6">
          {/* System Security & Integrity */}
          <div className="p-6 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">System Integrity</h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-slate-500 dark:text-slate-400">Database Connection</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  PostgreSQL Online
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-slate-500 dark:text-slate-400">Auth Engine</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">NextAuth v5 Beta</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-slate-500 dark:text-slate-400">Role Isolation</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">Enforced</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                <span className="text-slate-500 dark:text-slate-400">Password Hashing</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Bcryptjs (10 Salt)</span>
              </div>
            </div>
          </div>

          {/* CRM Modules Launcher */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50/80 via-white/80 to-indigo-50/80 dark:from-[#0c1322]/80 dark:via-[#13112c]/60 dark:to-[#0c1322]/80 backdrop-blur-xl border border-violet-500/20 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
              <Layers className="size-4" />
              <span>CRM Governance Modules</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Teams, Department allocations, Activity Audit trails, and System Settings are fully active.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <Link
                href="/admin/teams"
                className="text-violet-600 dark:text-violet-300 hover:underline flex items-center gap-1 transition-colors"
              >
                <span>Teams</span>
                <ArrowRight className="size-3" />
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link
                href="/admin/activity"
                className="text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1 transition-colors"
              >
                <History className="size-3" />
                <span>Audit Logs</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link
                href="/admin/settings"
                className="text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 transition-colors"
              >
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
