import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const WEB_ACCESS_DEPARTMENTS = [
  "PROJECT_LEADER",
  "PROJECT_LEADER_COORDINATOR",
] as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");

  const users = await db.user.findMany({
    where: department
      ? { department: department as (typeof WEB_ACCESS_DEPARTMENTS)[number] }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return Response.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, password, department } = body;

  if (!name || !email || !department) {
    return Response.json(
      { error: "Name, email, and department are required" },
      { status: 400 },
    );
  }

  // Cek apakah departemen bisa akses web
  const canAccessWeb = WEB_ACCESS_DEPARTMENTS.includes(department);

  // Validasi password hanya untuk departemen dengan akses web
  if (canAccessWeb) {
    if (!password) {
      return Response.json(
        { error: "Password is required for Project Leader and Coordinator" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
  }

  // Cek email sudah terdaftar
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "Email is already registered" },
      { status: 409 },
    );
  }

  // Hash password hanya jika ada (untuk departemen dengan akses web)
  let hashedPassword: string | undefined;
  if (canAccessWeb && password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      department: department as (typeof WEB_ACCESS_DEPARTMENTS)[number],
      ...(hashedPassword && { password: hashedPassword }),
    },
    select: { id: true, name: true, email: true, department: true },
  });

  return Response.json(user, { status: 201 });
}
