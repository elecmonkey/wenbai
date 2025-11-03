import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    const repo = await prisma.repo.create({ data: { name } });

    return NextResponse.json(
      { message: "success", data: { id: repo.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/repos failed", error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
