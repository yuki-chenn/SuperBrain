import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class PermissionCacheService {
  private readonly PREFIX = 'perm:';
  private readonly TTL = 600; // 10 minutes

  constructor(private redis: RedisService) {}

  async get(userId: string): Promise<string[] | null> {
    const raw = await this.redis.getClient().get(`${this.PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  }

  async set(userId: string, keys: string[]): Promise<void> {
    await this.redis.getClient().set(
      `${this.PREFIX}${userId}`,
      JSON.stringify(keys),
      'EX',
      this.TTL,
    );
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.getClient().del(`${this.PREFIX}${userId}`);
  }

  async invalidateMany(userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    const keys = userIds.map((id) => `${this.PREFIX}${id}`);
    await this.redis.getClient().del(...keys);
  }
}
