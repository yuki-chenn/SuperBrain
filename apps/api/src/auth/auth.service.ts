import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { AuthSessionService } from './auth-session.service';
import { PermissionService } from './permission.service';

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private tokenService: TokenService,
    private sessionService: AuthSessionService,
    private permissions: PermissionService,
  ) {}

  async register(dto: { email: string; username: string; password: string }, ctx?: RequestContext) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException({ error: 'email-taken' });
    }
    if (await this.users.findByUsername(dto.username)) {
      throw new ConflictException({ error: 'username-taken' });
    }
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.users.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });
    return this.issueSession(user, ctx);
  }

  async login(dto: { emailOrUsername: string; password: string }, ctx?: RequestContext) {
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user) throw new UnauthorizedException({ error: 'invalid-credentials' });
    if (user.status === 'BANNED') throw new ForbiddenException({ error: 'account-banned' });
    if (user.status === 'DELETED') throw new UnauthorizedException({ error: 'invalid-credentials' });

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException({ error: 'invalid-credentials' });

    await this.users.updateLastLoginAt(user.id);
    return this.issueSession(user, ctx);
  }

  async refresh(rawToken: string, ctx?: RequestContext) {
    if (!rawToken) throw new UnauthorizedException({ error: 'refresh-missing' });

    const result = await this.sessionService.findValidSessionByRefreshToken(rawToken);

    // Grace window: replay returns the just-rotated new session's tokens.
    if (!result.session && (result as any).recentRotation) {
      const newSession = (result as any).recentRotation;
      const accessToken = this.tokenService.signAccessToken({
        sub: newSession.userId,
        sid: newSession.id,
      });
      const permissionKeys = await this.permissions.getUserPermissionKeys(newSession.userId);
      // Note: we can't reissue the SAME refresh token (we don't store it plaintext).
      // Returning the new session id allows the client to keep its replaced-by cookie if any.
      return {
        user: this.sanitize(newSession.user, permissionKeys),
        accessToken,
        refreshToken: undefined,
      };
    }

    if (!result.session) {
      if (result.shouldRevokeFamily && result.familyId) {
        await this.sessionService.revokeFamily(result.familyId, 'family-compromised');
      }
      throw new UnauthorizedException({ error: 'family-compromised' });
    }

    if (result.session.user.status !== 'ACTIVE') {
      await this.sessionService.revokeSession(result.session.id, 'user-not-active');
      throw new UnauthorizedException({ error: 'account-not-active' });
    }

    const { session: newSession, rawRefreshToken } = await this.sessionService.rotateSession(
      result.session.id,
      result.session.userId,
      ctx,
    );

    const accessToken = this.tokenService.signAccessToken({
      sub: result.session.user.id,
      sid: newSession.id,
    });
    const permissionKeys = await this.permissions.getUserPermissionKeys(result.session.user.id);

    return {
      user: this.sanitize(result.session.user, permissionKeys),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async logout(rawToken: string) {
    if (!rawToken) return;
    const { session } = await this.sessionService.findValidSessionByRefreshToken(rawToken);
    if (session) {
      await this.sessionService.revokeSession(session.id, 'user-logout');
    }
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeAllUserSessions(userId, 'logout-all');
  }

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    const permissionKeys = await this.permissions.getUserPermissionKeys(user.id);
    return this.sanitize(user, permissionKeys);
  }

  private async issueSession(user: { id: string; username: string }, ctx?: RequestContext) {
    const { session, rawRefreshToken } = await this.sessionService.createSession(user.id, ctx);
    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      sid: session.id,
    });
    const permissionKeys = await this.permissions.getUserPermissionKeys(user.id);
    const fullUser = await this.users.findById(user.id);
    return {
      user: this.sanitize(fullUser!, permissionKeys),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private sanitize(
    user: {
      id: string;
      email: string;
      username: string;
      displayName?: string | null;
      avatarUrl: string | null;
      status: string;
    },
    permissionKeys: string[],
  ) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl,
      status: user.status,
      permissionKeys,
    };
  }
}
