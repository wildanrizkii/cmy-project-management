"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Rectangle,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BarShapeProps } from "recharts";
import type { Project } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CtGroup = { group: string; value: number | null };

type ChartData = {
  name: string;
  assNumber: string;
  targetCt: number | null;
  [key: string]: string | number | null;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ChartData;
  }>;
};

type XAxisTickProps = {
  x: number;
  y: number;
  payload: {
    value: string;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGroups(aktualCt: unknown): CtGroup[] {
  if (!Array.isArray(aktualCt)) return [];
  return aktualCt as CtGroup[];
}

const GROUP_COLORS = [
  "#f97316", // Orange - Group A
  "#9ca3af", // Gray - Group B
  "#eab308", // Yellow - Group C
  "#a855f7", // Purple - Group D
  "#ec4899", // Pink - Group E
  "#06b6d4", // Cyan - Group F
  "#f43f5e", // Rose - Group G
  "#84cc16", // Lime - Group H
  "#6366f1", // Indigo - Group I
  "#14b8a6", // Teal - Group J
];

function getGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

// ─── Components (Defined Outside Main Component) ───────────────────────────────

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const groupLabels = Object.keys(data)
      .filter((key) => key.startsWith("group_"))
      .map((key) => key.replace("group_", ""))
      .sort();

    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          zIndex: 9999,
          position: "relative",
          minWidth: "180px",
        }}
      >
        <p style={{ fontWeight: 600, color: "#111827", marginBottom: "2px", fontSize: "14px" }}>{data.name}</p>
        <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>{data.assNumber}</p>

        {data.targetCt !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "inline-block" }}></span>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#2563eb" }}>
              Target CT: {data.targetCt}
            </span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {groupLabels.map((label, idx) => {
            const value = data[`group_${label}`];
            if (value === null || value === undefined) return null;
            const target = data.targetCt as number | null;
            const diff = target !== null ? (value as number) - target : null;
            const meeting = diff !== null && diff >= 0;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "11px", height: "11px", borderRadius: "2px", backgroundColor: getGroupColor(idx), display: "inline-block" }}></span>
                  <span style={{ fontSize: "13px", color: "#374151" }}>Group {label}: {value}</span>
                </div>
                {diff !== null && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: meeting ? "#16a34a" : "#dc2626" }}>
                    {meeting ? `✓ +${diff.toFixed(1)}` : `⚠ -${Math.abs(diff).toFixed(1)}`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

function CustomXAxisTick({ x, y, payload }: XAxisTickProps) {
  const text = payload.value;
  const truncated = text.length > 12 ? text.substring(0, 12) + "..." : text;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        transform="rotate(-35)"
        className="fill-gray-600 text-xs"
      >
        {truncated}
      </text>
    </g>
  );
}

// ─── Main Chart Component ─────────────────────────────────────────────────────

interface CycleTimeChartProps {
  projects: Project[];
  height?: number;
}

export function CycleTimeChart({ projects, height = 400 }: CycleTimeChartProps) {
  const allGroupLabels = useMemo(() => {
    const labels = new Set<string>();
    projects.forEach((p) => {
      const groups = parseGroups(p.aktualCt);
      groups.forEach((g) => labels.add(g.group));
    });
    return Array.from(labels).sort();
  }, [projects]);

  const chartData: ChartData[] = useMemo(() => {
    return projects.map((p) => {
      const groups = parseGroups(p.aktualCt);
      const row: ChartData = {
        name: p.assName,
        assNumber: p.assNumber,
        targetCt: p.targetCt,
      };
      allGroupLabels.forEach((label) => {
        const group = groups.find((g) => g.group === label);
        row[`group_${label}`] = group?.value ?? null;
      });
      return row;
    });
  }, [projects, allGroupLabels]);

  const targetCtValue = useMemo(() => {
    const vals = projects
      .map((p) => p.targetCt)
      .filter((v): v is number => v !== null && v !== undefined);
    if (!vals.length) return null;
    return vals[0];
  }, [projects]);

  // Summary stats: how many projects have all groups meeting target
  const summaryStats = useMemo(() => {
    const withData = chartData.filter((d) =>
      allGroupLabels.some((l) => d[`group_${l}`] !== null)
    );
    const hasTarget = withData.some((d) => d.targetCt !== null);
    const meeting = withData.filter((d) => {
      if (d.targetCt === null) return false;
      const vals = allGroupLabels
        .map((l) => d[`group_${l}`] as number | null)
        .filter((v): v is number => v !== null);
      return vals.length > 0 && vals.every((v) => v >= (d.targetCt as number));
    }).length;
    return { total: withData.length, meeting, hasTarget };
  }, [chartData, allGroupLabels]);

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
          Cycle Time
        </h3>
        <div
          className="flex items-center justify-center text-gray-400 text-sm"
          style={{ height }}
        >
          No cycle time data for the selected filter
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
        Cycle Time
      </h3>

      {/* Summary stats row */}
      {summaryStats.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>
              <span className="font-semibold text-gray-700">{summaryStats.total}</span> project(s) with CT data
            </span>
            {summaryStats.hasTarget && (
              <>
                <span className="text-gray-300">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block"></span>
                  <span className="font-semibold text-green-700">{summaryStats.meeting}</span> reaching target
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span>
                  <span className="font-semibold text-red-600">{summaryStats.total - summaryStats.meeting}</span> below target
                </span>
              </>
            )}
          </div>
          {summaryStats.hasTarget && (
            <span className="text-xs text-gray-400">
              <span className="text-green-600 font-medium">■</span> ≥ target &nbsp;
              <span className="text-red-500 font-medium">■</span> &lt; target
            </span>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="assNumber"
            tick={<CustomXAxisTick {...({} as XAxisTickProps)} />}
            interval={0}
            height={70}
            axisLine={{ stroke: "#9ca3af" }}
          />

          <YAxis
            axisLine={{ stroke: "#9ca3af" }}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            label={{ value: "CT", angle: -90, position: "insideLeft", offset: 10, fill: "#9ca3af", fontSize: 11 }}
          />

          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 9999, outline: "none" }}
          />

          <Legend
            verticalAlign="bottom"
            height={50}
            iconType="square"
            wrapperStyle={{ paddingTop: "20px" }}
          />

          {allGroupLabels.map((label, index) => (
            <Bar
              key={label}
              dataKey={`group_${label}`}
              name={`Group ${label}`}
              fill={getGroupColor(index)}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
              shape={(props: BarShapeProps) => {
                const entry = props.payload as ChartData;
                const val = entry[`group_${label}`] as number | null;
                const target = entry.targetCt;
                const fill =
                  val !== null && target !== null
                    ? val >= target ? "#22c55e" : "#ef4444"
                    : getGroupColor(index);
                return <Rectangle {...props} fill={fill} />;
              }}
            />
          ))}

          {projects.length > 1 ? (
            <Line
              type="monotone"
              dataKey="targetCt"
              name="Target CT"
              stroke="#3b82f6"
              strokeWidth={3}
              connectNulls={true}
              isAnimationActive={false}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
            />
          ) : targetCtValue !== null ? (
            <ReferenceLine
              y={targetCtValue}
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              label={{
                value: `Target: ${targetCtValue}`,
                position: "insideTopRight",
                fill: "#3b82f6",
                fontSize: 11,
                fontWeight: "bold",
              }}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
