import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filterLeaderId = searchParams.get("leaderId") ?? "";
  const filterPicId = searchParams.get("picId") ?? "";
  const filterFase = searchParams.get("fase") ?? "";
  const filterStatus = searchParams.get("status") ?? "";

  const now = new Date();

  const subFases = await db.subFase.findMany({
    include: {
      pic: { select: { id: true, name: true, email: true } },
      projectFase: { select: { fase: true } },
    },
    orderBy: { picTargetDate: "asc" },
  });

  // Get project info for each subfase
  const projectIds = [...new Set(subFases.map((sf) => sf.projectId))];
  const projects = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, assNumber: true, assName: true, customer: true, projectLeaderId: true },
  });
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  type CalendarEvent = {
    id: string;
    subFaseId: string;
    subFaseName: string;
    projectId: string;
    assNumber: string;
    assName: string;
    customer: string;
    projectLeaderId: string;
    fase: string;
    picId: string;
    picName: string;
    picEmail: string;
    picStartDate: string | null;
    picTargetDate: string | null;
    customerStartDate: string | null;
    customerTargetDate: string | null;
    isDone: boolean;
    status: "ON_PROGRESS" | "NEAR_DEADLINE" | "LATE_INTERNAL" | "LATE_CRITICAL" | "DONE";
    daysFromPicTarget: number;
    bufferCustomerDays: number | null;
  };

  const events: CalendarEvent[] = [];

  for (const sf of subFases) {
    const project = projectMap.get(sf.projectId);
    if (!project) continue;

    // Apply filters
    if (filterLeaderId && project.projectLeaderId !== filterLeaderId) continue;
    if (filterPicId && sf.picId !== filterPicId) continue;
    if (filterFase && sf.projectFase.fase !== filterFase) continue;

    const picTarget = sf.picTargetDate ? new Date(sf.picTargetDate) : null;
    const custTarget = sf.customerTargetDate ? new Date(sf.customerTargetDate) : null;

    const diffPic = picTarget
      ? Math.ceil((picTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const diffCust = custTarget
      ? Math.ceil((custTarget.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status: CalendarEvent["status"] = "ON_PROGRESS";
    if (sf.isDone) {
      status = "DONE";
    } else if (diffCust !== null && diffCust < 0) {
      status = "LATE_CRITICAL";
    } else if (diffPic !== null && diffPic < 0) {
      status = "LATE_INTERNAL";
    } else if (diffPic !== null && diffPic <= 3) {
      status = "NEAR_DEADLINE";
    } else {
      status = "ON_PROGRESS";
    }

    // Apply status filter
    if (filterStatus === "HIDE_DONE" && status === "DONE") continue;
    if (filterStatus === "ONLY_LATE" && status !== "LATE_INTERNAL" && status !== "LATE_CRITICAL") continue;

    events.push({
      id: sf.id,
      subFaseId: sf.id,
      subFaseName: sf.name,
      projectId: sf.projectId,
      assNumber: project.assNumber,
      assName: project.assName,
      customer: project.customer,
      projectLeaderId: project.projectLeaderId,
      fase: sf.projectFase.fase,
      picId: sf.picId,
      picName: sf.pic.name,
      picEmail: sf.pic.email,
      picStartDate: sf.picStartDate?.toISOString() ?? null,
      picTargetDate: sf.picTargetDate?.toISOString() ?? null,
      customerStartDate: sf.customerStartDate?.toISOString() ?? null,
      customerTargetDate: sf.customerTargetDate?.toISOString() ?? null,
      isDone: sf.isDone,
      status,
      daysFromPicTarget: diffPic ?? 0,
      bufferCustomerDays: diffCust,
    });
  }

  // Filter options
  const allSubFases = await db.subFase.findMany({
    include: { pic: { select: { id: true, name: true } } },
  });
  const allProjects = await db.project.findMany({
    select: { id: true, assNumber: true, assName: true, projectLeaderId: true, projectLeader: { select: { id: true, name: true } } },
  });

  const filterOptions = {
    leaders: Array.from(
      new Map(allProjects.map((p) => [p.projectLeaderId, { id: p.projectLeaderId, name: p.projectLeader.name }])).values()
    ),
    pics: Array.from(
      new Map(allSubFases.map((sf) => [sf.picId, { id: sf.picId, name: sf.pic.name }])).values()
    ),
  };

  return Response.json({ events, filterOptions });
}
