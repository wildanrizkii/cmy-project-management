import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ATASAN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, role, department, password } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (department !== undefined) updateData.department = department || null;
  if (password) {
    if (password.length < 8) {
      return Response.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
  });

  return Response.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ATASAN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return Response.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return Response.json({ success: true });
}
