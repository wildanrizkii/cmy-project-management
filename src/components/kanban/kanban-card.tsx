"use client";

import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatDate, getPriorityColor } from "@/lib/utils";
import { Calendar, User, Paperclip } from "lucide-react";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { useState } from "react";

export function KanbanCard({ task, projectId }: { task: Task; projectId: string }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const priorityLabel: Record<string, string> = {
    LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi", URGENT: "Urgent",
  };

  return (
    <>
      <div
        className="bg-white rounded-lg p-3 shadow-sm border border-border/50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDetailOpen(true)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
          <Badge className={`${getPriorityColor(task.priority)} text-xs shrink-0`} variant="outline">
            {priorityLabel[task.priority]}
          </Badge>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
        )}

        {task.progress > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1 ml-auto">
              <User className="h-3 w-3" />
              {task.assignee.name?.split(" ")[0]}
            </span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {task.subtasks.filter((s) => s.status === "DONE").length}/{task.subtasks.length}
            </span>
          )}
        </div>
      </div>

      <TaskDetailDialog
        task={task}
        projectId={projectId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}
