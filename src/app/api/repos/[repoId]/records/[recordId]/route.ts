import { Prisma } from "@prisma/client";
import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    repoId: string;
    recordId: string;
  }>;
};

function parseId(rawId: string) {
  const id = Number.parseInt(rawId, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { repoId: rawRepoId, recordId: rawRecordId } =
    await context.params;
  const repoId = parseId(rawRepoId);
  const recordId = parseId(rawRecordId);

  if (!repoId || !recordId) {
    return NextResponse.json(
      { message: "error", error: "Invalid identifier" },
      { status: 400 },
    );
  }

  try {
    const record = await prisma.record.findFirst({
      where: { id: recordId, repoId },
      select: {
        id: true,
        source: true,
        target: true,
        meta: true,
        detail: {
          select: {
            sourceTokens: true,
            targetTokens: true,
            alignment: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "error", error: "Record not found" },
        { status: 404 },
      );
    }

    const detail = record.detail;
    const sourceTokens = Array.isArray(detail?.sourceTokens)
      ? (detail?.sourceTokens as unknown[])
      : [];
    const targetTokens = Array.isArray(detail?.targetTokens)
      ? (detail?.targetTokens as unknown[])
      : [];
    const alignment = Array.isArray(detail?.alignment)
      ? (detail?.alignment as unknown[])
      : [];

    return NextResponse.json({
      message: "success",
      data: {
        id: record.id,
        source: record.source,
        target: record.target,
        meta: record.meta,
        source_tokens: sourceTokens,
        target_tokens: targetTokens,
        alignment,
      },
    });
  } catch (error) {
    console.error(
      `GET /api/repos/${repoId}/records/${recordId} failed`,
      error,
    );
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  const { repoId: rawRepoId, recordId: rawRecordId } =
    await context.params;
  const repoId = parseId(rawRepoId);
  const recordId = parseId(rawRecordId);

  if (!repoId || !recordId) {
    return NextResponse.json(
      { message: "error", error: "Invalid identifier" },
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
    const payload = body?.data;

    if (!payload) {
      return NextResponse.json(
        { message: "error", error: "缺少更新数据" },
        { status: 400 },
      );
    }

    const sanitizedSource =
      typeof payload.source === "string" ? payload.source.trim() : "";
    if (!sanitizedSource) {
      return NextResponse.json(
        { message: "error", error: "文言原文不能为空" },
        { status: 400 },
      );
    }

    const sanitizedTarget =
      typeof payload.target === "string"
        ? payload.target.trim() || null
        : null;
    const sanitizedMeta =
      typeof payload.meta === "string"
        ? payload.meta.trim() || null
        : null;
    const sourceTokens = Array.isArray(payload.source_tokens)
      ? (payload.source_tokens as unknown[])
      : [];
    const targetTokens = Array.isArray(payload.target_tokens)
      ? (payload.target_tokens as unknown[])
      : [];
    const alignment = Array.isArray(payload.alignment)
      ? (payload.alignment as unknown[])
      : [];

    const record = await prisma.record.findFirst({
      where: { id: recordId, repoId },
      select: { id: true },
    });

    if (!record) {
      return NextResponse.json(
        { message: "error", error: "Record not found" },
        { status: 404 },
      );
    }

    await prisma.record.update({
      where: { id: recordId },
      data: {
        source: sanitizedSource,
        target: sanitizedTarget,
        meta: sanitizedMeta,
      },
    });

    await prisma.recordDetail.upsert({
      where: { recordId },
      update: {
        sourceTokens:
          sourceTokens.length > 0 ? (sourceTokens as Prisma.JsonArray) : Prisma.JsonNull,
        targetTokens:
          targetTokens.length > 0 ? (targetTokens as Prisma.JsonArray) : Prisma.JsonNull,
        alignment:
          alignment.length > 0 ? (alignment as Prisma.JsonArray) : Prisma.JsonNull,
      },
      create: {
        recordId,
        sourceTokens:
          sourceTokens.length > 0 ? (sourceTokens as Prisma.JsonArray) : Prisma.JsonNull,
        targetTokens:
          targetTokens.length > 0 ? (targetTokens as Prisma.JsonArray) : Prisma.JsonNull,
        alignment:
          alignment.length > 0 ? (alignment as Prisma.JsonArray) : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ message: "success" });
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

    console.error(
      `PUT /api/repos/${repoId}/records/${recordId} failed`,
      error,
    );
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
