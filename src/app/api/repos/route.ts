import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const repos = await prisma.repo.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ message: "success", data: repos });
  } catch (error) {
    console.error("GET /api/repos failed", error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { message: "error", error: "未授权，请先登录" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const name =
      typeof body?.name === "string" ? body.name.trim() : undefined;

    if (!name) {
      return NextResponse.json(
        { message: "error", error: "Missing repository name" },
        { status: 400 },
      );
    }

    const existing = await prisma.repo.findFirst({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { message: "error", error: "资料库名称已存在" },
        { status: 409 },
      );
    }

    const repo = await prisma.repo.create({ data: { name } });

    return NextResponse.json(
      { message: "success", data: { id: repo.id } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "error", error: "资料库名称已存在" },
        { status: 409 },
      );
    }

    console.error("POST /api/repos failed", error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
