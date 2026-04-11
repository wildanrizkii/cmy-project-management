import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/gcal";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const subFases = await db.subFase.findMany({
    where: {
      isDone: false,
      picTargetDate: { not: null },
    },
    include: {
      pic: true,
      projectFase: {
        include: {
          project: true,
        },
      },
    },
  });

  let sent = 0;

  for (const sf of subFases) {
    if (!sf.picTargetDate) continue;
    const daysUntil = Math.ceil(
      (sf.picTargetDate.getTime() - now.getTime()) / MS_PER_DAY
    );

    if (daysUntil !== 3 && daysUntil !== 1) continue;

    const project = sf.projectFase.project;
    const picEmail = sf.pic.email;

    if (!picEmail) continue;

    await sendReminderEmail({
      to: picEmail,
      picName: sf.pic.name,
      subFaseName: sf.name,
      projectCode: project.assNumber,
      projectName: project.assName,
      fase: sf.projectFase.fase,
      picStartDate: sf.picStartDate?.toISOString() ?? null,
      picTargetDate: sf.picTargetDate.toISOString(),
      customerTargetDate: sf.customerTargetDate?.toISOString() ?? null,
      documentUrl: sf.documentUrl ?? null,
      description: sf.description ?? null,
      daysUntil,
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
