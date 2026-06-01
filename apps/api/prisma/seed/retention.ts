import type { PrismaClient } from '@prisma/client';

const POLICIES: Array<{
  tableName: string;
  dataClass: string;
  onlineRetentionDays: number;
  archiveAfterDays: number | null;
  deleteAfterDays: number | null;
  action: 'KEEP' | 'COMPACT' | 'ARCHIVE' | 'DELETE' | 'ANONYMIZE';
  archiveFormat: 'JSONL_GZIP' | 'PARQUET' | 'CSV_GZIP' | null;
}> = [
  { tableName: 'AttemptOperationLog', dataClass: 'operation_log',
    onlineRetentionDays: 30, archiveAfterDays: 30, deleteAfterDays: 365,
    action: 'ARCHIVE', archiveFormat: 'JSONL_GZIP' },
  { tableName: 'ChallengeAuditLog', dataClass: 'audit_log',
    onlineRetentionDays: 90, archiveAfterDays: 90, deleteAfterDays: 730,
    action: 'ARCHIVE', archiveFormat: 'JSONL_GZIP' },
  { tableName: 'AdminAuditLog', dataClass: 'audit_log',
    onlineRetentionDays: 3650, archiveAfterDays: null, deleteAfterDays: null,
    action: 'KEEP', archiveFormat: null },
  { tableName: 'IdempotencyRecord', dataClass: 'transient',
    onlineRetentionDays: 30, archiveAfterDays: null, deleteAfterDays: 30,
    action: 'DELETE', archiveFormat: null },
  { tableName: 'GameSubmission', dataClass: 'submission',
    onlineRetentionDays: 90, archiveAfterDays: 90, deleteAfterDays: 365,
    action: 'ARCHIVE', archiveFormat: 'JSONL_GZIP' },
  { tableName: 'AttemptSnapshot', dataClass: 'snapshot',
    onlineRetentionDays: 30, archiveAfterDays: 30, deleteAfterDays: 180,
    action: 'COMPACT', archiveFormat: 'PARQUET' },
];

export async function seedRetentionPolicies(prisma: PrismaClient): Promise<void> {
  for (const p of POLICIES) {
    const existing = await prisma.dataRetentionPolicy.findFirst({
      where: { tableName: p.tableName, dataClass: p.dataClass, gameId: null, mode: null },
    });
    const data = {
      tableName: p.tableName, dataClass: p.dataClass, gameId: null, mode: null,
      onlineRetentionDays: p.onlineRetentionDays,
      archiveAfterDays: p.archiveAfterDays,
      deleteAfterDays: p.deleteAfterDays,
      action: p.action, archiveFormat: p.archiveFormat,
      enabled: true,
    };
    if (existing) {
      await prisma.dataRetentionPolicy.update({ where: { id: existing.id }, data });
    } else {
      await prisma.dataRetentionPolicy.create({ data });
    }
  }
  console.log(`   ${POLICIES.length} retention policies`);
}
