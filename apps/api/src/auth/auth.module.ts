import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { CookieService } from './cookie.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-minimum-16-chars',
      signOptions: { expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, SessionService, CookieService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
