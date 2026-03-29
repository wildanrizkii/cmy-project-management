import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { email, role = "MEMBER" } = await req.json();

  const isLeader = await db.member.findFirst({
    where: { projectId, userId: session.user.id, role: "LEADER" },
  });
  if (!isLeader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userToAdd = await db.user.findUnique({ where: { email } });
  if (!userToAdd) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

  const existing = await db.member.findFirst({ where: { projectId, userId: userToAdd.id } });
  if (existing) return NextResponse.json({ error: "Sudah menjadi anggota" }, { status: 409 });

  const member = await db.member.create({
    data: { projectId, userId: userToAdd.id, role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { userId } = await req.json();

  const isLeader = await db.member.findFirst({
    where: { projectId, userId: session.user.id, role: "LEADER" },
  });
  if (!isLeader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.member.deleteMany({ where: { projectId, userId } });
  return NextResponse.json({ success: true });
}
