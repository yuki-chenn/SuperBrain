import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';

interface JwtPayload {
  sub: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-minimum-16-chars',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, status: true },
    });
    if (!user) throw new UnauthorizedException({ error: 'user-not-found' });
    if (user.status !== 'ACTIVE') throw new UnauthorizedException({ error: 'account-not-active' });
    return { id: user.id, email: user.email, username: user.username, sessionId: payload.sid };
  }
}
