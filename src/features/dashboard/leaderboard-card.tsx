"use client";

import React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import type { PerformerBarItem } from "./leaderboard-service";

interface LeaderboardCardProps {
  title: string;
  items: PerformerBarItem[];
  formatINR: (val: number) => string;
  configHref?: string;
}

export function LeaderboardCard({
  title,
  items,
  formatINR,
  configHref,
}: LeaderboardCardProps) {
  // Determine nice Y-axis max tick based on actual collections
  const rawMax = Math.max(...items.map((i) => i.achievedAmount), 10000);
  let topTick = 100000;
  let step = 20000;

  if (rawMax > 150000) {
    step = Math.ceil(rawMax / 5 / 20000) * 20000;
    topTick = step * 5;
  } else if (rawMax > 100000) {
    step = 30000;
    topTick = 150000;
  } else if (rawMax > 60000) {
    step = 20000;
    topTick = 100000;
  } else if (rawMax > 30000) {
    step = 15000;
    topTick = 75000;
  } else if (rawMax > 15000) {
    step = 6000;
    topTick = 30000;
  } else {
    step = 4000;
    topTick = 20000;
  }

  const yTicks: number[] = [];
  for (let t = topTick; t >= 0; t -= step) {
    yTicks.push(t);
  }

  return (
    <Card className="p-5 sm:p-6 bg-white dark:bg-[#0c1322]/70 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl relative shadow-sm min-w-0 flex flex-col justify-between">
      {/* Card Header with Centered Title & Top-Right Menu Icon matching image_8803c9.png */}
      <div className="relative mb-5">
        <h4 className="text-center text-sm font-semibold text-slate-800 dark:text-slate-200 truncate px-8">
          {title}
        </h4>
        {configHref ? (
          <Link
            href={configHref}
            title="Configure Leaderboard Graphs"
            className="absolute top-0 right-0 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <Menu className="size-4" />
          </Link>
        ) : (
          <div
            className="absolute top-0 right-0 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
            title="Options"
          >
            <Menu className="size-4" />
          </div>
        )}
      </div>

      {/* Card Body */}
      {items.length === 0 ? (
        <div className="h-52 sm:h-56 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <p className="text-xs font-semibold">No performance records in this cohort yet.</p>
          <span className="text-[11px] text-slate-500 mt-1">
            Metrics will appear automatically as operators handle leads and record collections.
          </span>
        </div>
      ) : (
        <div className="flex flex-col justify-between h-52 sm:h-56 w-full">
          {/* Plot Area with Y-Axis Column and Bars */}
          <div className="flex flex-1 min-h-0 w-full">
            {/* Left Y-Axis Numeric Ticks */}
            <div className="w-12 sm:w-16 flex flex-col justify-between items-end pr-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono select-none py-[1px] shrink-0">
              {yTicks.map((val, idx) => (
                <span key={idx} className="leading-none">
                  {val >= 100000 ? `${val}` : val >= 1000 ? `${val}` : val}
                </span>
              ))}
            </div>

            {/* Right Plot Area with Grid Lines */}
            <div className="relative flex-1 h-full flex flex-col justify-between border-l border-slate-200/70 dark:border-white/[0.08] min-w-0">
              {/* Background Grid Lines */}
              {yTicks.map((val, idx) => (
                <div
                  key={idx}
                  className={`w-full ${
                    val === 0
                      ? "border-b border-slate-300 dark:border-white/[0.15]"
                      : "border-b border-slate-100 dark:border-white/[0.04]"
                  }`}
                  style={{
                    height: idx === yTicks.length - 1 ? 0 : `${100 / (yTicks.length - 1)}%`,
                  }}
                />
              ))}

              {/* Vertical Bars Layer */}
              <div className="absolute inset-0 flex items-end justify-around px-2 pb-[1px] pointer-events-auto gap-2">
                {items.map((item) => {
                  const barHeightPercent =
                    topTick > 0
                      ? Math.min(100, Math.round((item.achievedAmount / topTick) * 100))
                      : 0;

                  return (
                    <div
                      key={item.id}
                      className="relative group flex flex-col items-center flex-1 min-w-0 h-full justify-end"
                    >
                      {/* Interactive Hover Tooltip */}
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-slate-900/95 text-white text-[10px] font-mono py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap space-y-0.5 border border-white/10 backdrop-blur-md">
                        <div className="font-bold text-[#60A5FA]">{item.name}</div>
                        {item.profileName && (
                          <div className="text-[9px] text-slate-400">{item.profileName}</div>
                        )}
                        <div className="text-emerald-400">
                          Achieved: ₹{formatINR(item.achievedAmount)} / Target: ₹{formatINR(item.targetAmount)} ({item.achievementPercent}%)
                        </div>
                        <div className="text-slate-300 text-[9px]">Leads Handled: {item.leadsHandled}</div>
                      </div>

                      {/* Solid #4F6DF5 Vertical Bar matching image_8803c9.png */}
                      <div
                        className="w-full max-w-[44px] sm:max-w-[64px] bg-[#4F6DF5] hover:bg-[#3D5CE5] transition-all duration-300 rounded-t-[3px] cursor-pointer shadow-sm"
                        style={{
                          height: `${barHeightPercent}%`,
                          minHeight: item.achievedAmount > 0 ? "4px" : "0px",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dedicated X-Axis Labels Row with Clean Inline "Name - XX%" Format */}
          <div className="flex pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
            <div className="w-12 sm:w-16 shrink-0" />
            <div className="flex-1 min-w-0 flex items-start justify-around px-2 gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex-1 min-w-0 text-center px-0.5"
                  title={`${item.name} - ${item.achievementPercent}%`}
                >
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate block">
                    {item.name} - {item.achievementPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
