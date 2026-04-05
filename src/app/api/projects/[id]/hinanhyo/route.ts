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

  const items = await db.hinanhyoDR.findMany({
    where: { projectId: id },
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await db.project.findUnique({ where: { id: id } });
  if (!project) return Response.json({ error: "Proyek tidak ditemukan" }, { status: 404 });

  // Only PIC or Atasan can add
  if (session.user.role === "BAWAHAN" && project.picId !== session.user.id) {
    return Response.json({ error: "Tidak memiliki akses" }, { status: 403 });
  }

  const body = await req.json();
  const { type, title, description, status } = body;

  if (!type || !title) {
    return Response.json({ error: "Type dan title wajib diisi" }, { status: 400 });
  }

  const item = await db.hinanhyoDR.create({
    data: {
      projectId: id,
      type,
      title,
      description: description || null,
      status: status || "PENDING",
      picId: project.picId,
    },
    include: {
      pic: { select: { id: true, name: true, email: true, role: true, department: true, createdAt: true } },
    },
  });

  await db.activityLog.create({
    data: {
      projectId: id,
      userId: session.user.id,
      action: `Tambah ${type === "HINANHYO" ? "Hinanhyo" : "Design Review"}`,
      detail: `Ditambahkan: ${title}`,
    },
  });

  return Response.json(item, { status: 201 });
}
