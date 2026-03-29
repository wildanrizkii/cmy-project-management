"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusColor, getPriorityColor } from "@/lib/utils";
import { CreateTaskDialog } from "./create-task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { Plus, Calendar, User } from "lucide-react";

export function TaskList({ projectId }: { projectId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then((r) => r.json()),
  });

  const statusLabel: Record<string, string> = {
    TODO: "Belum", IN_PROGRESS: "Proses", DONE: "Selesai",
  };
  const priorityLabel: Record<string, string> = {
    LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Urgent",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} tugas</p>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Tambah Tugas
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-3">Belum ada tugas</p>
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Buat tugas pertama
            </Button>
          </div>
        )}

        {tasks.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tugas</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prioritas</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tenggat</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ditugaskan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTask(task)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {task.description}
                      </p>
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
                  <td className="px-4 py-3">
                    {task.dueDate ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(task.dueDate)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <span className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {task.assignee.name?.[0] ?? task.assignee.email[0]}
                        </div>
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {task.assignee.name ?? task.assignee.email}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> -
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{task.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectId={projectId}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
