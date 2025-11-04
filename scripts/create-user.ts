import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run this script.');
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

type Options = {
  username?: string;
  password?: string;
  displayName?: string | null;
  force?: boolean;
};

function parseArgs(argv: string[]): Options {
  const options: Options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[key as keyof Options] = next as never;
      index += 1;
      continue;
    }
    options[key as keyof Options] = true as never;
  }
  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = args.username?.trim();
  const password = args.password ?? '';
  const displayName =
    typeof args.displayName === 'string' ? args.displayName.trim() : null;
  const force = args.force ?? false;

  if (!username || !password) {
    console.error(
      'Usage: pnpm create-user -- --username <name> --password <password> [--displayName <display>]',
    );
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    cacheStrategy: { ttl: 0 },
  });

  if (existing && !force) {
    console.error(
      `User "${username}" already exists. Use --force to update its password.`,
    );
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      displayName,
    },
    create: {
      username,
      displayName,
      passwordHash,
    },
  });

  console.log(
    `User "${username}" ${
      existing ? 'updated' : 'created'
    } successfully. Display name: ${displayName ?? '(none)'}.`,
  );
}

main()
  .catch((error) => {
    console.error('Failed to create user', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
