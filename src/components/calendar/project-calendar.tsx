"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Task } from "@/types";

export function ProjectCalendar({ projectId }: { projectId: string }) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => fetch(`/api/tasks?projectId=${projectId}`).then((r) => r.json()),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !calendarRef.current || tasks.length === 0) return;

    const statusColorMap: Record<string, string> = {
      TODO: "#94a3b8",
      IN_PROGRESS: "#3b82f6",
      DONE: "#22c55e",
    };

    async function initCalendar() {
      const [
        { default: FullCalendar },
        { default: dayGridPlugin },
        { default: timeGridPlugin },
        { default: interactionPlugin },
      ] = await Promise.all([
        import("@fullcalendar/react"),
        import("@fullcalendar/daygrid"),
        import("@fullcalendar/timegrid"),
        import("@fullcalendar/interaction"),
      ]);

      const events = tasks
        .filter((t) => t.dueDate || t.startDate)
        .map((t) => ({
          id: t.id,
          title: t.title,
          start: t.startDate ?? t.dueDate!,
          end: t.dueDate ?? t.startDate!,
          backgroundColor: statusColorMap[t.status] ?? "#94a3b8",
          borderColor: statusColorMap[t.status] ?? "#94a3b8",
        }));

      const { createRoot } = await import("react-dom/client");
      const { createElement } = await import("react");

      const el = calendarRef.current!;
      el.innerHTML = "";
      const root = createRoot(el);
      root.render(
        createElement(FullCalendar, {
          plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
          initialView: "dayGridMonth",
          headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          },
          events,
          locale: "id",
          height: 600,
          eventDisplay: "block",
        })
      );
    }

    initCalendar();
  }, [mounted, tasks]);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {mounted ? (
        <div ref={calendarRef} className="p-4" style={{ minHeight: "600px" }} />
      ) : (
        <div className="h-[600px] flex items-center justify-center text-muted-foreground">
          Memuat Kalender...
        </div>
      )}
    </div>
  );
}
