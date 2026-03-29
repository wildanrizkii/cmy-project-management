"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import { Task, TaskStatus, KanbanColumn } from "@/types";
import { KanbanCard } from "./kanban-card";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "TODO", title: "Belum Dikerjakan", color: "bg-slate-100" },
  { id: "IN_PROGRESS", title: "Sedang Berjalan", color: "bg-blue-50" },
  { id: "DONE", title: "Selesai", color: "bg-green-50" },
];

export function KanbanBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("TODO");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then((r) => r.json()),
  });

  const columns: KanbanColumn[] = COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    tasks: tasks.filter((t) => t.status === col.id),
  }));

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic update
    queryClient.setQueryData<Task[]>(["tasks", projectId], (old = []) =>
      old.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    await fetch(`/api/tasks/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
          {COLUMNS.map((col) => {
            const column = columns.find((c) => c.id === col.id)!;
            return (
              <div key={col.id} className={`rounded-xl ${col.color} p-3`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{col.title}</span>
                    <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium text-muted-foreground">
                      {column.tasks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setDefaultStatus(col.id);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? "bg-white/60" : ""
                      }`}
                    >
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? "opacity-80" : ""}
                            >
                              <KanbanCard task={task} projectId={projectId} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <CreateTaskDialog
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultStatus={defaultStatus}
      />
    </>
  );
}
