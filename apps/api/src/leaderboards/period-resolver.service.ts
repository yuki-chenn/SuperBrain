import { Injectable } from '@nestjs/common';
import type { LeaderboardPeriodType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PeriodResolverService {
  constructor(private prisma: PrismaService) {}

  resolveKey(periodType: LeaderboardPeriodType, completedAt: Date, timezone = 'Asia/Shanghai'): {
    periodKey: string; periodStart?: Date; periodEnd?: Date;
  } {
    if (periodType === 'ALL_TIME') return { periodKey: 'all-time' };
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = fmt.formatToParts(completedAt);
    const Y = parts.find((p) => p.type === 'year')!.value;
    const M = parts.find((p) => p.type === 'month')!.value;
    const D = parts.find((p) => p.type === 'day')!.value;

    if (periodType === 'DAILY') {
      return { periodKey: `${Y}-${M}-${D}` };
    }
    if (periodType === 'MONTHLY') return { periodKey: `${Y}-${M}` };
    if (periodType === 'WEEKLY') {
      // ISO week (approximate using JS Date in UTC for stability)
      const d = new Date(Date.UTC(Number(Y), Number(M) - 1, Number(D)));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return { periodKey: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}` };
    }
    if (periodType === 'SEASONAL') {
      const q = Math.ceil(Number(M) / 3);
      return { periodKey: `${Y}-S${q}` };
    }
    return { periodKey: completedAt.toISOString() };
  }

  async getOrCreatePeriod(
    leaderboardId: string, periodType: LeaderboardPeriodType, completedAt: Date,
    timezone = 'Asia/Shanghai', tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const { periodKey } = this.resolveKey(periodType, completedAt, timezone);
    return client.leaderboardPeriod.upsert({
      where: { leaderboardId_periodKey: { leaderboardId, periodKey } },
      update: {},
      create: { leaderboardId, periodType, periodKey, timezone },
    });
  }
}
