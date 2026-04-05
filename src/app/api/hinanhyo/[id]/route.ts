import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, title, description } = body;

  const item = await db.hinanhyoDR.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!item) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (session.user.role === "BAWAHAN" && item.project.picId !== session.user.id) {
    return Response.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  const updated = await db.hinanhyoDR.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    },
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const item = await db.hinanhyoDR.findUnique({
    where: { id },
    include: { project: true },
  });

  if (!item) return Response.json({ error: "Tidak ditemukan" }, { status: 404 });

  if (session.user.role === "BAWAHAN" && item.project.picId !== session.user.id) {
    return Response.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  await db.hinanhyoDR.delete({ where: { id } });
  return Response.json({ message: "Berhasil dihapus" });
}
