"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  BarChart3,
  Sliders,
  Maximize2,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { GraphConfigModal } from "./graph-config-modal";
import {
  deleteEmployeeGraphConfigAction,
  toggleEmployeeGraphStatusAction,
  type GraphConfigWithData,
  type ProfileOption,
  type EmployeeGraphConfigItem,
} from "./actions";

interface EmployeeGraphsClientProps {
  initialConfigs: GraphConfigWithData[];
  profiles: ProfileOption[];
}

export function EmployeeGraphsClient({
  initialConfigs,
  profiles,
}: EmployeeGraphsClientProps) {
  const [configs, setConfigs] = useState<GraphConfigWithData[]>(initialConfigs);
  const [activeView, setActiveView] = useState<"table" | "analytical" | "slider" | "single">("table");

  // Slider view state
  const [sliderIndex, setSliderIndex] = useState(0);

  // Single graph view state
  const [singleGraphId, setSingleGraphId] = useState<string>(
    initialConfigs[0]?.id || ""
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmployeeGraphConfigItem | null>(null);

  // Delete State
  const [deletingConfig, setDeletingConfig] = useState<EmployeeGraphConfigItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cfg: EmployeeGraphConfigItem) => {
    setEditingConfig(cfg);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (saved: EmployeeGraphConfigItem) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          ...saved,
        };
        return next;
      }
      const newItem: GraphConfigWithData = {
        ...saved,
        performers: [],
      };
      return [...prev, newItem];
    });
    showToast("success", `Graph "${saved.title}" saved successfully.`);
  };

  const handleToggleStatus = async (cfg: GraphConfigWithData) => {
    try {
      const res = await toggleEmployeeGraphStatusAction(cfg.id);
      if (res.success) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === cfg.id ? { ...c, isActive: !c.isActive } : c))
        );
        showToast("success", `Graph "${cfg.title}" status updated.`);
      } else {
        showToast("error", res.error || "Failed to toggle status.");
      }
    } catch {
      showToast("error", "An unexpected error occurred.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConfig) return;
    setIsDeleting(true);
    try {
      const res = await deleteEmployeeGraphConfigAction(deletingConfig.id);
      if (res.success) {
        setConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id));
        showToast("success", `Graph "${deletingConfig.title}" deleted.`);
        setDeletingConfig(null);
      } else {
        showToast("error", res.error || "Failed to delete graph.");
      }
    } catch {
      showToast("error", "An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format currency helper
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Selected single graph item
  const selectedSingleGraph = useMemo(() => {
    return configs.find((c) => c.id === singleGraphId) || configs[0] || null;
  }, [configs, singleGraphId]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed top-18 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 duration-200 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header bar strictly matching Screenshot (189).png */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">
            GRAPH
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage executive dashboard performer graphs, top ranking thresholds, and leaderboard tiers.
          </p>
        </div>

        {/* Top-Right Action Buttons matching Screenshot (189).png */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Table View Tab */}
          <button
            type="button"
            onClick={() => setActiveView("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              activeView === "table"
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]"
            }`}
          >
            <TableIcon className="size-3.5" />
            <span>Table</span>
          </button>

          {/* Analytical Button (Blue) */}
          <button
            type="button"
            onClick={() => setActiveView("analytical")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              activeView === "analytical"
                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white"
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Analytical</span>
          </button>

          {/* Slider Graph Button (Sky Blue) */}
          <button
            type="button"
            onClick={() => setActiveView("slider")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              activeView === "slider"
                ? "bg-sky-600 text-white ring-2 ring-sky-400"
                : "bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Slider Graph</span>
          </button>

          {/* Single Graph Button (Teal / Green) */}
          <button
            type="button"
            onClick={() => setActiveView("single")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              activeView === "single"
                ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white"
            }`}
          >
            <Maximize2 className="size-3.5" />
            <span>Single Graph</span>
          </button>

          {/* + Add Button (Green) */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </button>

          {/* + Go Back Button (Rose/Red) */}
          <Link
            href="/admin/settings/configuration"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Go Back</span>
          </Link>
        </div>
      </div>

      {/* VIEW 1: Table View (Matching Screenshot (189).png) */}
      {activeView === "table" && (
        <div className="bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-300 font-bold">
                  <th className="py-4 px-6 w-14 text-center">#</th>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Profile</th>
                  <th className="py-4 px-6">Size</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-white/[0.04]">
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      No graph configurations registered. Click &quot;+ Add&quot; to configure one.
                    </td>
                  </tr>
                ) : (
                  configs.map((cfg, idx) => (
                    <tr
                      key={cfg.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-center text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-6 font-bold text-slate-800 dark:text-slate-100">
                        {cfg.title}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08]">
                          {cfg.profile}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {cfg.size}
                      </td>
                      <td className="py-3.5 px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cfg)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${
                            cfg.type === "Team"
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          } ${!cfg.isActive ? "opacity-50 line-through" : ""}`}
                          title={`Click to ${cfg.isActive ? "deactivate" : "activate"}`}
                        >
                          {cfg.type}
                          {!cfg.isActive ? " (Off)" : ""}
                        </button>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit Button matching screenshot cyan box */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cfg)}
                            className="p-1.5 rounded-md border border-cyan-400/50 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                            title="Edit Configuration"
                          >
                            <Edit2 className="size-3.5" />
                          </button>

                          {/* Delete Button matching screenshot coral box */}
                          <button
                            type="button"
                            onClick={() => setDeletingConfig(cfg)}
                            className="p-1.5 rounded-md border border-rose-400/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Configuration"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Analytical View (Multi-Graph Side-by-Side Comparison) */}
      {activeView === "analytical" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span className="font-semibold">
              Live Analytical Multi-Graph View: Displaying all {configs.length} configured cohorts with live database metrics.
            </span>
            <span className="font-mono text-[11px] opacity-80">Real DB Telemetry</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {configs.map((cfg) => (
              <GraphPreviewCard key={cfg.id} config={cfg} formatINR={formatINR} />
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Slider Graph View (Carousel / Slide Navigation) */}
      {activeView === "slider" && configs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500">
              Graph Slide {sliderIndex + 1} of {configs.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSliderIndex((prev) => (prev > 0 ? prev - 1 : configs.length - 1))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors"
                title="Previous Slide"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setSliderIndex((prev) => (prev < configs.length - 1 ? prev + 1 : 0))}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors"
                title="Next Slide"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            {configs[sliderIndex] && (
              <GraphPreviewCard config={configs[sliderIndex]} formatINR={formatINR} />
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: Single Graph View (Focus Selector) */}
      {activeView === "single" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Select Graph to Inspect:
            </label>
            <select
              value={singleGraphId}
              onChange={(e) => setSingleGraphId(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.profile} - {c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="max-w-4xl mx-auto">
            {selectedSingleGraph && (
              <GraphPreviewCard config={selectedSingleGraph} formatINR={formatINR} />
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Graph</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete the graph configuration for{" "}
              <strong className="text-slate-900 dark:text-white font-bold">{deletingConfig.title}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingConfig(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <GraphConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaveSuccess}
        initialData={editingConfig}
        profiles={profiles}
      />

      {/* Footer matching Screenshot (189).png */}
      <div className="pt-8 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/70 dark:border-white/[0.06]">
        © Stock Emphasis v4.2.0. All rights reserved.
      </div>
    </div>
  );
}

/**
 * Reusable Card component rendering live vertical bar leaderboard for a GraphConfigWithData
 */
function GraphPreviewCard({
  config,
  formatINR,
}: {
  config: GraphConfigWithData;
  formatINR: (val: number) => string;
}) {
  const items = config.performers || [];
  const rawMax = Math.max(...items.map((i) => i.metricValue), 100000);
  const niceMax = Math.max(100000, Math.ceil(rawMax / 50000) * 50000);
  const yTicks = [
    niceMax,
    Math.round(niceMax * 0.8),
    Math.round(niceMax * 0.6),
    Math.round(niceMax * 0.4),
    Math.round(niceMax * 0.2),
    0,
  ];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-[#0c1322]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-md flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {config.title}
          </h3>
          <span className="text-[11px] text-slate-400">
            Profile: {config.profile} • Size: {config.size} • Type: {config.type}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Live Telemetry
        </span>
      </div>

      {/* Chart Body */}
      {items.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <TrendingUp className="size-8 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold">No performance records in this cohort yet.</p>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Real activity will render when qualifying operators handle leads and record collections.
          </span>
        </div>
      ) : (
        <div className="relative pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-end">
          {/* Background Grid Lines & Y-Axis Labels */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
            {yTicks.map((val, idx) => (
              <div key={idx} className="w-full flex items-center">
                <span className="w-12 text-right pr-2 shrink-0">{val}</span>
                <div
                  className={`flex-1 border-b ${
                    val === 0
                      ? "border-slate-200 dark:border-white/[0.1]"
                      : "border-slate-150 dark:border-white/[0.05]"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Vertical Bars Layer */}
          <div className="relative z-10 pl-14 pr-4 h-full flex items-end justify-around gap-4 pb-8">
            {items.map((item) => {
              const heightPercent = Math.min(
                95,
                Math.max(item.metricValue > 0 ? (item.metricValue / niceMax) * 95 : 4, 4)
              );
              const barWidthClass =
                items.length === 1
                  ? "w-28 sm:w-36 max-w-[160px]"
                  : items.length === 2
                  ? "w-20 sm:w-28 max-w-[120px]"
                  : "w-14 sm:w-20 max-w-[90px]";

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col items-center flex-1 h-full justify-end cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 min-w-[160px] p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#080d19]/95 text-white border border-white/10 shadow-2xl backdrop-blur-md text-[11px] space-y-1">
                    <div className="font-bold text-xs text-blue-400">{item.name}</div>
                    {item.profileName && (
                      <div className="text-[10px] text-slate-400">{item.profileName}</div>
                    )}
                    <div className="pt-1 border-t border-white/10 flex justify-between">
                      <span className="text-slate-400">Achieved:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{formatINR(item.achievedAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-mono text-slate-200">
                        ₹{formatINR(item.targetAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Achievement:</span>
                      <span className="font-bold text-blue-400">
                        {item.achievementPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Leads:</span>
                      <span className="font-mono text-slate-200">{item.leadsCount}</span>
                    </div>
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className={`${barWidthClass} rounded-t-md bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 transition-all duration-300 shadow-sm`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute inset-x-0 bottom-0 pl-14 pr-4 flex items-center justify-around gap-2 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400">
            {items.map((item) => (
              <span
                key={item.id}
                className="text-center truncate flex-1 px-1"
                title={`${item.name} - ${item.achievementPercent}%`}
              >
                {item.name} - {item.achievementPercent}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
