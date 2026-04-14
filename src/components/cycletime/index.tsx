"use client";

import { useMemo } from "react";
import {
    ComposedChart,
    Bar,
    Line,
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
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
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

    if (projects.length === 0 || allGroupLabels.length === 0) {
        return null;
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

                    <Tooltip content={<CustomTooltip />} />

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
                            name={`Cycle time Actual/group ${label}`}
                            fill={getGroupColor(index)}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    ))}

                    <Line
                        type="monotone"
                        dataKey="targetCt"
                        name="Cycle time Target"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}