import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, currentPassword, newPassword } = body;

  if (!name || name.trim().length < 2) {
    return Response.json({ error: "Nama minimal 2 karakter" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { name: name.trim() };

  if (newPassword) {
    if (newPassword.length < 8) {
      return Response.json({ error: "Password baru minimal 8 karakter" }, { status: 400 });
    }
    if (!currentPassword) {
      return Response.json({ error: "Masukkan password saat ini" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.password) return Response.json({ error: "User tidak ditemukan" }, { status: 404 });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return Response.json({ error: "Password saat ini salah" }, { status: 400 });

    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, department: true },
  });

  return Response.json(updated);
}
