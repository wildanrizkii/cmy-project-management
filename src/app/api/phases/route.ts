import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPhaseSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const phases = await db.phase.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      project: { OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }] },
    },
    include: { tasks: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(phases);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createPhaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const member = await db.member.findFirst({
    where: { projectId: parsed.data.projectId, userId: session.user.id },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const phase = await db.phase.create({
    data: {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    },
  });

  return NextResponse.json(phase, { status: 201 });
}
