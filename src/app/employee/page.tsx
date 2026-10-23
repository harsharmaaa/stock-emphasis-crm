import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { SignOutButton } from "@/src/components/shared/sign-out-button";
import {
  Boxes,
  Layers,
  Briefcase,
  ShieldCheck,
  Megaphone,
  UserCheck,
  Info,
} from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Employee Operations Portal | Stock Emphasis CRM",
  description: "Warehouse inventory staff workspace, team assignment, and supervisor contacts.",
};

export default async function EmployeePage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  if (user.role !== "EMPLOYEE") {
    redirect(user.role === "ADMIN" ? "/admin" : "/manager");
  }

  // Fetch real employee profile with team and manager relations
  const [employeeProfile, announcementSetting, supportEmailSetting] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          role: true,
          createdAt: true,
          team: {
            select: {
              id: true,
              name: true,
              description: true,
              leader: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          manager: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "ANNOUNCEMENT_BANNER" },
        select: { value: true },
      }),
      prisma.systemSetting.findUnique({
        where: { key: "SUPPORT_EMAIL" },
        select: { value: true },
      }),
    ]);

  if (!employeeProfile || !employeeProfile.isActive) {
    redirect("/login");
  }

  if (employeeProfile.role !== "EMPLOYEE") {
    redirect(employeeProfile.role === "ADMIN" ? "/admin" : "/manager");
  }

  const assignedTeam = employeeProfile.team;
  const reportingManager = employeeProfile.manager;
  const supportEmail = supportEmailSetting?.value || "admin@stockemphasis.com";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-20 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <Boxes className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Stock Emphasis CRM
            </span>
            <h1 className="text-sm font-bold text-white">Warehouse Employee Portal</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
            <UserCheck className="size-3.5 text-emerald-400" />
            <span>Employee: {user.name}</span>
          </div>

          <SignOutButton className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all shadow-xs" />
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Announcement Banner if configured */}
        {announcementSetting?.value && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 backdrop-blur-md">
            <Megaphone className="size-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-emerald-200 block mb-0.5">
                Warehouse Notice
              </strong>
              <span>{announcementSetting.value}</span>
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>Operations Staff</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome, {user.name}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Warehouse inventory operations workspace. View your assigned department, team lead, and supervisor contacts.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800">
            <span>ID: {user.id}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">EMPLOYEE</span>
          </div>
        </div>

        {/* Assignment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assigned Team Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Assigned Department</h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Warehouse Operational Unit
                    </span>
                  </div>
                </div>

                {assignedTeam && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Active Allocation
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

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
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
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <Info className="size-6 mx-auto text-slate-600" />
                  <p className="font-medium text-slate-300">
                    You are not currently assigned to a department team.
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Please contact your system administrator at{" "}
                    <strong className="text-slate-300 font-mono">{supportEmail}</strong> to be allocated to an operational unit.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reporting Manager Card */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Briefcase className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Direct Reporting Manager</h3>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Operational Supervision
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
                    No direct reporting manager currently assigned.
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Your supervisory assignments are managed in the central Admin Console.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Account Status: Active Staff</span>
              <span className="font-mono text-emerald-400">Stock Emphasis Verified</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
