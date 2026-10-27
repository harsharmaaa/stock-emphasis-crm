"use client";

import { useState } from "react";
import { EmployeeNav } from "./employee-nav";
import { SignOutButton } from "@/src/components/shared/sign-out-button";
import { Menu, Boxes } from "lucide-react";

interface EmployeeShellProps {
  employeeName: string;
  employeeEmail: string;
  children: React.ReactNode;
}

export function EmployeeShell({
  employeeName,
  employeeEmail,
  children,
}: EmployeeShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex relative">
      {/* Sidebar Navigation */}
      <EmployeeNav
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        employeeName={employeeName}
        employeeEmail={employeeEmail}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200/70 dark:border-white/[0.08] bg-white/70 dark:bg-[#090e1c]/75 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stock Emphasis CRM
              </span>
              <span className="hidden sm:inline-block text-slate-400/50">/</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Staff Operations Portal
              </span>
            </div>
          </div>

          {/* Right Header: Employee Pill & SignOut */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-medium">
              <Boxes className="size-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Staff: {employeeName}</span>
            </div>

            <SignOutButton className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" />
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
