import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/gcal";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
