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
  const { status, title, description, subFaseId } = body;

  const item = await db.hinanhyoDR.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  const updated = await db.hinanhyoDR.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(subFaseId !== undefined && { subFaseId: subFaseId || null }),
    },
    include: {
      subFase: { select: { id: true, name: true } },
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

  const item = await db.hinanhyoDR.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  await db.hinanhyoDR.delete({ where: { id } });
  return Response.json({ message: "Deleted successfully" });
}
