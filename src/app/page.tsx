import { prisma } from "@/lib/prisma";
import { DashboardRoot } from "./_components/dashboard";
import type {
  DashboardInitialData,
  RecordDetailPayload,
  RecordSummary,
  Repo,
} from "@/types/dashboard";

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default async function Home() {
  const repos = (await prisma.repo.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  })) satisfies Repo[];

  const activeRepoId = repos[0]?.id ?? null;
  let records: { repoId: number; items: RecordSummary[] } | null = null;
  let activeRecordId: number | null = null;
  let recordDetail:
    | {
        repoId: number;
        recordId: number;
        data: RecordDetailPayload;
      }
    | null = null;

  if (activeRepoId) {
    const repoRecords = (await prisma.record.findMany({
      where: { repoId: activeRepoId },
      select: { id: true, source: true },
      orderBy: { id: "asc" },
    })) satisfies RecordSummary[];

    records = { repoId: activeRepoId, items: repoRecords };
    activeRecordId = repoRecords[0]?.id ?? null;

    if (activeRecordId) {
      const record = await prisma.record.findUnique({
        where: { id: activeRecordId },
        include: { detail: true },
      });

      if (record) {
        recordDetail = {
          repoId: activeRepoId,
          recordId: record.id,
          data: {
            id: record.id,
            source: record.source,
            target: record.target,
            meta: record.meta,
            source_tokens: ensureArray<
              RecordDetailPayload["source_tokens"][number]
            >(record.detail?.sourceTokens),
            target_tokens: ensureArray<
              RecordDetailPayload["target_tokens"][number]
            >(record.detail?.targetTokens),
            alignment: ensureArray<
              RecordDetailPayload["alignment"][number]
            >(record.detail?.alignment),
          },
        };
      }
    }
  }

  const initialData: DashboardInitialData = {
    repos,
    activeRepoId,
    activeRecordId,
    records,
    recordDetail,
  };

  return (
    <main className="min-h-screen">
      <DashboardRoot initialData={initialData} />
    </main>
  );
}
