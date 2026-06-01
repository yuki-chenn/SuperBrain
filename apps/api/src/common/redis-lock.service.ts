import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';

const RELEASE_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export class LockBusyError extends Error {
  constructor(public lockKey: string) { super(`lock-busy:${lockKey}`); }
}

@Injectable()
export class RedisLockService {
  constructor(private redis: RedisService) {}

  async acquire(key: string, ttlMs: number): Promise<string> {
    const client = this.redis.getClient();
    const token = randomUUID();
    for (let i = 0; i < 4; i++) {
      const r = await client.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');
      if (r === 'OK') return token;
      await new Promise((res) => setTimeout(res, 50));
    }
    throw new LockBusyError(key);
  }

  async release(key: string, token: string): Promise<boolean> {
    const client = this.redis.getClient();
    const r = await client.eval(RELEASE_LUA, 1, `lock:${key}`, token);
    return r === 1;
  }

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const token = await this.acquire(key, ttlMs);
    try { return await fn(); } finally { await this.release(key, token).catch(() => {}); }
  }
}
