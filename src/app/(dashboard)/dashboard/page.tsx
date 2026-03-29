import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/header";
import { DashboardStats } from "@/components/dashboard/stats";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { TaskStatusChart } from "@/components/dashboard/task-status-chart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [projects, tasks] = await Promise.all([
    db.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: { _count: { select: { tasks: true, members: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.task.findMany({
      where: {
        project: {
          OR: [
            { ownerId: session.user.id },
            { members: { some: { userId: session.user.id } } },
          ],
        },
      },
      select: { status: true },
    }),
  ]);

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "TODO").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Selamat datang, {session.user.name?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Berikut ringkasan aktivitas proyek Anda.
          </p>
        </div>

        <DashboardStats
          totalProjects={projects.length}
          taskStats={taskStats}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentProjects projects={projects as Parameters<typeof RecentProjects>[0]["projects"]} />
          </div>
          <div>
            <TaskStatusChart taskStats={taskStats} />
          </div>
        </div>
      </div>
    </div>
  );
}
