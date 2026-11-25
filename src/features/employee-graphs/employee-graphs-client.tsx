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
import {
  PageHeader,
  Card,
  Button,
  Badge,
  ConfirmDialog,
  useToast,
} from "@/src/components/ui";

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

  const toast = useToast();

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
    toast.success("Graph saved", `Graph "${saved.title}" saved successfully.`);
  };

  const handleToggleStatus = async (cfg: GraphConfigWithData) => {
    try {
      const res = await toggleEmployeeGraphStatusAction(cfg.id);
      if (res.success) {
        setConfigs((prev) =>
          prev.map((c) => (c.id === cfg.id ? { ...c, isActive: !c.isActive } : c))
        );
        toast.success("Status updated", `Graph "${cfg.title}" status updated.`);
      } else {
        toast.error("Update failed", res.error || "Failed to toggle status.");
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingConfig) return;
    setIsDeleting(true);
    try {
      const res = await deleteEmployeeGraphConfigAction(deletingConfig.id);
      if (res.success) {
        setConfigs((prev) => prev.filter((c) => c.id !== deletingConfig.id));
        toast.success("Graph deleted", `Graph "${deletingConfig.title}" deleted.`);
        setDeletingConfig(null);
      } else {
        toast.error("Delete failed", res.error || "Failed to delete graph.");
      }
    } catch {
      toast.error("Error", "An unexpected error occurred.");
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
      {/* Header */}
      <PageHeader
        title="GRAPH"
        description="Manage executive dashboard performer graphs, top ranking thresholds, and leaderboard tiers."
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Table View Tab */}
            <Button
              variant={activeView === "table" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveView("table")}
            >
              <TableIcon className="size-3.5" />
              Table
            </Button>

            {/* Analytical Button */}
            <Button
              variant={activeView === "analytical" ? "primary" : "sec"}
              size="sm"
              onClick={() => setActiveView("analytical")}
            >
              <BarChart3 className="size-3.5" />
              Analytical
            </Button>

            {/* Slider Graph Button */}
            <Button
              variant={activeView === "slider" ? "primary" : "sec"}
              size="sm"
              onClick={() => setActiveView("slider")}
            >
              <Sliders className="size-3.5" />
              Slider Graph
            </Button>

            {/* Single Graph Button */}
            <Button
              variant={activeView === "single" ? "primary" : "sec"}
              size="sm"
              onClick={() => setActiveView("single")}
            >
              <Maximize2 className="size-3.5" />
              Single Graph
            </Button>

            {/* + Add Button */}
            <Button
              variant="primary"
              size="sm"
              leftIcon="Plus"
              onClick={handleOpenAdd}
            >
              Add
            </Button>

            {/* Go Back Button */}
            <Link href="/admin/settings/configuration">
              <Button
                variant="danger"
                size="sm"
              >
                <ArrowLeft className="size-3.5" />
                Go Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* VIEW 1: Table View */}
      {activeView === "table" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20 text-muted-foreground font-bold">
                  <th className="py-4 px-6 w-14 text-center">#</th>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Profile</th>
                  <th className="py-4 px-6">Size</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No graph configurations registered. Click &quot;+ Add&quot; to configure one.
                    </td>
                  </tr>
                ) : (
                  configs.map((cfg, idx) => (
                    <tr
                      key={cfg.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-mono text-center text-muted-foreground">{idx + 1}</td>
                      <td className="py-3.5 px-6 font-bold text-foreground">
                        {cfg.title}
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge tone="info">
                          {cfg.profile}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-foreground">
                        {cfg.size}
                      </td>
                      <td className="py-3.5 px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cfg)}
                          className="cursor-pointer"
                          title={`Click to ${cfg.isActive ? "deactivate" : "activate"}`}
                        >
                          <Badge
                            tone="info"
                            dot={cfg.isActive}
                            className={!cfg.isActive ? "opacity-50 line-through" : ""}
                          >
                            {cfg.type}
                            {!cfg.isActive ? " (Off)" : ""}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-sky-600 dark:text-sky-400"
                            onClick={() => handleOpenEdit(cfg)}
                            title="Edit Configuration"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1.5 h-auto text-rose-600 dark:text-rose-400"
                            onClick={() => setDeletingConfig(cfg)}
                            title="Delete Configuration"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 2: Analytical View (Multi-Graph Side-by-Side Comparison) */}
      {activeView === "analytical" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 text-xs text-brand flex items-center justify-between">
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
            <div className="text-xs font-semibold text-muted-foreground">
              Graph Slide {sliderIndex + 1} of {configs.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="sec"
                size="sm"
                onClick={() => setSliderIndex((prev) => (prev > 0 ? prev - 1 : configs.length - 1))}
                title="Previous Slide"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="sec"
                size="sm"
                onClick={() => setSliderIndex((prev) => (prev < configs.length - 1 ? prev + 1 : 0))}
                title="Next Slide"
              >
                <ChevronRight className="size-4" />
              </Button>
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
            <label className="text-xs font-semibold text-muted-foreground">
              Select Graph to Inspect:
            </label>
            <select
              value={singleGraphId}
              onChange={(e) => setSingleGraphId(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20"
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingConfig)}
        onClose={() => setDeletingConfig(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Graph"
        description={
          deletingConfig ? (
            <span>
              Are you sure you want to delete the graph configuration for{" "}
              <strong className="text-foreground font-bold">{deletingConfig.title}</strong>? This action cannot be undone.
            </span>
          ) : undefined
        }
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        loading={isDeleting}
      />

      {/* Add / Edit Modal */}
      <GraphConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaveSuccess}
        initialData={editingConfig}
        profiles={profiles}
      />

      {/* Footer */}
      <div className="pt-8 text-center text-[11px] text-muted-foreground border-t border-border/70">
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
    <Card className="p-5 sm:p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {config.title}
          </h3>
          <span className="text-[11px] text-muted-foreground">
            Profile: {config.profile} • Size: {config.size} • Type: {config.type}
          </span>
        </div>
        <Badge tone="info" dot>
          Live Telemetry
        </Badge>
      </div>

      {/* Chart Body */}
      {items.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
          <TrendingUp className="size-8 text-muted-foreground/60 mb-2" />
          <p className="text-xs font-semibold">No performance records in this cohort yet.</p>
          <span className="text-[11px] text-muted-foreground/80 mt-0.5">
            Real activity will render when qualifying operators handle leads and record collections.
          </span>
        </div>
      ) : (
        <div className="relative pt-6 pb-2 h-64 sm:h-72 flex flex-col justify-end">
          {/* Background Grid Lines & Y-Axis Labels */}
          <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-muted-foreground font-mono">
            {yTicks.map((val, idx) => (
              <div key={idx} className="w-full flex items-center">
                <span className="w-12 text-right pr-2 shrink-0">{val}</span>
                <div
                  className={`flex-1 border-b ${
                    val === 0
                      ? "border-border/80"
                      : "border-border/40"
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
                    <div className="font-bold text-xs text-brand-soft">{item.name}</div>
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
                      <span className="font-bold text-brand-soft">
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
                    className={`${barWidthClass} rounded-t-md bg-brand hover:bg-brand-soft transition-all duration-300 shadow-sm`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="absolute inset-x-0 bottom-0 pl-14 pr-4 flex items-center justify-around gap-2 text-[11px] sm:text-xs font-medium text-muted-foreground">
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
    </Card>
  );
}
