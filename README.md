# 文白对译标注系统（Wenbai）

基于 Next.js + Prisma + PostgreSQL 的文言文/白话文对译语料标注平台。

## 功能概览

- 资料库（repo）管理：创建、重命名、删除
- 条目（record）管理：文言文原文、白话文译文、元信息
- 词元（token）标注：词性（POS）、句法角色、文白词元对齐、词元关系分类
- 词元注释：右键添加注释、悬浮显示 Tooltip、注释列表查看
- 批量导入：支持 JSON 格式批量导入数据
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

将 `DATABASE_URL` 替换为 PostgreSQL 连接字符串，例如：

```
DATABASE_URL="postgres://user:password@host:5432/db_name"
```

> 提示：项目已升级至 Prisma 7，使用 `@prisma/adapter-pg` + Node.js Runtime 连接数据库。请确保配置了标准的 PostgreSQL 连接串。

### 4. 数据库处理

将 Prisma schema 同步到数据库：

```bash
pnpm prisma db push
```

然后生成 Prisma Client：

```bash
pnpm prisma:generate
```

> 注意：Prisma Client 会生成到 `src/generated/prisma/client` 目录，并提交到代码库中。

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

### 7. 批量导入数据

项目提供批量导入工具，可将 JSON 格式的数据批量导入到指定资料库：

```bash
# 导入指定目录下的所有 JSON 文件到资料库
pnpm data:import --data-path ./import-example --repo-name 论语
```

## 部署说明

项目配置为 **Node.js Runtime**。

由于使用了 Prisma Adapter (`@prisma/adapter-pg`) 直连数据库，**不支持** Edge Runtime。

### 环境变量

确保在部署平台配置以下环境变量：

- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `AUTH_SECRET`: 用于签名 JWT 的密钥
