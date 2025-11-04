# 文白对译标注系统（Wenbai）

基于 Next.js + Prisma + PostgreSQL 的文言文/白话文对译语料标注平台。

## 功能概览

- 资料库（repo）管理：创建、重命名、删除
- 条目（record）管理：文言文原文、白话文译文、元信息
- 词元（token）标注：词性（POS）、句法角色、文白词元对齐、词元关系分类
- 支持自动保存、快捷键（Ctrl/⌘+S）等

## 开发环境

### 1. 克隆仓库

```bash
git clone https://github.com/elecmonkey/wenbai
cd wenbai
```

### 2. 安装依赖

```bash
pnpm i
```

### 3. 配置环境变量

复制 `.env.example`，创建 `.env`：

```bash
cp .env.example .env
```

将 `DATABASE_URL` 替换为 Prisma Accelerate 提供的连接串，例如：

```
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=<your-api-key>"
```

> 提示：项目默认使用 Prisma Accelerate + Edge Runtime，确保已在 Prisma 控制台创建 API Key。

### 4. 数据库处理

将 Prisma schema 同步到数据库：

```bash
pnpm prisma db push
```

然后生成 Prisma Client：

```bash
pnpm prisma:generate
```

### 5. 运行开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可预览。

### 6. 管理后台账号

项目不开放前端注册入口，如需创建或更新内部账号，请使用内置脚本：

```bash
# 创建新用户
pnpm create-user -- --username admin --password "your-secret" --displayName "管理员"

# 若用户已存在并需重置密码，可追加 --force
pnpm create-user -- --username admin --password "new-secret" --displayName "管理员" --force
```

## Edge 与 Node 运行时切换指引

默认部署使用 **Prisma Accelerate + Edge Runtime**，以获取更小的 Serverless 体积。如果你在本地或目标平台不便使用 Accelerate，可按以下步骤切回 Node Runtime：

1. **恢复 Prisma Node 引擎**
   - 将 `prisma/schema.prisma` 的 `generator client` 段落改回默认（删除 `engineType = "edge"`）。
   - 运行 `pnpm add pg @prisma/adapter-pg` 安装 Postgres 驱动。
   - 更新 `src/lib/prisma.ts` 为：
     ```ts
     import { PrismaClient } from '@prisma/client';
     import { PrismaPg } from '@prisma/adapter-pg';
     import { Pool } from 'pg';

     const pool = new Pool({ connectionString: process.env.DATABASE_URL });
     const adapter = new PrismaPg(pool);

     const globalForPrisma = globalThis as { prisma?: PrismaClient };
     export const prisma =
       globalForPrisma.prisma ??
       new PrismaClient({ adapter });

     if (process.env.NODE_ENV !== 'production') {
       globalForPrisma.prisma = prisma;
     }
     ```
   - 将 `.env` / `README` 中的连接串改回标准 `postgresql://` 形式。
   - 清理 Edge runtime 声明：删除各 API 和 `src/app/page.tsx` 中的 `export const runtime = 'edge'`。

2. **强制接口运行在 Node Runtime**
   - 某些 API 需要 Node 专用依赖（例如 `/api/auth/login` 使用 `bcryptjs`），即使全局采用 Edge，也应在文件中声明：
     ```ts
     export const runtime = 'nodejs';
     ```
   - 在完全回退到 Node 方案时，可为所有使用 Prisma 的路由与页面加上此声明，避免剩余页面受影响。

3. **重新生成 Prisma Client**
   - 切回 Node 后运行：
     ```bash
     pnpm prisma generate
     ```
     如需重新应用数据库结构，仍使用 `pnpm prisma db push`。

切换为 Node Runtime 后，Serverless 函数体积会增加，但可以在无法使用 Accelerate 或需要直连数据库时使用。记得在部署前确认 `.env`、依赖和 `runtime` 声明与当前模式一致。
