"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";

interface DashboardChartsProps {
  taskData: {
    day: string;
    thisWeek: number;
    prevWeek: number;
  }[];
  hoursData: {
    day: string;
    hours: number;
  }[];
}

export default function DashboardCharts({ taskData, hoursData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Task Completion Comparison */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Task Completion Comparison</h3>
          <p className="text-[11px] text-muted-foreground">
            Tasks finalized daily compared to the previous week.
          </p>
        </div>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "var(--foreground)"
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px" }} />
              <Bar name="This Week" dataKey="thisWeek" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar name="Previous Week" dataKey="prevWeek" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={28} className="dark:fill-slate-800" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Work Hours Variance */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">Work Hours Logged</h3>
          <p className="text-[11px] text-muted-foreground">
            Daily logged work hours trend.
          </p>
        </div>
        <div className="h-64 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hoursData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "var(--foreground)"
                }}
              />
              <Area
                type="monotone"
                name="Work Hours"
                dataKey="hours"
                stroke="#ec4899"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#hoursGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
