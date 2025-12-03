import { prisma } from "@/lib/prisma";
import { DashboardRoot } from "./_components/dashboard";
import type { DashboardInitialData, Repo } from "@/types/dashboard";

export const runtime = 'nodejs';

export default async function Home() {
  const repos = (await prisma.repo.findMany({
    // cacheStrategy: { ttl: 0 },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  })) satisfies Repo[];

  const initialData: DashboardInitialData = {
    repos,
    openRepoIds: [],
    activeRepoId: null,
    activeRecordId: null,
    records: null,
    recordDetail: null,
  };

  return (
    <main className="min-h-screen">
      <DashboardRoot initialData={initialData} />
    </main>
  );
}
