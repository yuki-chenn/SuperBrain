import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';

interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private tokenService: TokenService,
    private sessionService: SessionService,
  ) {}

  async register(dto: { email: string; username: string; password: string }, ctx?: RequestContext) {
    const existingEmail = await this.users.findByEmail(dto.email);
    if (existingEmail) throw new ConflictException('Email already registered');

    const existingUsername = await this.users.findByUsername(dto.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.users.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });

    const { session, rawRefreshToken } = await this.sessionService.createSession(user.id, ctx);
    const accessToken = this.tokenService.signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async login(dto: { emailOrUsername: string; password: string }, ctx?: RequestContext) {
    const user = await this.users.findByEmailOrUsername(dto.emailOrUsername);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('User is not active');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.users.updateLastLoginAt(user.id);

    const { session, rawRefreshToken } = await this.sessionService.createSession(user.id, ctx);
    const accessToken = this.tokenService.signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId: session.id,
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(rawToken: string, ctx?: RequestContext) {
    if (!rawToken) throw new UnauthorizedException('AUTH_REFRESH_TOKEN_MISSING');

    const { session, shouldRevokeFamily, familyId } =
      await this.sessionService.findValidSessionByRefreshToken(rawToken);

    if (!session) {
      if (shouldRevokeFamily && familyId) {
        await this.sessionService.revokeFamily(familyId, 'REUSE_DETECTED');
      }
      throw new UnauthorizedException('AUTH_REFRESH_TOKEN_INVALID');
    }

    if (session.user.status !== 'ACTIVE') {
      await this.sessionService.revokeSession(session.id, 'USER_BANNED');
      throw new UnauthorizedException('User is not active');
    }

    const { session: newSession, rawRefreshToken } =
      await this.sessionService.rotateSession(session.id, session.userId, ctx);

    const accessToken = this.tokenService.signAccessToken({
      userId: session.user.id,
      username: session.user.username,
      role: session.user.role,
      sessionId: newSession.id,
    });

    return {
      user: this.sanitizeUser(session.user),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async logout(rawToken: string) {
    if (!rawToken) return;
    const { session } = await this.sessionService.findValidSessionByRefreshToken(rawToken);
    if (session) {
      await this.sessionService.revokeSession(session.id, 'LOGOUT');
    }
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeAllUserSessions(userId, 'LOGOUT_ALL');
  }

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: { id: string; email: string; username: string; role: string; avatarUrl: string | null }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }
}
