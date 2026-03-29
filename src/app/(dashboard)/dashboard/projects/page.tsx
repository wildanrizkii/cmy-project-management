"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Project } from "@/types";
import { Plus, FolderKanban, Users, ListTodo, Calendar } from "lucide-react";

export default function ProjectsPage() {
  const { data: session } = useSession();
  const { setCreateProjectOpen } = useAppStore();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
    enabled: !!session,
  });

  const statusLabel: Record<string, string> = {
    ACTIVE: "Aktif", COMPLETED: "Selesai", ON_HOLD: "Ditunda", ARCHIVED: "Arsip",
  };

  return (
    <div>
      <Header title="Proyek" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Semua Proyek</h2>
            <p className="text-sm text-muted-foreground">{projects?.length ?? 0} proyek ditemukan</p>
          </div>
          <Button onClick={() => setCreateProjectOpen(true)}>
            <Plus className="h-4 w-4" /> Proyek Baru
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && projects?.length === 0 && (
          <div className="text-center py-24">
            <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Belum ada proyek</h3>
            <p className="text-muted-foreground mb-4">Buat proyek pertama Anda untuk mulai.</p>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="h-4 w-4" /> Buat Proyek
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      {statusLabel[project.status]}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1 truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                    <span className="flex items-center gap-1">
                      <ListTodo className="h-3 w-3" />
                      {project._count?.tasks ?? 0} tugas
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project._count?.members ?? 0} anggota
                    </span>
                    {project.endDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.endDate)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
