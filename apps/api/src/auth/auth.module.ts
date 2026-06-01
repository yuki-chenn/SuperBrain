import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AuthSessionService } from './auth-session.service';
import { CookieService } from './cookie.service';
import { JwtStrategy } from './jwt.strategy';
import { PermissionService } from './permission.service';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-minimum-16-chars',
      signOptions: { expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as any },
    }),
    ThrottlerModule.forRoot([{ name: 'login', ttl: 60_000, limit: 5 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    TokenService,
    CookieService,
    JwtStrategy,
    PermissionService,
  ],
  exports: [AuthService, PermissionService, AuthSessionService],
})
export class AuthModule {}
