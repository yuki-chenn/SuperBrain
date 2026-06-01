import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';

interface AccessTokenPayload {
  sub: string;
  sid?: string;
}

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign({ sub: payload.sub, sid: payload.sid });
  }

  generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
