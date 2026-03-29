"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  taskStats: { total: number; todo: number; inProgress: number; done: number };
}

const COLORS = ["#94a3b8", "#3b82f6", "#22c55e"];

export function TaskStatusChart({ taskStats }: Props) {
  const data = [
    { name: "Belum", value: taskStats.todo },
    { name: "Proses", value: taskStats.inProgress },
    { name: "Selesai", value: taskStats.done },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status Tugas</CardTitle>
      </CardHeader>
      <CardContent>
        {taskStats.total === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Belum ada tugas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} tugas`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
