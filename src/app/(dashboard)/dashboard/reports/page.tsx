import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const projects = await db.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      tasks: {
        select: { status: true, priority: true, dueDate: true, progress: true },
      },
      members: true,
      _count: { select: { tasks: true, members: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Header title="Laporan" />
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Laporan Proyek</h2>
          <p className="text-sm text-muted-foreground">
            Analisis dan ekspor data proyek dalam format XLSX atau PDF.
          </p>
        </div>
        <ReportsClient projects={projects as Parameters<typeof ReportsClient>[0]["projects"]} />
      </div>
    </div>
  );
}
