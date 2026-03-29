import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
      },
      select: { id: true, name: true, email: true, image: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
