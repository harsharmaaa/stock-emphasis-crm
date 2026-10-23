"use client";

import { useState } from "react";
import type { StockLeadItem } from "./actions";
import { logEmployeeFollowUpAction } from "./actions";
import {
  Boxes,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
  MapPin,
  Building,
} from "lucide-react";

interface EmployeeStocksClientProps {
  initialStocks: StockLeadItem[];
  teamName: string;
}

const CATEGORY_TABS = [
  { label: "All Items", value: "ALL" },
  { label: "Raw Materials", value: "RAW_MATERIALS" },
  { label: "Finished Goods", value: "FINISHED_GOODS" },
  { label: "Transit Batches", value: "TRANSIT_BATCH" },
  { label: "Client Leads", value: "CLIENT_LEAD" },
];

export function EmployeeStocksClient({
  initialStocks,
  teamName,
}: EmployeeStocksClientProps) {
  const [stocks] = useState<StockLeadItem[]>(initialStocks);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Follow-up modal state
  const [selectedStock, setSelectedStock] = useState<StockLeadItem | null>(null);
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpDetails, setFollowUpDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredStocks = stocks.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase()) ||
      (item.leadContact &&
        item.leadContact.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === "ALL" ? true : item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleOpenFollowUp = (stock: StockLeadItem) => {
    setSelectedStock(stock);
    setFollowUpSubject(`Inspection note for ${stock.sku}`);
    setFollowUpDetails("");
    setActionSuccess(null);
    setActionError(null);
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock) return;

    setIsSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    const res = await logEmployeeFollowUpAction({
      title: followUpSubject,
      details: followUpDetails,
      referenceItem: selectedStock.sku,
    });

    setIsSubmitting(false);

    if (res.success) {
      setActionSuccess(`Follow-up recorded in activity log for ${selectedStock.sku}.`);
      setTimeout(() => {
        setSelectedStock(null);
        setActionSuccess(null);
      }, 1500);
    } else {
      setActionError(res.error || "Failed to log follow-up.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="size-5 text-emerald-400" />
            <span>Assigned Stocks & Leads</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Department inventory allocations and lead inquiries for{" "}
            <strong className="text-slate-200">{teamName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-slate-400">
          <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            {filteredStocks.length} of {stocks.length} Items Listed
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, stock name, warehouse aisle, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="size-4 text-slate-500 shrink-0 hidden md:block" />
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategoryFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === tab.value
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Cards Grid */}
      {filteredStocks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
          <Boxes className="size-8 mx-auto text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            No stock or lead items match your filter.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search terms or selecting &quot;All Items&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStocks.map((item) => {
            const statusBadge =
              item.status === "IN_STOCK"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : item.status === "LOW_STOCK"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : item.status === "ALLOCATED"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-purple-500/10 text-purple-400 border-purple-500/20";

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      {item.sku}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${statusBadge}`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Category: {item.category.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">Stock Count:</span>
                      <span className="font-bold text-white font-mono">
                        {item.quantity} {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="size-3 text-slate-500" />
                        <span>Location:</span>
                      </span>
                      <span className="font-mono text-slate-200">
                        {item.location}
                      </span>
                    </div>

                    {item.leadContact && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Building className="size-3 text-slate-500" />
                          <span>Client / Lead:</span>
                        </span>
                        <span className="text-blue-300 truncate max-w-[150px]">
                          {item.leadContact}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Last: {item.lastInspected}
                  </span>

                  <button
                    onClick={() => handleOpenFollowUp(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 transition-colors"
                  >
                    <Plus className="size-3 text-emerald-400" />
                    <span>Log Follow-up</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up Note Modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Operational Logging
              </span>
              <h2 className="text-base font-bold text-white">
                Log Follow-up on {selectedStock.sku}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedStock.title} ({selectedStock.location})
              </p>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFollowUp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  value={followUpSubject}
                  onChange={(e) => setFollowUpSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Inspection / Follow-up Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe quantity confirmed, physical condition, packaging status, or client conversation..."
                  value={followUpDetails}
                  onChange={(e) => setFollowUpDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStock(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save to Activity Stream</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
