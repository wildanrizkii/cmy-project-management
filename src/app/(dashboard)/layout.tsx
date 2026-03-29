import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <main className="min-h-screen">{children}</main>
      </div>
      <CreateProjectDialog />
    </div>
  );
}
