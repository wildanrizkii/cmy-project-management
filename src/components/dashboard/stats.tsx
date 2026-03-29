import { Card, CardContent } from "@/components/ui/card";
import { FolderKanban, ListTodo, CheckCircle, Clock } from "lucide-react";

interface StatsProps {
  totalProjects: number;
  taskStats: { total: number; todo: number; inProgress: number; done: number };
}

export function DashboardStats({ totalProjects, taskStats }: StatsProps) {
  const stats = [
    {
      label: "Total Proyek",
      value: totalProjects,
      icon: FolderKanban,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Tugas",
      value: taskStats.total,
      icon: ListTodo,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Sedang Berjalan",
      value: taskStats.inProgress,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Selesai",
      value: taskStats.done,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
