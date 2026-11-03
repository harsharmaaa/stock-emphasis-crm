"use client";

import Link from "next/link";
import {
  Building2,
  Package,
  Layers,
  FileText,
  CreditCard,
  MessageSquare,
  Radio,
  SlidersHorizontal,
  RotateCcw,
  UserCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export function ConfigurationLandingClient() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header bar matching screenshot */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 dark:text-white uppercase">
          CONFIGURATION
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Master system settings, product catalogs, lead allotment rules, and billing parameters.
        </p>
      </div>

      {/* Section 1: CONFIGURATION (Company, Product, Template, Payment) */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Company Details (Working!) */}
          <Link
            href="/admin/settings/company"
            className="group bg-white dark:bg-[#0c1220] rounded-2xl p-5 border-2 border-blue-500/30 hover:border-blue-500 dark:border-blue-500/40 dark:hover:border-blue-400 shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Company</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Details</span>
                <ArrowRight className="size-3" />
              </div>
            </div>
            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="size-5" />
            </div>
          </Link>

          {/* Product List (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Product</div>
              <div className="text-xs text-rose-400 font-medium mt-0.5">List</div>
            </div>
            <div className="size-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-400 flex items-center justify-center shrink-0">
              <Package className="size-5" />
            </div>
          </div>

          {/* Product Groups (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Product</div>
              <div className="text-xs text-orange-400 font-medium mt-0.5">Groups</div>
            </div>
            <div className="size-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-400 flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
          </div>

          {/* Template List (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Template</div>
              <div className="text-xs text-blue-500 font-medium mt-0.5">List</div>
            </div>
            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center shrink-0">
              <FileText className="size-5" />
            </div>
          </div>

          {/* Payment Modes (FULLY WORKING!) */}
          <Link
            href="/admin/settings/payment-modes"
            className="group bg-white dark:bg-[#0c1220] rounded-2xl p-5 border-2 border-emerald-500/30 hover:border-emerald-500 dark:border-emerald-500/40 dark:hover:border-emerald-400 shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Payment</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span>Modes</span>
                <ArrowRight className="size-3" />
              </div>
            </div>
            <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CreditCard className="size-5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Section 2: LEADS (Response, Source, Operations, Recycle, Auto Allot) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          LEADS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lead Response (Working!) */}
          <Link
            href="/admin/settings/lead-responses"
            className="group bg-white dark:bg-[#0c1220] rounded-2xl p-5 border-2 border-blue-500/30 hover:border-blue-500 dark:border-blue-500/40 dark:hover:border-blue-400 shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="size-5" />
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Lead</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center justify-end gap-1 group-hover:-translate-x-0.5 transition-transform">
                <span>Response</span>
                <ArrowRight className="size-3" />
              </div>
            </div>
          </Link>

          {/* Lead Source (Working!) */}
          <Link
            href="/admin/settings/lead-sources"
            className="group bg-white dark:bg-[#0c1220] rounded-2xl p-5 border-2 border-blue-500/30 hover:border-blue-500 dark:border-blue-500/40 dark:hover:border-blue-400 shadow-md hover:shadow-lg transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Radio className="size-5" />
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Lead</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  Active
                </span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 flex items-center justify-end gap-1 group-hover:-translate-x-0.5 transition-transform">
                <span>Source</span>
                <ArrowRight className="size-3" />
              </div>
            </div>
          </Link>

          {/* Lead Operations (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="size-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Lead</div>
              <div className="text-xs text-sky-500 font-medium mt-0.5">Operations</div>
            </div>
          </div>

          {/* Lead Recycle (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center shrink-0">
              <RotateCcw className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Lead</div>
              <div className="text-xs text-amber-500 font-medium mt-0.5">Recycle</div>
            </div>
          </div>

          {/* Auto Allot (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="size-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-500 flex items-center justify-center shrink-0">
              <UserCheck className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Auto</div>
              <div className="text-xs text-teal-500 font-medium mt-0.5">Allot</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: EMPLOYEE (Graph Sales) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          EMPLOYEE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Graph Sales (Planned) */}
          <div className="bg-white dark:bg-[#0c1220] rounded-2xl p-5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white">Graph</div>
              <div className="text-xs text-emerald-500 font-medium mt-0.5">Sales</div>
            </div>
            <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer matching legacy CRM */}
      <div className="pt-8 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/70 dark:border-white/[0.06]">
        © Stock Emphasis v4.2.0. All rights reserved.
      </div>
    </div>
  );
}

