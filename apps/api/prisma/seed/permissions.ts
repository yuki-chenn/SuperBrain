import type { PrismaClient } from '@prisma/client';

/**
 * Permission catalog. Format: `<resource>:<action>` lowercase kebab-case.
 * Adding new permissions: append below, then update roles.ts.
 */
export const PERMISSION_CATALOG: ReadonlyArray<{
  key: string;
  resource: string;
  action: string;
  description: string;
}> = [
  // Game catalog
  { key: 'game:read', resource: 'game', action: 'read', description: '查看游戏列表与详情' },
  { key: 'game:create', resource: 'game', action: 'create', description: '创建新游戏' },
  { key: 'game:update', resource: 'game', action: 'update', description: '编辑游戏基础信息' },
  { key: 'game:publish', resource: 'game', action: 'publish', description: '发布或下架游戏' },
  { key: 'game:archive', resource: 'game', action: 'archive', description: '归档游戏' },

  // Game configuration
  { key: 'game-config:read', resource: 'game-config', action: 'read', description: '查看游戏规则版本、难度和策略' },
  { key: 'game-config:create', resource: 'game-config', action: 'create', description: '创建规则版本/难度/策略' },
  { key: 'game-config:activate', resource: 'game-config', action: 'activate', description: '激活规则版本/难度/策略' },

  // Puzzle catalog
  { key: 'puzzle:read', resource: 'puzzle', action: 'read', description: '查看题库' },
  { key: 'puzzle:create', resource: 'puzzle', action: 'create', description: '新增题目' },
  { key: 'puzzle:update', resource: 'puzzle', action: 'update', description: '编辑题目基础信息' },
  { key: 'puzzle:delete', resource: 'puzzle', action: 'delete', description: '软删除题目' },

  // Puzzle versions
  { key: 'puzzle-version:read', resource: 'puzzle-version', action: 'read', description: '查看题目版本' },
  { key: 'puzzle-version:create', resource: 'puzzle-version', action: 'create', description: '新增题目版本' },
  { key: 'puzzle-version:publish', resource: 'puzzle-version', action: 'publish', description: '发布题目版本' },
  { key: 'puzzle-version:reject', resource: 'puzzle-version', action: 'reject', description: '驳回题目版本' },

  // Puzzle assets / tags
  { key: 'puzzle-asset:read', resource: 'puzzle-asset', action: 'read', description: '查看题目附件' },
  { key: 'puzzle-asset:upload', resource: 'puzzle-asset', action: 'upload', description: '上传题目附件' },
  { key: 'puzzle-tag:manage', resource: 'puzzle-tag', action: 'manage', description: '管理题目标签' },

  // Leaderboards
  { key: 'leaderboard:read', resource: 'leaderboard', action: 'read', description: '查看排行榜' },
  { key: 'leaderboard:create', resource: 'leaderboard', action: 'create', description: '创建排行榜' },
  { key: 'leaderboard:update', resource: 'leaderboard', action: 'update', description: '编辑排行榜' },
  { key: 'leaderboard:activate', resource: 'leaderboard', action: 'activate', description: '启用/禁用排行榜' },
  { key: 'score-record:revoke', resource: 'score-record', action: 'revoke', description: '作废成绩记录' },

  // Users
  { key: 'user:read', resource: 'user', action: 'read', description: '查看用户列表与详情' },
  { key: 'user:update', resource: 'user', action: 'update', description: '编辑用户资料' },
  { key: 'user:ban', resource: 'user', action: 'ban', description: '封禁/解封用户' },
  { key: 'user:reset-password', resource: 'user', action: 'reset-password', description: '重置用户密码' },
  { key: 'user:delete', resource: 'user', action: 'delete', description: '软删除用户' },

  // Roles
  { key: 'role:read', resource: 'role', action: 'read', description: '查看角色和权限' },
  { key: 'role:assign', resource: 'role', action: 'assign', description: '为用户分配角色' },
  { key: 'role:assign-super-admin', resource: 'role', action: 'assign-super-admin', description: '分配超级管理员角色（受限）' },

  // Audit
  { key: 'admin-audit-log:read', resource: 'admin-audit-log', action: 'read', description: '查看管理员审计日志' },
  { key: 'challenge-audit-log:read', resource: 'challenge-audit-log', action: 'read', description: '查看挑战审计日志' },

  // Review tasks
  { key: 'review-task:read', resource: 'review-task', action: 'read', description: '查看审核任务' },
  { key: 'review-task:approve', resource: 'review-task', action: 'approve', description: '通过审核任务' },
  { key: 'review-task:reject', resource: 'review-task', action: 'reject', description: '驳回审核任务' },

  // Data lifecycle
  { key: 'data-retention:manage', resource: 'data-retention', action: 'manage', description: '配置数据保留策略' },
  { key: 'data-archive:trigger', resource: 'data-archive', action: 'trigger', description: '手动触发归档任务' },

  // Database browser
  { key: 'database:read', resource: 'database', action: 'read', description: '查看数据库表与数据' },

  // Permission management
  { key: 'permission:create', resource: 'permission', action: 'create', description: '创建新权限' },
  { key: 'permission:update', resource: 'permission', action: 'update', description: '编辑权限信息' },
  { key: 'permission:delete', resource: 'permission', action: 'delete', description: '删除权限' },

  // Sessions
  { key: 'session:read', resource: 'session', action: 'read', description: '查看认证会话列表与详情' },
  { key: 'session:revoke', resource: 'session', action: 'revoke', description: '撤销认证会话' },
];

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { resource: p.resource, action: p.action, description: p.description },
      create: p,
    });
  }
  console.log(`   seeded ${PERMISSION_CATALOG.length} permissions`);
}
