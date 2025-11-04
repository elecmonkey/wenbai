import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{
    repoId: string;
  }>;
};

function parseRepoId(rawId: string) {
  const repoId = Number.parseInt(rawId, 10);
  return Number.isFinite(repoId) && repoId > 0 ? repoId : null;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId } = await context.params;
  const repoId = parseRepoId(rawRepoId);

  if (!repoId) {
    return NextResponse.json(
      { message: "error", error: "Invalid repository id" },
      { status: 400 },
    );
  }

  const user = await getAuthUser(req);
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

    const currentRepo = await prisma.repo.findUnique({
      where: { id: repoId },
      cacheStrategy: { ttl: 0 },
      select: { id: true, name: true },
    });

    if (!currentRepo) {
      return NextResponse.json(
        { message: "error", error: "Repository not found" },
        { status: 404 },
      );
    }

    if (name === currentRepo.name) {
      return NextResponse.json({ message: "success" });
    }

    const conflict = await prisma.repo.findFirst({
      where: {
        name,
        NOT: { id: repoId },
      },
      cacheStrategy: { ttl: 0 },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json(
        { message: "error", error: "资料库名称已存在" },
        { status: 409 },
      );
    }

    await prisma.repo.update({
      where: { id: repoId },
      data: { name },
    });

    return NextResponse.json({ message: "success" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
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
        { message: "error", error: "资料库名称已存在" },
        { status: 409 },
      );
    }

    console.error(`PUT /api/repos/${repoId} failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId } = await context.params;
  const repoId = parseRepoId(rawRepoId);

  if (!repoId) {
    return NextResponse.json(
      { message: "error", error: "Invalid repository id" },
      { status: 400 },
    );
  }

  const user = await getAuthUser(_req);
  if (!user) {
    return NextResponse.json(
      { message: "error", error: "未授权，请先登录" },
      { status: 401 },
    );
  }

  try {
    await prisma.repo.delete({ where: { id: repoId } });
    return NextResponse.json({
      message: "success",
      data: { id: repoId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { message: "error", error: "Repository not found" },
        { status: 404 },
      );
    }

    console.error(`DELETE /api/repos/${repoId} failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
