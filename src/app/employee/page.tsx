import { getEmployeeOverviewAction } from "@/src/features/employee/actions";
import Link from "next/link";
import {
  Boxes,
  Layers,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Megaphone,
  ArrowRight,
  AlertCircle,
  Info,
  CheckSquare,
  History,
} from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Employee Overview | Stock Emphasis CRM",
  description: "Warehouse inventory staff workspace, team assignment, and task management.",
};

export default async function EmployeeOverviewPage() {
  const result = await getEmployeeOverviewAction();
  const data = result.data;

  if (!data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300">
        <AlertCircle className="size-8 mx-auto mb-2 text-rose-400" />
        <h3 className="font-bold">Failed to load staff workspace</h3>
        <p className="text-xs text-rose-400 mt-1">{result.error}</p>
      </div>
    );
  }

  const {
    profile,
    announcementBanner,
    supportEmail,
    recentActivities,
    metrics,
  } = data;

  const assignedTeam = profile.team;
  const reportingManager = profile.manager;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/20 shadow-xl backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              <span>Operational Workspace</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Welcome, {profile.name}
            </h1>
            <p className="text-xs text-slate-400 max-w-xl">
              Warehouse Staff ID: <strong className="font-mono text-slate-300">{profile.id}</strong> |{" "}
              {assignedTeam ? (
                <span>Assigned to <strong className="text-emerald-300">{assignedTeam.name}</strong></span>
              ) : (
                <span className="text-amber-400">Department unassigned</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <Link
              href="/employee/stocks"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-500/20"
            >
              <Boxes className="size-4" />
              <span>Assigned Stocks</span>
            </Link>
            <Link
              href="/employee/tasks"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-all"
            >
              <CheckSquare className="size-4 text-emerald-400" />
              <span>My Tasks</span>
            </Link>
          </div>
        </div>

        {announcementBanner && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 backdrop-blur-md shadow-xs">
            <Megaphone className="size-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block text-emerald-200 text-xs">
                Organization Announcement
              </strong>
              <p className="mt-0.5 text-emerald-300/90 leading-relaxed font-sans">
                {announcementBanner}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Department Allocation */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Department</span>
            <div className="text-base font-bold text-white mt-1 truncate max-w-[140px]">
              {assignedTeam ? assignedTeam.name : "Unassigned"}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">
              {assignedTeam ? "Active unit allocation" : "Contact administrator"}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Layers className="size-6" />
          </div>
        </div>

        {/* Assigned Inventory Items */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Assigned Stocks</span>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.assignedStocksCount}
            </div>
            <span className="text-[10px] text-teal-400 font-medium">
              Catalog allocations
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Boxes className="size-6" />
          </div>
        </div>

        {/* Active Checklist Tasks */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Active Tasks</span>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.activeTasksCount}
            </div>
            <span className="text-[10px] text-amber-400 font-medium">
              {metrics.completedTasksCount} completed
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckSquare className="size-6" />
          </div>
        </div>

        {/* Follow-ups Logged */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Activity Logged</span>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.followUpsLogged}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">
              Recorded entries
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-6" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Assigned Department & Reporting Manager */}
        <div className="lg:col-span-2 space-y-6">
          {/* Department Unit Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assigned Operational Department</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Warehouse Unit Allocation
                  </span>
                </div>
              </div>

              {assignedTeam && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Active
                </span>
              )}
            </div>

            {assignedTeam ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <h4 className="text-base font-bold text-white mb-1">
                    {assignedTeam.name}
                  </h4>
                  {assignedTeam.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {assignedTeam.description}
                    </p>
                  )}
                </div>

                {/* Team Lead Section */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Department Team Lead
                  </span>
                  {assignedTeam.leader ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {assignedTeam.leader.name}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {assignedTeam.leader.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">
                      No team lead currently assigned
                    </span>
                  )}
                </div>

                {/* Fellow Colleagues in Team */}
                {assignedTeam.colleagues.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Team Colleagues ({assignedTeam.membersCount} members total)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {assignedTeam.colleagues.map((colleague) => (
                        <div
                          key={colleague.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300"
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              colleague.isActive ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          <span>{colleague.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <Info className="size-6 mx-auto text-slate-600" />
                <p className="font-medium text-slate-300">
                  You are not currently assigned to an operational department.
                </p>
                <p className="text-slate-500 text-[11px]">
                  Contact your system administrator at{" "}
                  <strong className="text-slate-300 font-mono">{supportEmail}</strong> to be assigned to an operational unit.
                </p>
              </div>
            )}
          </div>

          {/* Reporting Manager Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Briefcase className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct Reporting Supervisor</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Operational Oversight
                  </span>
                </div>
              </div>

              {reportingManager && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Supervised
                </span>
              )}
            </div>

            {reportingManager ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm">
                    {reportingManager.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {reportingManager.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {reportingManager.email}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Supervisor Role:</span>
                  <span className="font-semibold text-blue-400">OPERATIONS MANAGER</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <Info className="size-6 mx-auto text-slate-600" />
                <p className="font-medium text-slate-300">
                  No direct reporting supervisor currently assigned.
                </p>
                <p className="text-slate-500 text-[11px]">
                  Supervisory allocations are managed by your operations administrator.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Recent Personal Activity & Shortcuts */}
        <div className="space-y-6">
          {/* Recent Activity Log Preview */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">My Recent Activity</h2>
              </div>

              <Link
                href="/employee/activity"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <span>Full history</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No recent activity logged.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentActivities.map((act) => (
                  <div key={act.id} className="p-3.5 space-y-1 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider">
                        {act.action}
                      </span>
                      <span className="text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(act.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {act.details && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {act.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Operations Guide */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/20 shadow-xl space-y-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              <Sparkles className="size-4" />
              <span>Staff Quick Actions</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Use the Staff Portal to record physical stock inspections, fulfill assigned leads, and update daily task completion statuses.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Account: Active</span>
              <span className="text-emerald-400">Stock Emphasis Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
