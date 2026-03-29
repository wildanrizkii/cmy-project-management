"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { Task } from "@/types";
import { Search, Calendar, User } from "lucide-react";
import Link from "next/link";

interface TaskWithProject extends Task {
  project?: { id: string; name: string };
}

export default function AllTasksPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery<TaskWithProject[]>({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const projects = await fetch("/api/projects").then((r) => r.json());
      const allTasks = await Promise.all(
        projects.map((p: { id: string; name: string }) =>
          fetch(`/api/tasks?projectId=${p.id}`)
            .then((r) => r.json())
            .then((tasks: Task[]) => tasks.map((t) => ({ ...t, project: { id: p.id, name: p.name } })))
        )
      );
      return allTasks.flat();
    },
    enabled: !!session,
  });

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusLabel: Record<string, string> = {
    TODO: "Belum", IN_PROGRESS: "Proses", DONE: "Selesai",
  };
  const priorityLabel: Record<string, string> = {
    LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Urgent",
  };

  return (
    <div>
      <Header title="Semua Tugas" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari tugas..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="TODO">Belum</SelectItem>
              <SelectItem value="IN_PROGRESS">Proses</SelectItem>
              <SelectItem value="DONE">Selesai</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filtered.length} tugas</p>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoading && (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">Tidak ada tugas ditemukan</div>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Tugas", "Proyek", "Status", "Prioritas", "Tenggat", "Ditugaskan"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <td className="px-4 py-3 font-medium">{task.title}</td>
                    <td className="px-4 py-3">
                      {task.project && (
                        <Link
                          href={`/dashboard/projects/${task.project.id}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.project.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(task.status)} variant="outline">
                        {statusLabel[task.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {priorityLabel[task.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {task.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {task.assignee ? (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {task.assignee.name ?? task.assignee.email}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedTask && (
          <TaskDetailDialog
            task={selectedTask}
            projectId={selectedTask.projectId}
            open={!!selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
}
