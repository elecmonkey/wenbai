import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    repoId: string;
    recordId: string;
  }>;
};

function parseId(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId, recordId: rawRecordId } =
    await context.params;
  const repoId = parseId(rawRepoId);
  const recordId = parseId(rawRecordId);

  if (!repoId || !recordId) {
    return NextResponse.json(
      { message: "error", error: "Invalid identifiers" },
      { status: 400 },
    );
  }

  try {
    const record = await prisma.record.findFirst({
      where: { id: recordId, repoId },
      include: { detail: true },
    });

    if (!record) {
      return NextResponse.json(
        { message: "error", error: "Record not found" },
        { status: 404 },
      );
    }

    const detail = record.detail;

    const toJsonValue = (value: unknown) =>
      value === null || value === undefined ? [] : value;

    return NextResponse.json({
      message: "success",
      data: {
        id: record.id,
        source: record.source,
        target: record.target,
        meta: record.meta,
        source_tokens: toJsonValue(detail?.sourceTokens),
        target_tokens: toJsonValue(detail?.targetTokens),
        alignment: toJsonValue(detail?.alignment),
      },
    });
  } catch (error) {
    console.error(`GET /api/repos/${rawRepoId}/records/${rawRecordId} failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { repoId: rawRepoId, recordId: rawRecordId } =
    await context.params;
  const repoId = parseId(rawRepoId);
  const recordId = parseId(rawRecordId);

  if (!repoId || !recordId) {
    return NextResponse.json(
      { message: "error", error: "Invalid identifiers" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.record.findFirst({
      where: { id: recordId, repoId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "error", error: "Record not found" },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => null);
    const payload = body?.data ?? body;

    if (!payload || typeof payload.source !== "string") {
      return NextResponse.json(
        { message: "error", error: "Missing record payload" },
        { status: 400 },
      );
    }

    const source = payload.source.trim();
    if (!source) {
      return NextResponse.json(
        { message: "error", error: "Source text cannot be empty" },
        { status: 400 },
      );
    }

    const target =
      typeof payload.target === "string"
        ? payload.target
        : payload.target === null
          ? null
          : undefined;
    const meta =
      typeof payload.meta === "string"
        ? payload.meta
        : payload.meta === null
          ? null
          : undefined;

    const detailData: Record<string, unknown> = {};
    let hasDetail = false;

    if (Object.prototype.hasOwnProperty.call(payload, "source_tokens")) {
      detailData.sourceTokens =
        payload.source_tokens ?? Prisma.JsonNull;
      hasDetail = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "target_tokens")) {
      detailData.targetTokens =
        payload.target_tokens ?? Prisma.JsonNull;
      hasDetail = true;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "alignment")) {
      detailData.alignment =
        payload.alignment ?? Prisma.JsonNull;
      hasDetail = true;
    }

    await prisma.record.update({
      where: { id: recordId },
      data: {
        source,
        target,
        meta,
        ...(hasDetail
          ? {
              detail: {
                upsert: {
                  create: detailData,
                  update: detailData,
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ message: "success" });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "error", error: "该资料库已存在同名条目" },
        { status: 409 },
      );
    }
    console.error(`PUT /api/repos/${rawRepoId}/records/${rawRecordId} failed`, error);
    return NextResponse.json(
      { message: "error", error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
