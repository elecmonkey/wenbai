# 文白对译标注系统（Wenbai）

基于 Next.js App Router + Prisma + PostgreSQL 的文言文/白话文对译语料标注平台。

## 功能概览

- 资料库（repo）管理：创建、重命名、删除
- 条目（record）管理：文言文原文、白话文译文、元信息
- 词元标注：词性（POS）、句法角色、文白词元对齐、词元关系分类
- 支持自动保存、快捷键（Ctrl/⌘+S）

## 开发环境

### 1. 克隆仓库

```bash
git clone <repo-url>
cd wenbai
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example`，创建 `.env`：

```bash
cp .env.example .env
```

将 `DATABASE_URL` 替换为实际的 PostgreSQL 连接串，例如：

```
DATABASE_URL="postgresql://user:password@host:port/database"
```

> 提示：项目使用 Prisma Adapter + `engineType = client`，适用于 Edge/Serverless 环境。

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