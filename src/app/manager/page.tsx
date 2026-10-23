import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { SignOutButton } from "@/src/components/shared/sign-out-button";
import {
  Briefcase,
  Layers,
  Users,
  Boxes,
  CheckCircle2,
  ShieldCheck,
  Megaphone,
} from "lucide-react";

export const instant = false;

export const metadata = {
  title: "Manager Operations Portal | Stock Emphasis CRM",
  description: "Operations supervision, team monitoring, and subordinate employee management.",
};

export default async function ManagerPage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  if (user.role !== "MANAGER") {
    redirect(user.role === "ADMIN" ? "/admin" : "/employee");
  }

  // Real-time database verification: ensure manager account is active
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, isActive: true },
  });

  if (!dbUser || !dbUser.isActive) {
    redirect("/login");
  }

  if (dbUser.role !== "MANAGER") {
    redirect(dbUser.role === "ADMIN" ? "/admin" : "/employee");
  }

  // Query real-time data for this manager
  const [ledTeams, directReports, announcementSetting] = await Promise.all([
    prisma.team.findMany({
      where: { leaderId: user.id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            role: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { managerId: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: true,
        team: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.systemSetting.findUnique({
      where: { key: "ANNOUNCEMENT_BANNER" },
      select: { value: true },
    }),
  ]);

  const totalSupervised = directReports.length;
  const activeReportsCount = directReports.filter((d) => d.isActive).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="sticky top-0 z-20 h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Boxes className="size-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Stock Emphasis CRM
            </span>
            <h1 className="text-sm font-bold text-white">Operations Management Portal</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-medium">
            <Briefcase className="size-3.5 text-blue-400" />
            <span>Manager: {user.name}</span>
          </div>

          <SignOutButton className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all shadow-xs" />
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Announcement Banner if configured */}
        {announcementSetting?.value && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-300 backdrop-blur-md">
            <Megaphone className="size-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-blue-200 block mb-0.5">
                System Announcement
              </strong>
              <span>{announcementSetting.value}</span>
            </div>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-blue-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <ShieldCheck className="size-3.5 text-blue-400" />
              <span>Operations Supervisor</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome, {user.name}
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Live oversight of assigned warehouse departments, staff allocation, and reporting subordinates.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800">
            <span>ID: {user.id}</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">MANAGER</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Teams Led
              </span>
              <span className="text-3xl font-black text-white">{ledTeams.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="size-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Direct Reports
              </span>
              <span className="text-3xl font-black text-white">{totalSupervised}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="size-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                Active Staff
              </span>
              <span className="text-3xl font-black text-emerald-400">
                {activeReportsCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-6" />
            </div>
          </div>
        </div>

        {/* Teams Led Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="size-4.5 text-blue-400" />
            <span>Assigned Teams & Departments</span>
          </h3>

          {ledTeams.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
              <Layers className="size-8 mx-auto text-slate-600 mb-2" />
              <p className="font-medium text-slate-300">
                You are not currently designated as the Lead for any department.
              </p>
              <p className="text-slate-500 mt-1">
                An Administrator can assign you to lead a team in the Admin Teams console.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ledTeams.map((team) => (
                <div
                  key={team.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-bold text-white">{team.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {team.members.length} {team.members.length === 1 ? "Staff Member" : "Staff Members"}
                      </span>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-400 mb-3">{team.description}</p>
                    )}

                    <div className="mt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                        Team Roster
                      </span>
                      {team.members.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          No employees allocated to this department yet.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {team.members.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                            >
                              <span className="font-medium text-slate-200">{m.name}</span>
                              <span
                                className={`size-1.5 rounded-full ${
                                  m.isActive ? "bg-emerald-400" : "bg-rose-500"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Direct Subordinates Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="size-4 text-blue-400" />
              <span>Direct Subordinates</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {directReports.length} {directReports.length === 1 ? "Employee" : "Employees"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/20 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 sm:px-6">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department / Team</th>
                  <th className="py-3 px-4 text-right sm:px-6">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {directReports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No employees are currently assigned to report to you.
                    </td>
                  </tr>
                ) : (
                  directReports.map((dr) => (
                    <tr key={dr.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-semibold text-slate-200">
                        {dr.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {dr.email}
                      </td>
                      <td className="py-3 px-4">
                        {dr.team ? (
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            <Layers className="size-3 text-indigo-400" />
                            <span>{dr.team.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right sm:px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            dr.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
