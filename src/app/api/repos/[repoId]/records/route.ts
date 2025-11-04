import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    repoId: string;
  }>;
};

function parseRepoId(rawId: string) {
  const repoId = Number.parseInt(rawId, 10);
  return Number.isFinite(repoId) && repoId > 0 ? repoId : null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
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
      select: { id: true, source: true, target: true, meta: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ message: "success", data: records });
  } catch (error) {
    console.error(`GET /api/repos/${repoId}/records failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId } = await context.params;
  const repoId = parseRepoId(rawRepoId);

  if (!repoId) {
    return NextResponse.json(
      { message: "error", error: "Invalid repository id" },
      { status: 400 },
    );
  }

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json(
      { message: "error", error: "未授权，请先登录" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const source =
      typeof body?.source === "string" ? body.source.trim() : "";

    if (!source) {
      return NextResponse.json(
        { message: "error", error: "缺少文言原文" },
        { status: 400 },
      );
    }

    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { id: true },
    });

    if (!repo) {
      return NextResponse.json(
        { message: "error", error: "Repository not found" },
        { status: 404 },
      );
    }

    const record = await prisma.record.create({
      data: {
        repoId,
        source,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "success", data: { id: record.id } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "error", error: "条目已存在" },
        { status: 409 },
      );
    }

    console.error(`POST /api/repos/${repoId}/records failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
