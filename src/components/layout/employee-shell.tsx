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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
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
        <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Open sidebar menu"
            >
              <Menu className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stock Emphasis CRM
              </span>
              <span className="hidden sm:inline-block text-slate-600">/</span>
              <span className="text-sm font-bold text-white">
                Staff Operations Portal
              </span>
            </div>
          </div>

          {/* Right Header: Employee Pill & SignOut */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
              <Boxes className="size-3.5 text-emerald-400" />
              <span>Staff: {employeeName}</span>
            </div>

            <SignOutButton className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all shadow-xs hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
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
