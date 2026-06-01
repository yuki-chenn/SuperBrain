import type { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const SEEDED = [
  { email: 'super_admin@example.com', username: 'superadmin', displayName: 'Super Admin', roleKey: 'super_admin' },
  { email: 'demo@example.com',        username: 'demo',       displayName: 'Demo Admin', roleKey: 'admin' },
];

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await argon2.hash('Demo123456', { type: argon2.argon2id });

  for (const u of SEEDED) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { username: u.username, displayName: u.displayName, status: 'ACTIVE' },
      create: { email: u.email, username: u.username, displayName: u.displayName, passwordHash, status: 'ACTIVE' },
    });
    const role = await prisma.role.findUnique({ where: { key: u.roleKey } });
    if (!role) {
      console.log(`   role ${u.roleKey} missing; skip role assignment for ${u.email}`);
      continue;
    }
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    console.log(`   user ${u.email} → ${u.roleKey}`);
  }
}
