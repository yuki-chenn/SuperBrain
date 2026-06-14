import { Injectable } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class CookieService {
  private getRefreshCookieName(client?: string): string {
    return client === 'admin' ? 'admin_refresh_token' : 'refresh_token';
  }

  private getRefreshCookieOptions(client?: string) {
    const isProd = process.env.NODE_ENV === 'production';
    const ttlDays = client === 'admin'
      ? parseInt(process.env.ADMIN_REFRESH_TTL_DAYS || '7', 10)
      : parseInt(process.env.GAME_REFRESH_TTL_DAYS || '14', 10);

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/api/auth',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    };
  }

  setRefreshTokenCookie(res: Response, token: string, client?: string) {
    res.cookie(this.getRefreshCookieName(client), token, this.getRefreshCookieOptions(client));
  }

  clearRefreshTokenCookie(res: Response, client?: string) {
    res.clearCookie(this.getRefreshCookieName(client), { path: '/api/auth' });
  }
}
