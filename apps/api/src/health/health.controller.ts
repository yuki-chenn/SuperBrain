import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  @Get('healthz')
  liveness() { return { status: 'ok', ts: new Date().toISOString() }; }

  @Get('readyz')
  async readiness() {
    const checks: Record<string, { ok: boolean; error?: string }> = {};
    try { await this.prisma.$queryRaw`SELECT 1`; checks.postgres = { ok: true }; }
    catch (err) { checks.postgres = { ok: false, error: (err as Error).message }; }
    try { const r = await this.redis.getClient().ping(); checks.redis = { ok: r === 'PONG' }; }
    catch (err) { checks.redis = { ok: false, error: (err as Error).message }; }
    const ok = Object.values(checks).every((c) => c.ok);
    if (!ok) {
      return { status: 'unready', checks };
    }
    return { status: 'ready', checks };
  }
}
