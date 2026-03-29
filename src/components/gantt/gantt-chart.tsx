"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task, Phase } from "@/types";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Plus } from "lucide-react";
import type { GanttStatic } from "dhtmlx-gantt";

export function GanttChart({ projectId }: { projectId: string }) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<GanttStatic | null>(null);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then((r) => r.json()),
  });

  const { data: phases = [] } = useQuery<Phase[]>({
    queryKey: ["phases", projectId],
    queryFn: () => fetch(`/api/phases?projectId=${projectId}`).then((r) => r.json()),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !ganttRef.current) return;

    async function initGantt() {
      const { gantt } = await import("dhtmlx-gantt");
      await import("dhtmlx-gantt/codebase/dhtmlxgantt.css");

      gantt.config.date_format = "%Y-%m-%d";
      gantt.config.row_height = 38;
      gantt.config.bar_height = 22;
      gantt.config.scale_height = 54;
      gantt.config.readonly = false;
      gantt.config.drag_progress = true;

      gantt.config.columns = [
        { name: "text", label: "Tugas", width: 220, tree: true },
        { name: "start_date", label: "Mulai", width: 100, align: "center" },
        { name: "duration", label: "Durasi", width: 70, align: "center" },
        {
          name: "progress", label: "%", width: 60, align: "center",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          template: (task: any) => `${Math.round((task.progress ?? 0) * 100)}%`,
        },
      ];

      gantt.attachEvent("onAfterTaskUpdate", async (
        id: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        task: any
      ) => {
        await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.text,
            progress: Math.round(task.progress * 100),
            startDate: task.start_date instanceof Date
              ? task.start_date.toISOString().split("T")[0]
              : task.start_date,
            duration: task.duration,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        return true;
      });

      gantt.init(ganttRef.current!);
      ganttInstance.current = gantt;
    }

    initGantt();

    return () => {
      if (ganttInstance.current) {
        ganttInstance.current.destructor();
      }
    };
  }, [mounted, projectId, queryClient]);

  function buildGanttData(tasks: Task[], phases: Phase[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ganttTasks: any[] = [];

    for (const phase of phases) {
      ganttTasks.push({
        id: `phase_${phase.id}`,
        text: phase.name,
        start_date: phase.startDate
          ? new Date(phase.startDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        duration: phase.endDate
          ? Math.max(1, Math.ceil(
              (new Date(phase.endDate).getTime() - new Date(phase.startDate ?? new Date()).getTime()) /
                (1000 * 60 * 60 * 24)
            ))
          : 7,
        progress: 0,
        type: "project",
        open: true,
      });
    }

    for (const task of tasks) {
      const start = task.startDate ?? task.dueDate ?? new Date().toISOString();
      ganttTasks.push({
        id: task.id,
        text: task.title,
        start_date: new Date(start).toISOString().split("T")[0],
        duration: task.duration ?? 1,
        progress: (task.progress ?? 0) / 100,
        parent: task.phaseId ? `phase_${task.phaseId}` : 0,
      });
    }

    return ganttTasks;
  }

  useEffect(() => {
    if (ganttInstance.current) {
      ganttInstance.current.clearAll();
      ganttInstance.current.parse({ data: buildGanttData(tasks, phases), links: [] });
    }
  }, [tasks, phases]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag bar untuk mengubah jadwal, drag ujung bar untuk mengubah durasi.
        </p>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4" /> Tambah Tugas
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        {mounted ? (
          <div ref={ganttRef} style={{ width: "100%", height: "500px" }} />
        ) : (
          <div className="h-[500px] flex items-center justify-center text-muted-foreground">
            Memuat Gantt Chart...
          </div>
        )}
      </div>

      <CreateTaskDialog
        projectId={projectId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
