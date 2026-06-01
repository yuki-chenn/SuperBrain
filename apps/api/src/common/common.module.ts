import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { RedisLockService } from './redis-lock.service';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [RedisLockService],
  exports: [RedisLockService],
})
export class CommonModule {}
