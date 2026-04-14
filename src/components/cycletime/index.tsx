"use client";

import { useMemo } from "react";
import {
    ComposedChart,
    Bar,
    Line,
    ReferenceLine,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
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
    "#22c55e", // Green - Group D
    "#a855f7", // Purple - Group E
    "#ec4899", // Pink - Group F
    "#06b6d4", // Cyan - Group G
    "#f43f5e", // Rose - Group H
    "#84cc16", // Lime - Group I
    "#6366f1", // Indigo - Group J
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
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 9999, position: "relative", minWidth: "160px" }}>
                <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
                <p className="text-xs text-gray-500 mb-3">{data.assNumber}</p>

                {data.targetCt !== null && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span className="text-sm font-medium text-blue-600">
                            Target CT: {data.targetCt} s
                        </span>
                    </div>
                )}

                <div className="space-y-1">
                    {groupLabels.map((label, idx) => {
                        const value = data[`group_${label}`];
                        if (value === null || value === undefined) return null;
                        return (
                            <div key={label} className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: getGroupColor(idx) }}
                                ></span>
                                <span className="text-sm text-gray-700">
                                    Group {label}: {value} s
                                </span>
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

    // Use first non-null targetCt as the reference line value
    const targetCtValue = useMemo(() => {
        const vals = projects.map((p) => p.targetCt).filter((v): v is number => v !== null && v !== undefined);
        if (!vals.length) return null;
        return vals[0];
    }, [projects]);

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                    Cycle Time
                </h3>
                <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
                    No cycle time data for the selected filter
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
                Cycle Time
            </h3>

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
                            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                        />
                    ) : (
                        targetCtValue !== null && (
                            <ReferenceLine
                                y={targetCtValue}
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                strokeDasharray="6 3"
                                label={{ value: `Target: ${targetCtValue}s`, position: "insideTopRight", fill: "#3b82f6", fontSize: 11, fontWeight: "bold" }}
                            />
                        )
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}