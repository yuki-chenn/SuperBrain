import {
  CallHandler, ConflictException, ExecutionContext, Injectable,
  NestInterceptor, BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { IDEMPOTENCY_REQUIRED_KEY } from './idempotency.decorator';

const TTL_MS = 24 * 60 * 60_000;
const LOCK_MS = 30_000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const required = this.reflector.getAllAndOverride<boolean>(IDEMPOTENCY_REQUIRED_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    if (req.method === 'GET' || req.method === 'HEAD') return next.handle();

    const key = (req.headers['idempotency-key'] as string | undefined) ?? (req.body?.idempotencyKey as string | undefined);
    if (!key) {
      if (required) throw new BadRequestException({ error: 'idempotency-key-required' });
      return next.handle();
    }
    const userId = req.user?.id as string | undefined;
    if (!userId) return next.handle();

    const requestHash = createHash('sha256')
      .update(req.method).update('|').update(req.originalUrl ?? req.url ?? '').update('|')
      .update(JSON.stringify(req.body ?? {})).update('|').update(userId)
      .digest('hex');

    return from(this.prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key } },
    })).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new ConflictException({ error: 'idempotency-conflict' });
          }
          if (existing.status === 'SUCCEEDED') return of(existing.responseBody);
          if (existing.status === 'PROCESSING' && existing.lockedUntil && existing.lockedUntil > new Date()) {
            throw new ConflictException({ error: 'processing', retryAfterMs: existing.lockedUntil.getTime() - Date.now() });
          }
        }
        return from(this.prisma.idempotencyRecord.upsert({
          where: { userId_key: { userId, key } },
          create: {
            userId, key,
            route: `${req.method} ${req.path ?? req.url}`,
            requestHash, status: 'PROCESSING',
            lockedUntil: new Date(Date.now() + LOCK_MS),
            expiresAt: new Date(Date.now() + TTL_MS),
          },
          update: {
            status: 'PROCESSING', requestHash,
            lockedUntil: new Date(Date.now() + LOCK_MS),
          },
        })).pipe(
          switchMap(() => next.handle().pipe(
            tap({
              next: async (val) => {
                await this.prisma.idempotencyRecord.update({
                  where: { userId_key: { userId, key } },
                  data: { status: 'SUCCEEDED', responseBody: (val ?? null) as any, lockedUntil: null },
                }).catch(() => {});
              },
              error: async () => {
                await this.prisma.idempotencyRecord.update({
                  where: { userId_key: { userId, key } },
                  data: { status: 'FAILED', lockedUntil: null },
                }).catch(() => {});
              },
            }),
            catchError((err) => { throw err; }),
          )),
        );
      }),
    );
  }
}
