import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type GameAttempt, type LeaderboardDefinition } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PeriodResolverService } from './period-resolver.service';

interface RankInputs { rankValue: number; tieValue1?: number; tieValue2?: number; tieValue3?: number; }

@Injectable()
export class ScoreRecordingService {
  private readonly logger = new Logger(ScoreRecordingService.name);

  constructor(private prisma: PrismaService, private periods: PeriodResolverService) {}

  /**
   * Records score for an eligible attempt across applicable boards.
   * Caller must invoke inside the same transaction as the attempt completion.
   */
  async recordScores(
    attempt: GameAttempt,
    metricsSummary: Record<string, unknown>,
    tx: Prisma.TransactionClient,
  ): Promise<Array<{ leaderboardSlug: string; recorded: boolean; currentRank?: number }>> {
    if (attempt.scoreEligibility !== 'ELIGIBLE' || !attempt.scoreValue) return [];

    const boards = await tx.leaderboardDefinition.findMany({
      where: {
        gameId: attempt.gameId,
        status: 'ACTIVE', visible: true,
        OR: [
          { mode: null }, { mode: attempt.mode },
        ],
        AND: [
          { OR: [{ difficultyId: null }, { difficultyId: attempt.difficultyId }] },
          { OR: [{ puzzleId: null }, { puzzleId: attempt.puzzleId }] },
        ],
      },
    });

    const results: Array<{ leaderboardSlug: string; recorded: boolean; currentRank?: number }> = [];
    for (const board of boards) {
      const inputs = this.computeRankInputs(board, attempt, metricsSummary);
      const period = await this.periods.getOrCreatePeriod(
        board.id, board.periodType, attempt.completedAt ?? new Date(),
        'Asia/Shanghai', tx,
      );

      // INSERT ScoreRecord (idempotent on (leaderboardId, attemptId))
      const score = await tx.scoreRecord.upsert({
        where: { leaderboardId_attemptId: { leaderboardId: board.id, attemptId: attempt.id } },
        update: {},
        create: {
          leaderboardId: board.id, periodId: period.id,
          attemptId: attempt.id, userId: attempt.userId, gameId: attempt.gameId,
          difficultyId: attempt.difficultyId, puzzleId: attempt.puzzleId, puzzleVersionId: attempt.puzzleVersionId,
          rankValue: new Prisma.Decimal(inputs.rankValue),
          tieValue1: inputs.tieValue1 != null ? new Prisma.Decimal(inputs.tieValue1) : null,
          tieValue2: inputs.tieValue2 != null ? new Prisma.Decimal(inputs.tieValue2) : null,
          tieValue3: inputs.tieValue3 != null ? new Prisma.Decimal(inputs.tieValue3) : null,
          metrics: metricsSummary as any,
          submittedAt: attempt.submittedAt ?? new Date(),
        },
      });

      // BEST_PER_USER upsert (direction-aware compare)
      let updatedBest = false;
      if (board.entryPolicy === 'BEST_PER_USER') {
        const existing = await tx.leaderboardBest.findUnique({
          where: { leaderboardId_periodId_userId: { leaderboardId: board.id, periodId: period.id, userId: attempt.userId } },
        });
        const isAsc = board.rankDirection === 'ASC';
        const isBetter = !existing || this.compareBetter(
          inputs, existing.rankValue, existing.tieValue1, existing.tieValue2, existing.tieValue3, isAsc,
        );
        if (isBetter) {
          await tx.leaderboardBest.upsert({
            where: { leaderboardId_periodId_userId: { leaderboardId: board.id, periodId: period.id, userId: attempt.userId } },
            update: {
              scoreRecordId: score.id, attemptId: attempt.id,
              rankValue: new Prisma.Decimal(inputs.rankValue),
              tieValue1: inputs.tieValue1 != null ? new Prisma.Decimal(inputs.tieValue1) : null,
              tieValue2: inputs.tieValue2 != null ? new Prisma.Decimal(inputs.tieValue2) : null,
              tieValue3: inputs.tieValue3 != null ? new Prisma.Decimal(inputs.tieValue3) : null,
              metrics: metricsSummary as any,
            },
            create: {
              leaderboardId: board.id, periodId: period.id, userId: attempt.userId,
              scoreRecordId: score.id, attemptId: attempt.id,
              rankValue: new Prisma.Decimal(inputs.rankValue),
              tieValue1: inputs.tieValue1 != null ? new Prisma.Decimal(inputs.tieValue1) : null,
              tieValue2: inputs.tieValue2 != null ? new Prisma.Decimal(inputs.tieValue2) : null,
              tieValue3: inputs.tieValue3 != null ? new Prisma.Decimal(inputs.tieValue3) : null,
              metrics: metricsSummary as any,
            },
          });
          updatedBest = true;
        }
      }

      results.push({ leaderboardSlug: board.slug, recorded: true });
    }
    return results;
  }

  private computeRankInputs(
    board: LeaderboardDefinition,
    attempt: GameAttempt,
    metrics: Record<string, unknown>,
  ): RankInputs {
    const pick = (k: string): number | undefined => {
      if (k === 'durationMs') return attempt.durationMs ?? undefined;
      if (k === 'completedAt') return attempt.completedAt ? new Date(attempt.completedAt).getTime() : undefined;
      if (k === 'scoreValue') return attempt.scoreValue ? Number(attempt.scoreValue) : undefined;
      const v = metrics[k];
      if (typeof v === 'number') return v;
      return undefined;
    };
    const rankValue = pick(board.rankMetric) ?? 0;
    const ties = (board.tieBreakers as Array<{ metric: string }> | null) ?? [];
    return {
      rankValue,
      tieValue1: ties[0]?.metric ? pick(ties[0].metric) : undefined,
      tieValue2: ties[1]?.metric ? pick(ties[1].metric) : undefined,
      tieValue3: ties[2]?.metric ? pick(ties[2].metric) : undefined,
    };
  }

  private compareBetter(
    n: RankInputs,
    rv: Prisma.Decimal, t1: Prisma.Decimal | null, t2: Prisma.Decimal | null, t3: Prisma.Decimal | null,
    isAsc: boolean,
  ): boolean {
    const cmp = (a?: number, b?: number) => {
      if (a == null && b == null) return 0;
      if (a == null) return isAsc ? 1 : -1;
      if (b == null) return isAsc ? -1 : 1;
      return isAsc ? a - b : b - a;
    };
    const seq: Array<[number?, number?]> = [
      [n.rankValue, Number(rv)],
      [n.tieValue1, t1 ? Number(t1) : undefined],
      [n.tieValue2, t2 ? Number(t2) : undefined],
      [n.tieValue3, t3 ? Number(t3) : undefined],
    ];
    for (const [a, b] of seq) {
      const c = cmp(a, b);
      if (c < 0) return true;
      if (c > 0) return false;
    }
    return false;
  }
}
