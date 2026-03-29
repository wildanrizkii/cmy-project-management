import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTaskSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const phaseId = searchParams.get("phaseId");

  const tasks = await db.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(phaseId ? { phaseId } : {}),
      project: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      parentId: null, // top-level only by default
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      phase: true,
      subtasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const member = await db.member.findFirst({
    where: { projectId: parsed.data.projectId, userId: session.user.id },
  });
  if (!member) return NextResponse.json({ error: "Not a member of this project" }, { status: 403 });

  const task = await db.task.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      createdById: session.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      phase: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
