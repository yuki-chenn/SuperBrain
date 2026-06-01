/**
 * Greenfield seed orchestrator.
 *
 * Loads modules in dependency order:
 *   permissions -> roles -> dictionary -> games -> puzzles-curated -> leaderboards -> retention
 *
 * Every module is idempotent (upsert keyed by stable business identifier).
 */
import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seed/permissions';
import { seedRoles } from './seed/roles';
import { seedUsers } from './seed/users';
import { seedDictionary } from './seed/dictionary';
import { seedGames } from './seed/games';
import { seedCuratedPuzzles } from './seed/puzzles-curated';
import { seedLeaderboards } from './seed/leaderboards';
import { seedRetentionPolicies } from './seed/retention';

const prisma = new PrismaClient();

async function run<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  console.log(`\n-- ${label} --`);
  try {
    const result = await fn();
    console.log(`   done in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error(`   FAILED: ${(err as Error).message}`);
    throw err;
  }
}

async function main() {
  console.log('Seeding SuperBrain database (greenfield)...');
  await run('permissions', () => seedPermissions(prisma));
  await run('roles', () => seedRoles(prisma));
  await run('users', () => seedUsers(prisma));
  await run('dictionary', () => seedDictionary(prisma));
  await run('games', () => seedGames(prisma));
  await run('curated puzzles', () => seedCuratedPuzzles(prisma));
  await run('leaderboards', () => seedLeaderboards(prisma));
  await run('retention policies', () => seedRetentionPolicies(prisma));
  console.log('\nSeed complete.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
