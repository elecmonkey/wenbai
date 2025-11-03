import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    repoId: string;
  }>;
};

function parseRepoId(rawId: string) {
  const repoId = Number.parseInt(rawId, 10);
  return Number.isFinite(repoId) && repoId > 0 ? repoId : null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId } = await context.params;
  const repoId = parseRepoId(rawRepoId);

  if (!repoId) {
    return NextResponse.json(
      { message: "error", error: "Invalid repository id" },
      { status: 400 },
    );
  }

  try {
    const records = await prisma.record.findMany({
      where: { repoId },
      select: { id: true, source: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ message: "success", data: records });
  } catch (error) {
    console.error(
      `GET /api/repos/${repoId}/records failed`,
      error,
    );
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId } = await context.params;
  const repoId = parseRepoId(rawRepoId);

  if (!repoId) {
    return NextResponse.json(
      { message: "error", error: "Invalid repository id" },
      { status: 400 },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const source =
      typeof body?.source === "string" ? body.source.trim() : undefined;

    if (!source) {
      return NextResponse.json(
        { message: "error", error: "Missing source text" },
        { status: 400 },
      );
    }

    const record = await prisma.record.create({
      data: { repoId, source },
      select: { id: true, source: true, target: true, meta: true },
    });

    return NextResponse.json(
      { message: "success", data: record },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { message: "error", error: "Repository not found" },
        { status: 404 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "error", error: "该资料库已存在同名条目" },
        { status: 409 },
      );
    }

    console.error(`POST /api/repos/${rawRepoId}/records failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
