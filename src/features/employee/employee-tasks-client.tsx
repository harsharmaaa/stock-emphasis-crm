"use client";

import { useState } from "react";
import type { EmployeeTaskItem } from "./actions";
import {
  toggleEmployeeTaskAction,
  logEmployeeFollowUpAction,
} from "./actions";
import {
  CheckSquare,
  Square,
  Clock,
  Plus,
  CheckCircle2,
  Loader2,
  ListTodo,
} from "lucide-react";

interface EmployeeTasksClientProps {
  initialTasks: EmployeeTaskItem[];
}

export function EmployeeTasksClient({
  initialTasks,
}: EmployeeTasksClientProps) {
  const [tasks, setTasks] = useState<EmployeeTaskItem[]>(initialTasks);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  // New task modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (activeCategory === "ALL") return true;
    if (activeCategory === "PENDING") return !t.completed;
    if (activeCategory === "COMPLETED") return t.completed;
    return t.category === activeCategory;
  });

  const handleToggleTask = async (task: EmployeeTaskItem) => {
    const nextState = !task.completed;
    setIsUpdatingId(task.id);

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: nextState } : t))
    );

    const res = await toggleEmployeeTaskAction({
      taskId: task.id,
      taskTitle: task.title,
      completed: nextState,
    });

    setIsUpdatingId(null);

    if (res.success) {
      setStatusMessage(
        nextState
          ? `Marked "${task.title}" as completed!`
          : `Reopened "${task.title}".`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      // Revert if failed
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !nextState } : t))
      );
    }
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSubmitting(true);

    const res = await logEmployeeFollowUpAction({
      title: `Operational Task: ${newTaskTitle.trim()}`,
      details: newTaskNotes.trim() || "Recorded personal checklist task item.",
    });

    setIsSubmitting(false);

    if (res.success) {
      const newTask: EmployeeTaskItem = {
        id: `task-${Date.now()}`,
        title: newTaskTitle.trim(),
        category: "INSPECTION",
        priority: "MEDIUM",
        dueDate: "Today",
        completed: false,
        notes: newTaskNotes.trim() || undefined,
      };

      setTasks((prev) => [newTask, ...prev]);
      setShowAddModal(false);
      setNewTaskTitle("");
      setNewTaskNotes("");
      setStatusMessage("New operational checklist item added and logged.");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="size-5 text-emerald-400" />
            <span>Tasks & Follow-up Actions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personal operational checklists, inventory audits, and fulfillment items
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Add Action Item</span>
        </button>
      </div>

      {/* Progress & Quick Stats Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            Operational Completion Progress
          </span>
          <span className="font-mono font-bold text-emerald-400">
            {completedCount} of {totalCount} completed ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        {[
          { label: "All Tasks", value: "ALL" },
          { label: "Pending", value: "PENDING" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Stock Audits", value: "STOCK_AUDIT" },
          { label: "Inspections", value: "INSPECTION" },
          { label: "Lead Follow-ups", value: "LEAD_FOLLOWUP" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === tab.value
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl overflow-hidden divide-y divide-slate-800/60">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <ListTodo className="size-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No tasks in this view.</p>
            <p className="text-slate-500 mt-1">
              Select &quot;All Tasks&quot; or create a new action item above.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isUpdating = isUpdatingId === task.id;
            const priorityBadge =
              task.priority === "HIGH"
                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                : task.priority === "MEDIUM"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700";

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  task.completed ? "bg-slate-950/40 opacity-75" : "hover:bg-slate-800/20"
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleTask(task)}
                    disabled={isUpdating}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 focus:outline-none transition-colors"
                    aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {isUpdating ? (
                      <Loader2 className="size-5 animate-spin text-emerald-400" />
                    ) : task.completed ? (
                      <CheckCircle2 className="size-5 text-emerald-400" />
                    ) : (
                      <Square className="size-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold transition-all ${
                          task.completed
                            ? "line-through text-slate-400"
                            : "text-slate-100"
                        }`}
                      >
                        {task.title}
                      </span>

                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${priorityBadge}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {task.notes && (
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
                  <Clock className="size-3 text-slate-500" />
                  <span>{task.dueDate}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                New Action Item
              </span>
              <h2 className="text-base font-bold text-white">
                Add Operational Task or Follow-up
              </h2>
            </div>

            <form onSubmit={handleCreateNewTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify serial barcodes for pallet 12"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Details / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional instructions, reference codes, or fulfillment notes..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Task</span>
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
