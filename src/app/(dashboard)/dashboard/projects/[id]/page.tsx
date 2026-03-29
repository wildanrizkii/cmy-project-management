"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { GanttChart } from "@/components/gantt/gantt-chart";
import { ProjectCalendar } from "@/components/calendar/project-calendar";
import { TaskList } from "@/components/tasks/task-list";
import { ProjectMembers } from "@/components/projects/project-members";
import { getStatusColor } from "@/lib/utils";
import { Project } from "@/types";
import { LayoutGrid, GanttChartSquare, Calendar, List, Users } from "lucide-react";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => fetch(`/api/projects/${id}`).then((r) => r.json()),
  });

  const statusLabel: Record<string, string> = {
    ACTIVE: "Aktif", COMPLETED: "Selesai", ON_HOLD: "Ditunda", ARCHIVED: "Arsip",
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div>
      <Header />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={getStatusColor(project.status)} variant="outline">
                {statusLabel[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <Tabs defaultValue="kanban">
          <TabsList className="mb-6">
            <TabsTrigger value="kanban" className="flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-1.5">
              <GanttChartSquare className="h-4 w-4" /> Gantt
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5">
              <List className="h-4 w-4" /> Daftar
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Kalender
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Anggota
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <KanbanBoard projectId={id} />
          </TabsContent>
          <TabsContent value="gantt">
            <GanttChart projectId={id} />
          </TabsContent>
          <TabsContent value="list">
            <TaskList projectId={id} />
          </TabsContent>
          <TabsContent value="calendar">
            <ProjectCalendar projectId={id} />
          </TabsContent>
          <TabsContent value="members">
            <ProjectMembers project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
