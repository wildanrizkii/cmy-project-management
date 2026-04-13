import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, department, password } = body;

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (email) {
    const existing = await db.user.findFirst({ where: { email, NOT: { id } } });
    if (existing) return Response.json({ error: "Email already used by another user" }, { status: 409 });
    updateData.email = email;
  }
  if (role) updateData.role = role;
  if (department !== undefined) updateData.department = department || null;
  if (password) {
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
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
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  if (id === session.user.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return Response.json({ success: true });
}
