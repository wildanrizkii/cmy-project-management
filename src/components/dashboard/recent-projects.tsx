import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Users, ListTodo, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  _count: { tasks: number; members: number };
}

export function RecentProjects({ projects }: { projects: Project[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Proyek Terbaru</CardTitle>
        <Link
          href="/dashboard/projects"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Lihat semua <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Belum ada proyek. Buat proyek pertama Anda!
          </p>
        )}
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/projects/${project.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{project.name}</span>
                <Badge className={getStatusColor(project.status)} variant="outline">
                  {project.status === "ACTIVE" ? "Aktif" :
                   project.status === "COMPLETED" ? "Selesai" :
                   project.status === "ON_HOLD" ? "Ditunda" : "Arsip"}
                </Badge>
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground truncate">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListTodo className="h-3 w-3" /> {project._count.tasks} tugas
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {project._count.members} anggota
                </span>
                {project.endDate && (
                  <span>Selesai: {formatDate(project.endDate as string)}</span>
                )}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
