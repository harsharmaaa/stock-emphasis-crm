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
import { PageHeader, Card, Badge } from "@/src/components/ui";

export function ConfigurationLandingClient() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="CONFIGURATION"
        description="Master system settings, product catalogs, lead allotment rules, and billing parameters."
      />

      {/* Section 1: CONFIGURATION (Company, Product, Template, Payment) */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Company Details */}
          <Link
            href="/admin/settings/company"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-brand/20 hover:border-brand transition-all">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">Company</span>
                  <Badge tone="info">Active</Badge>
                </div>
                <div className="text-xs text-brand font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Details</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
              <div className="size-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="size-5" />
              </div>
            </Card>
          </Link>

          {/* Product List */}
          <Link
            href="/admin/settings/products"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-rose-500/20 hover:border-rose-500 transition-all">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">Product</span>
                  <Badge tone="err">Active</Badge>
                </div>
                <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>List</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
              <div className="size-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Package className="size-5" />
              </div>
            </Card>
          </Link>

          {/* Product Groups (Planned) */}
          <Card className="p-5 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-foreground">Product</div>
              <div className="text-xs text-amber-500 font-medium mt-0.5">Groups</div>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
          </Card>

          {/* Template List (Planned) */}
          <Card className="p-5 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="text-sm font-semibold text-foreground">Template</div>
              <div className="text-xs text-sky-500 font-medium mt-0.5">List</div>
            </div>
            <div className="size-11 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <FileText className="size-5" />
            </div>
          </Card>

          {/* Payment Modes */}
          <Link
            href="/admin/settings/payment-modes"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-emerald-500/20 hover:border-emerald-500 transition-all">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">Payment</span>
                  <Badge tone="ok">Active</Badge>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Modes</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
              <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CreditCard className="size-5" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Section 2: LEADS (Response, Source, Operations, Recycle, Auto Allot) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          LEADS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lead Response */}
          <Link
            href="/admin/settings/lead-responses"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-brand/20 hover:border-brand transition-all">
              <div className="size-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="size-5" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-sm font-bold text-foreground">Lead</span>
                  <Badge tone="info">Active</Badge>
                </div>
                <div className="text-xs text-brand font-semibold mt-0.5 flex items-center justify-end gap-1 group-hover:-translate-x-0.5 transition-transform">
                  <span>Response</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Lead Source */}
          <Link
            href="/admin/settings/lead-sources"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-brand/20 hover:border-brand transition-all">
              <div className="size-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Radio className="size-5" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-sm font-bold text-foreground">Lead</span>
                  <Badge tone="info">Active</Badge>
                </div>
                <div className="text-xs text-brand font-semibold mt-0.5 flex items-center justify-end gap-1 group-hover:-translate-x-0.5 transition-transform">
                  <span>Source</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Lead Operations */}
          <Link
            href="/admin/settings/configuration/lead-operations"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-sky-500/20 hover:border-sky-500 transition-all">
              <div className="size-11 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <SlidersHorizontal className="size-5" />
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-sm font-bold text-foreground">Lead</span>
                  <Badge tone="info">Active</Badge>
                </div>
                <div className="text-xs text-sky-500 font-semibold mt-0.5 flex items-center justify-end gap-1 group-hover:-translate-x-0.5 transition-transform">
                  <span>Operations</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Card>
          </Link>

          {/* Lead Recycle (Planned) */}
          <Card className="p-5 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <RotateCcw className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">Lead</div>
              <div className="text-xs text-amber-500 font-medium mt-0.5">Recycle</div>
            </div>
          </Card>

          {/* Auto Allot (Planned) */}
          <Card className="p-5 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div className="size-11 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
              <UserCheck className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">Auto</div>
              <div className="text-xs text-teal-500 font-medium mt-0.5">Allot</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Section 3: EMPLOYEE (Graph Sales) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          EMPLOYEE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Graph Sales */}
          <Link
            href="/admin/settings/configuration/employee-graphs"
            className="group block"
          >
            <Card className="p-5 flex items-center justify-between border-emerald-500/20 hover:border-emerald-500 transition-all">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground">Graph</span>
                  <Badge tone="ok">Active</Badge>
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Sales</span>
                  <ArrowRight className="size-3" />
                </div>
              </div>
              <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <TrendingUp className="size-5" />
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-8 text-center text-[11px] text-muted-foreground border-t border-border/70">
        © Stock Emphasis v4.2.0. All rights reserved.
      </div>
    </div>
  );
}

