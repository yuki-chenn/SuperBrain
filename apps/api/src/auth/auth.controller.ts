import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { CookieService } from './cookie.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodPipe } from '../common/pipes/zod.pipe';
import { RegisterSchema, LoginSchema } from '@brain-games/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
  ) {}

  private getContext(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  @Post('register')
  async register(
    @Body(new ZodPipe(RegisterSchema)) body: { email: string; username: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body, this.getContext(req));
    if (result.refreshToken) this.cookieService.setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Throttle({ login: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(
    @Body(new ZodPipe(LoginSchema)) body: { emailOrUsername: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body, this.getContext(req));
    if (result.refreshToken) this.cookieService.setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.refresh_token;
    const result = await this.authService.refresh(token, this.getContext(req));
    if (result.refreshToken) this.cookieService.setRefreshTokenCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.refresh_token;
    await this.authService.logout(token);
    this.cookieService.clearRefreshTokenCookie(res);
    return { success: true };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: { id: string }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(user.id);
    this.cookieService.clearRefreshTokenCookie(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }
}
