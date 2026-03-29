"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, getPriorityColor, getStatusColor } from "@/lib/utils";
import { Calendar, User, Trash2, Edit } from "lucide-react";

interface Props {
  task: Task;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailDialog({ task, projectId, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const statusLabel: Record<string, string> = {
    TODO: "Belum", IN_PROGRESS: "Proses", DONE: "Selesai",
  };
  const priorityLabel: Record<string, string> = {
    LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Urgent",
  };

  async function handleStatusChange(status: string) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    onClose();
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getStatusColor(task.status)} variant="outline">
              {statusLabel[task.status]}
            </Badge>
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {priorityLabel[task.priority]}
            </Badge>
            {task.phase && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {task.phase.name}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.startDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tanggal Mulai</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(task.startDate)}</span>
                </div>
              </div>
            )}
            {task.dueDate && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tenggat</p>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              </div>
            )}
            {task.assignee && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ditugaskan ke</p>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{task.assignee.name ?? task.assignee.email}</span>
                </div>
              </div>
            )}
          </div>

          {task.progress > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Ubah Status
            </p>
            <Select defaultValue={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">Belum Dikerjakan</SelectItem>
                <SelectItem value="IN_PROGRESS">Sedang Berjalan</SelectItem>
                <SelectItem value="DONE">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Dibuat: {formatDate(task.createdAt)}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
