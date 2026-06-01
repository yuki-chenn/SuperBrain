# rule: 写 Prisma migration（greenfield 之后）

Greenfield 重置后，原则上不再新增模型 — 所有游戏都走通用 Schema。但有时确实需要扩字段或加索引。本文给规范。

## 决策树

```
需要写 migration ?
├── 加字段（向已有表）── ✓ Prisma migrate dev --create-only，确认 SQL 无 NULL 风险
├── 加索引 ─────────── ✓ 同上；如果是 partial index 必须手写 SQL
├── 加新表 ─────────── ⚠ 只在确实跨越 8 数据域抽象时；先在 PR 描述里证明
├── 改字段类型 ────── ⚠ 高风险；必须配数据迁移 SQL
└── 删除字段 / 表 ──── ⚠ 一定走 archive 阶段：先停写 → 后续 migration 删
```

## 流程

```bash
# 1. 编辑 apps/api/prisma/schema.prisma
# 2. 生成 migration（不立即应用）
pnpm --filter api exec prisma migrate dev --name add_xxx --create-only

# 3. 打开 apps/api/prisma/migrations/<ts>_add_xxx/migration.sql
#    手工补充：partial index、CHECK 约束、NULLS NOT DISTINCT 等 Prisma 不能表达的 SQL

# 4. 应用
pnpm --filter api exec prisma migrate dev

# 5. prisma generate
pnpm --filter api exec prisma generate
```

## 部分唯一索引（partial unique）

Prisma 不支持。直接写 raw SQL：

```sql
CREATE UNIQUE INDEX "uq_xxx_active_only"
ON "Table" ("col1", "col2") NULLS NOT DISTINCT
WHERE "status" = 'ACTIVE';
```

`NULLS NOT DISTINCT` 把 NULL 视作相等（PostgreSQL 15+），用于 `(gameId, mode?, difficultyId?)` 这类全空也不重复的场景。

## 命名

- 文件名 `<timestamp>_<verb>_<noun>`：`20260901120000_add_user_pinyin_alias`。
- 名字必须能让人 6 个月后看懂。

## 审核 checklist

- [ ] 没引入新枚举值导致旧应用版本崩溃？（如必须引入，先发布一个支持解释 unknown 值的应用版本）
- [ ] 所有新字段都有合理默认或 NULL；不要让现有行无法满足 NOT NULL。
- [ ] 加表必加 `createdAt`、`updatedAt`；高吞吐表加 `(createdAt)` 索引。
- [ ] 涉及 ACTIVE / PUBLISHED 状态的：明确同时只能有一行的约束。
- [ ] 反向回滚 SQL 已经预想（即便不写）。

## 不能做的事

❌ `prisma db pull`（会丢失我们手写的 partial unique index）。  
❌ 在已部署到生产的 migration 之后修改 SQL —— 应新增一个补丁 migration。  
❌ 在 schema.prisma 里同时改多张表 + 改字段类型 —— Prisma 自动 SQL 可能不安全。

## 与 PgBouncer 的注意

`prisma migrate dev/deploy/reset` 必须走直连 PG（`DATABASE_URL_DIRECT`），不能走 PgBouncer 的 transaction 池。Application 运行时走 `DATABASE_URL`（PgBouncer port 6432）。Change 6 切换到 PgBouncer 时这条规则生效。
