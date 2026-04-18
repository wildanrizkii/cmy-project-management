import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const fase = searchParams.get("fase");
  const isDone = searchParams.get("isDone");
  const search = searchParams.get("search");
  const parentOnly = searchParams.get("parentOnly"); // only top-level
  const projectStatus = searchParams.get("projectStatus");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (fase) where.projectFase = { fase };
  if (isDone !== null && isDone !== "") where.isDone = isDone === "true";
  if (parentOnly === "true") where.parentSubFaseId = null;
  if (projectStatus) where.project = { status: projectStatus };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { pic: { name: { contains: search, mode: "insensitive" } } },
      { project: { assNumber: { contains: search, mode: "insensitive" } } },
      { project: { assName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const items = await db.subFase.findMany({
    where,
    include: {
      project: { select: { id: true, assNumber: true, assName: true, customer: true } },
      projectFase: { select: { id: true, fase: true } },
      pic: { select: { id: true, name: true } },
      parentSubFase: { select: { id: true, name: true } },
    },
    orderBy: [{ picTargetDate: "asc" }, { createdAt: "desc" }],
  });

  return Response.json(items);
}
