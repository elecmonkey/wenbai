import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run this script.');
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

type Options = {
  'data-path'?: string;
  'repo-name'?: string;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key as keyof Options] = next;
      index += 1;
      continue;
    }
  }
  return options;
}

type TokenData = {
  id: number;
  word: string;
  pos?: string | null;
  syntax_role?: string | null;
  annotation?: string | null;
};

type AlignmentData = {
  source_id: number;
  target_id: number;
  relation_type: string;
};

type RecordData = {
  source: string;
  target?: string | null;
  meta?: string | null;
  source_tokens: TokenData[];
  target_tokens: TokenData[];
  alignment?: AlignmentData[];
};

function validateRecord(data: unknown, filename: string): RecordData {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`${filename}: 数据必须是对象`);
  }

  const record = data as Partial<RecordData>;

  if (typeof record.source !== 'string' || !record.source.trim()) {
    throw new Error(`${filename}: source 必须是非空字符串`);
  }

  if (!Array.isArray(record.source_tokens) || record.source_tokens.length === 0) {
    throw new Error(`${filename}: source_tokens 必须是非空数组`);
  }

  if (!Array.isArray(record.target_tokens) || record.target_tokens.length === 0) {
    throw new Error(`${filename}: target_tokens 必须是非空数组`);
  }

  return {
    source: record.source,
    target: record.target ?? null,
    meta: record.meta ?? null,
    source_tokens: record.source_tokens,
    target_tokens: record.target_tokens,
    alignment: Array.isArray(record.alignment) ? record.alignment : [],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataPath = args['data-path'];
  const repoName = args['repo-name'];

  if (!dataPath || !repoName) {
    console.error(
      'Usage: pnpm data:import --data-path <path> --repo-name <name>',
    );
    console.error('Example: pnpm data:import --data-path ./import --repo-name 论语');
    process.exitCode = 1;
    return;
  }

  console.log(`📂 读取目录: ${dataPath}`);
  console.log(`📚 目标资料库: ${repoName}`);
  console.log('');

  // 确保资料库存在
  let repo = await prisma.repo.findUnique({
    where: { name: repoName },
    cacheStrategy: { ttl: 0 },
  });

  if (!repo) {
    console.log(`✨ 创建新资料库: ${repoName}`);
    repo = await prisma.repo.create({
      data: { name: repoName },
    });
  } else {
    console.log(`✓ 找到资料库: ${repoName} (ID: ${repo.id})`);
  }
  console.log('');

  // 读取目录下的所有 JSON 文件
  const files = await readdir(dataPath);
  const jsonFiles = files.filter((file) => extname(file).toLowerCase() === '.json');

  if (jsonFiles.length === 0) {
    console.log('⚠️  未找到 JSON 文件');
    return;
  }

  console.log(`📄 找到 ${jsonFiles.length} 个 JSON 文件\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const filename of jsonFiles) {
    const filepath = join(dataPath, filename);
    try {
      // 读取并解析 JSON
      const content = await readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      const record = validateRecord(data, filename);

      // 检查是否已存在相同 source 的记录
      const existing = await prisma.record.findFirst({
        where: {
          repoId: repo.id,
          source: record.source,
        },
        cacheStrategy: { ttl: 0 },
      });

      if (existing) {
        console.log(`⊘ ${filename} - 跳过（已存在相同原文）`);
        skipCount += 1;
        continue;
      }

      // 创建记录
      const created = await prisma.record.create({
        data: {
          repoId: repo.id,
          source: record.source,
          target: record.target,
          meta: record.meta,
        },
      });

      // 创建详情
      await prisma.recordDetail.create({
        data: {
          recordId: created.id,
          sourceTokens: record.source_tokens.length > 0
            ? (record.source_tokens as Prisma.JsonArray)
            : Prisma.JsonNull,
          targetTokens: record.target_tokens.length > 0
            ? (record.target_tokens as Prisma.JsonArray)
            : Prisma.JsonNull,
          alignment: record.alignment && record.alignment.length > 0
            ? (record.alignment as Prisma.JsonArray)
            : Prisma.JsonNull,
        },
      });

      console.log(`✓ ${filename} - 导入成功 (ID: ${created.id})`);
      successCount += 1;
    } catch (error) {
      console.error(`✗ ${filename} - 失败: ${error instanceof Error ? error.message : String(error)}`);
      errorCount += 1;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 导入完成`);
  console.log(`   成功: ${successCount}`);
  console.log(`   跳过: ${skipCount}`);
  console.log(`   失败: ${errorCount}`);
  console.log(`   总计: ${jsonFiles.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((error) => {
    console.error('\n❌ 导入过程出错:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
