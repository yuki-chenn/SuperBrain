import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CookieService {
  private getRefreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    const ttlDays = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10);

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    };
  }

  setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, this.getRefreshCookieOptions());
  }

  clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }
}
