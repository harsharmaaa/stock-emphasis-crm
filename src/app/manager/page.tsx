import { getManagerOverviewAction } from "@/src/features/manager/actions";
import Link from "next/link";
import {
  Layers,
  Users,
  Briefcase,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  History,
  Sparkles,
} from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Manager Overview | Stock Emphasis CRM",
  description: "Operational supervision, team leadership metrics, and staff allocations.",
};

export default async function ManagerOverviewPage() {
  const result = await getManagerOverviewAction();
  const data = result.data;

  if (!data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load operations metrics</h3>
        <p className="text-xs text-rose-400 mt-1">{result.error}</p>
      </div>
    );
  }

  const {
    managerName,
    totalTeamsLed,
    totalSubordinates,
    activeSubordinates,
    inactiveSubordinates,
    teams,
    directReports,
    recentActivities,
    announcementBanner,
  } = data;

  const activeRate =
    totalSubordinates > 0
      ? Math.round((activeSubordinates / totalSubordinates) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome & Announcement Banner */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-xl">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              <span>Operations Command</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {managerName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Supervising {totalTeamsLed} {totalTeamsLed === 1 ? "team" : "teams"} and{" "}
              {totalSubordinates} direct reporting {totalSubordinates === 1 ? "employee" : "employees"} across active warehouse operations.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <Link
              href="/manager/teams"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-blue-500/20"
            >
              <Layers className="size-4" />
              <span>View Teams</span>
            </Link>
            <Link
              href="/manager/employees"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/80 dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] transition-all"
            >
              <Users className="size-4 text-blue-500" />
              <span>Staff Roster</span>
            </Link>
          </div>
        </div>

        {announcementBanner && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-xs text-indigo-700 dark:text-indigo-300 backdrop-blur-md shadow-xs">
            <Megaphone className="size-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block text-indigo-900 dark:text-indigo-200 text-xs">
                Organization Announcement
              </strong>
              <p className="mt-0.5 text-indigo-700 dark:text-indigo-300/90 leading-relaxed font-sans">
                {announcementBanner}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teams Led */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Teams Led</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalTeamsLed}
            </div>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              Lead Supervisor
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Layers className="size-6" />
          </div>
        </div>

        {/* Supervised Employees */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Direct Staff</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {totalSubordinates}
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              Subordinate hierarchy
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Users className="size-6" />
          </div>
        </div>

        {/* Active Ratio */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Staff Active Rate</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {activeRate}%
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-medium">
              {activeSubordinates} of {totalSubordinates} active
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-6" />
          </div>
        </div>

        {/* Inactive Subordinates */}
        <div className="p-5 rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Suspended / Inactive</span>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-300 mt-1">
              {inactiveSubordinates}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Requires attention
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/80">
            <Briefcase className="size-6" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Led Teams & Subordinate Staff */}
        <div className="lg:col-span-2 space-y-6">
          {/* Teams Led Section */}
          <div className="rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Layers className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Teams Led</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Departments under your supervision
                  </p>
                </div>
              </div>

              <Link
                href="/manager/teams"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {teams.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No department teams currently assigned to you.
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                          {t.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          Active Unit
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {t.membersCount} {t.membersCount === 1 ? "Employee" : "Employees"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {t.activeMembersCount} active staff
                        </span>
                      </div>

                      <Link
                        href="/manager/teams"
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
                        title="Inspect team"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Subordinates Table Preview */}
          <div className="rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Users className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Direct Subordinates</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Employees directly reporting to you
                  </p>
                </div>
              </div>

              <Link
                href="/manager/employees"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
              >
                <span>Manage staff</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {directReports.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No direct reporting employees assigned.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/40 dark:bg-white/[0.02]">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Contact</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                    {directReports.slice(0, 5).map((dr) => (
                      <tr
                        key={dr.id}
                        className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">
                          {dr.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {dr.email}
                        </td>
                        <td className="py-3 px-4">
                          {dr.team ? (
                            <span className="text-slate-800 dark:text-slate-300">{dr.team.name}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              dr.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                dr.isActive ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            />
                            <span>{dr.isActive ? "Active" : "Inactive"}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Scoped Activity Stream & Quick Launch */}
        <div className="space-y-6">
          {/* Operations Activity Stream */}
          <div className="rounded-2xl bg-white/75 dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.25)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Operations</h2>
              </div>

              <Link
                href="/manager/activity"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors"
              >
                <span>Stream</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No recent activity in your units.
              </div>
            ) : (
              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.05]">
                {recentActivities.map((act) => (
                  <div key={act.id} className="p-3.5 space-y-1 hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {act.action}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {act.details && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {act.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Operations Guide Card */}
          <div className="p-5 rounded-2xl bg-white/60 dark:bg-gradient-to-br dark:from-[#0c1322]/80 dark:via-blue-950/20 dark:to-[#0c1322]/80 border border-blue-500/20 shadow-xl backdrop-blur-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-[10px]">
              <Briefcase className="size-4" />
              <span>Manager Responsibilities</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              As an Operations Manager, you can monitor staff readiness, supervise team allocation rosters, and review audit trails for your departments.
            </p>
            <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>Authority: Supervisory</span>
              <span className="text-emerald-600 dark:text-emerald-400">Authenticated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
