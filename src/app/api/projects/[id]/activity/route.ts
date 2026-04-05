import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const logs = await db.activityLog.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(logs);
}
