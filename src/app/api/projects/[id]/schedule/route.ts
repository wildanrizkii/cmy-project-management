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
  const revisions = await db.customerScheduleRevision.findMany({
    where: { projectId: id },
    orderBy: { revisionDate: "asc" },
  });
  return Response.json(revisions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const body = await req.json();
  const { revisionDate, rfqDate, dieGoDate, pp1Date, pp2Date, pp3Date, mpDate, notes } = body;

  if (!revisionDate) return Response.json({ error: "revisionDate is required" }, { status: 400 });

  const revision = await db.customerScheduleRevision.create({
    data: {
      projectId: id,
      revisionDate: new Date(revisionDate),
      rfqDate: rfqDate ? new Date(rfqDate) : null,
      dieGoDate: dieGoDate ? new Date(dieGoDate) : null,
      pp1Date: pp1Date ? new Date(pp1Date) : null,
      pp2Date: pp2Date ? new Date(pp2Date) : null,
      pp3Date: pp3Date ? new Date(pp3Date) : null,
      mpDate: mpDate ? new Date(mpDate) : null,
      notes: notes || null,
    },
  });

  return Response.json(revision, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { searchParams } = new URL(req.url);
  const revisionId = searchParams.get("revisionId");
  if (!revisionId) return Response.json({ error: "revisionId is required" }, { status: 400 });

  const revision = await db.customerScheduleRevision.findFirst({ where: { id: revisionId, projectId } });
  if (!revision) return Response.json({ error: "Revision not found" }, { status: 404 });

  await db.customerScheduleRevision.delete({ where: { id: revisionId } });
  return Response.json({ message: "Deleted" });
}
