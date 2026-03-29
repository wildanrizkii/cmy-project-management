import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await db.task.findFirst({
    where: {
      id,
      project: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      phase: true,
      subtasks: true,
      attachments: true,
      comments: true,
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = await db.task.findFirst({
    where: {
      id,
      project: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.task.update({
    where: { id },
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      phase: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await db.task.findFirst({
    where: {
      id,
      project: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
