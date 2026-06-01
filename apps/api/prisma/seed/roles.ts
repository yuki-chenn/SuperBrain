import type { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG } from './permissions';

type RoleSeed = {
  key: string;
  name: string;
  description: string;
  permissionKeys: '*' | string[] | ((p: (typeof PERMISSION_CATALOG)[number]) => boolean);
};

export const ROLE_CATALOG: ReadonlyArray<RoleSeed> = [
  {
    key: 'super_admin',
    name: '超级管理员',
    description: '拥有全部权限，包括 super_admin 角色分配',
    permissionKeys: '*',
  },
  {
    key: 'admin',
    name: '管理员',
    description: '拥有除 super_admin 角色分配以外的全部权限',
    permissionKeys: (p) => p.key !== 'role:assign-super-admin',
  },
  {
    key: 'puzzle_editor',
    name: '题目编辑',
    description: '管理题目和题目版本',
    permissionKeys: [
      'game:read', 'game-config:read',
      'puzzle:read', 'puzzle:create', 'puzzle:update', 'puzzle:delete',
      'puzzle-version:read', 'puzzle-version:create',
      'puzzle-asset:read', 'puzzle-asset:upload', 'puzzle-tag:manage',
    ],
  },
  {
    key: 'puzzle_reviewer',
    name: '题目审核',
    description: '审核题目版本的发布与驳回',
    permissionKeys: [
      'game:read', 'puzzle:read',
      'puzzle-version:read', 'puzzle-version:publish', 'puzzle-version:reject',
      'puzzle-asset:read',
      'review-task:read', 'review-task:approve', 'review-task:reject',
    ],
  },
  {
    key: 'leaderboard_manager',
    name: '排行榜运营',
    description: '管理排行榜定义与成绩作废',
    permissionKeys: [
      'game:read',
      'leaderboard:read', 'leaderboard:create', 'leaderboard:update', 'leaderboard:activate',
      'score-record:revoke',
    ],
  },
  {
    key: 'user_manager',
    name: '用户运营',
    description: '管理用户账号，不可硬删除',
    permissionKeys: [
      'user:read', 'user:update', 'user:ban', 'user:reset-password',
      'role:read', 'role:assign',
    ],
  },
  {
    key: 'audit_viewer',
    name: '审计员',
    description: '只读访问所有审计日志',
    permissionKeys: ['admin-audit-log:read', 'challenge-audit-log:read', 'review-task:read'],
  },
  {
    key: 'readonly_operator',
    name: '只读运营',
    description: '只读访问所有运营资源',
    permissionKeys: (p) => p.action === 'read',
  },
];

function resolvePermissionKeys(role: RoleSeed): string[] {
  if (role.permissionKeys === '*') {
    return PERMISSION_CATALOG.map((p) => p.key);
  }
  if (Array.isArray(role.permissionKeys)) {
    const catalogKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));
    for (const k of role.permissionKeys) {
      if (!catalogKeys.has(k)) {
        throw new Error(`Role ${role.key} references unknown permission ${k}`);
      }
    }
    return role.permissionKeys;
  }
  return PERMISSION_CATALOG.filter(role.permissionKeys).map((p) => p.key);
}

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  const permissionByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p]),
  );

  for (const r of ROLE_CATALOG) {
    const role = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description, isSystem: true },
      create: { key: r.key, name: r.name, description: r.description, isSystem: true },
    });

    const targetPermIds = new Set(
      resolvePermissionKeys(r)
        .map((k) => permissionByKey.get(k)?.id)
        .filter((id): id is string => Boolean(id)),
    );

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.permissionId));

    for (const pid of targetPermIds) {
      if (!existingIds.has(pid)) {
        await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: pid } });
      }
    }
    for (const pid of existingIds) {
      if (!targetPermIds.has(pid)) {
        await prisma.rolePermission.delete({
          where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
        });
      }
    }
    console.log(`   role ${r.key}: ${targetPermIds.size} permissions`);
  }
}
