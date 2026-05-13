import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService) {}

  generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  signAccessToken(payload: { userId: string; username: string; role: string; sessionId: string }): string {
    return this.jwt.sign({
      sub: payload.userId,
      username: payload.username,
      role: payload.role,
      sessionId: payload.sessionId,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify(token);
  }
}
