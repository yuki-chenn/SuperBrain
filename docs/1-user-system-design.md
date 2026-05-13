# 用户系统详细设计：高鲁棒登录态与会话管理

## 1. 目标

设计一个稳定、可维护、可扩展的用户系统，解决以下问题：

1. 登录后刷新页面不会丢失登录态。
2. 浏览器回退不会误判为未登录。
3. access token 过期后可以自动刷新。
4. refresh token 安全存储，避免 XSS 窃取。
5. 支持多标签页登录态同步。
6. 支持主动退出登录、全端退出、token 轮换和异常复用检测。
7. 前后端职责清晰，方便后续扩展用户资料、权限、管理员系统、封禁、设备管理等功能。

---

## 2. 设计结论

认证方案采用：

```txt
Access Token: JWT，短有效期，只存在前端内存
Refresh Token: opaque random token，存在 httpOnly cookie
Session: 服务端数据库持久化 refresh token hash
User State: 前端内存状态 + /auth/me 恢复
```

不要把 access token 或 refresh token 存入：

```txt
localStorage
sessionStorage
IndexedDB
普通 JS 可读 cookie
```

原因：

1. `localStorage` 容易被 XSS 读取。
2. `sessionStorage` 刷新虽然不丢，但仍可被 XSS 读取。
3. httpOnly cookie 无法被前端 JavaScript 读取，更适合保存 refresh token。
4. access token 只放内存，降低长期泄露风险。
5. 页面刷新后，通过 refresh cookie 重新换取 access token。

最终登录态恢复链路：

```txt
浏览器刷新
  ↓
React 应用启动
  ↓
AuthProvider 执行 bootstrap
  ↓
POST /api/auth/refresh，浏览器自动携带 httpOnly refresh cookie
  ↓
后端校验 Session + refresh token hash
  ↓
返回新的 access token
  ↓
前端调用 GET /api/auth/me 或直接使用 refresh response 中的 user
  ↓
恢复 user 状态
  ↓
路由守卫允许访问受保护页面
```

---

## 3. 当前问题的典型原因

当前“登录后刷新或回退立刻退出登录态”，通常由以下原因之一导致：

```txt
原因 A：登录状态只存在 React/Zustand 内存中
```

刷新页面后 JS 运行时重建，内存状态清空。

```txt
原因 B：access token 只存在内存中，但没有 refresh 机制
```

刷新后没有 access token，也没有恢复流程。

```txt
原因 C：有 refresh cookie，但前端请求没带 cookie
```

fetch 缺少：

```ts
credentials: "include"
```

axios 缺少：

```ts
withCredentials: true
```

```txt
原因 D：后端 CORS 没有允许 credentials
```

后端必须配置：

```ts
credentials: true,
origin: WEB_ORIGIN
```

不能在带 credentials 时使用：

```ts
origin: "*"
```

```txt
原因 E：路由守卫过早重定向
```

应用启动时还没完成 `/auth/refresh`，路由守卫就判断：

```ts
user === null
```

然后跳转 `/login`。

正确做法是区分：

```ts
authStatus: "bootstrapping" | "authenticated" | "anonymous"
```

只有 `anonymous` 才能跳转登录页，`bootstrapping` 时不能重定向。

---

## 4. 后端数据模型

推荐使用 `Session` 模型，而不是只使用 `RefreshToken` 模型。原因是后续可以扩展设备管理、全端退出、异常登录检测、管理员踢下线等能力。

### 4.1 User 模型

```prisma
enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BANNED
  DELETED
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  username     String     @unique
  passwordHash String
  avatarUrl    String?
  role         UserRole   @default(USER)
  status       UserStatus @default(ACTIVE)
  lastLoginAt  DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  sessions     Session[]
  attempts     GameAttempt[]
  entries      LeaderboardEntry[]
}
```

### 4.2 Session 模型

```prisma
model Session {
  id                   String    @id @default(cuid())
  userId               String
  refreshTokenHash     String    @unique
  refreshTokenFamilyId String
  userAgent            String?
  ipAddress            String?
  expiresAt            DateTime
  revokedAt            DateTime?
  revokedReason        String?
  replacedBySessionId  String?
  lastUsedAt           DateTime?
  createdAt            DateTime  @default(now())

  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([refreshTokenFamilyId])
  @@index([expiresAt])
  @@index([revokedAt])
}
```

字段含义：

| 字段 | 含义 |
|---|---|
| `id` | 当前 session ID |
| `userId` | 所属用户 |
| `refreshTokenHash` | refresh token 哈希，不保存明文 |
| `refreshTokenFamilyId` | 同一次登录的 token family，用于检测复用 |
| `userAgent` | 登录设备 UA |
| `ipAddress` | 登录 IP |
| `expiresAt` | session 过期时间 |
| `revokedAt` | 被撤销时间 |
| `revokedReason` | 撤销原因 |
| `replacedBySessionId` | refresh rotation 后的新 session |
| `lastUsedAt` | 最近一次 refresh 时间 |

`revokedReason` 建议使用这些值：

```ts
type SessionRevokedReason =
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "ROTATED"
  | "REUSE_DETECTED"
  | "EXPIRED"
  | "ADMIN_REVOKED"
  | "USER_BANNED";
```

---

## 5. Token 设计

### 5.1 Access Token

Access token 使用 JWT。

有效期：

```txt
15 minutes
```

Payload：

```ts
export interface AccessTokenPayload {
  sub: string;        // userId
  username: string;
  role: "USER" | "ADMIN";
  sessionId: string;
  jti: string;
  iat: number;
  exp: number;
}
```

签名密钥：

```env
JWT_ACCESS_SECRET="replace-me-access-secret"
JWT_ACCESS_TTL="15m"
```

特点：

1. 只存在前端内存。
2. 每次 API 请求通过 `Authorization` header 携带。
3. 过期后由前端自动调用 `/auth/refresh`。
4. 后端可以通过 `sessionId` 进一步检查 session 是否仍有效。
5. 用户被封禁或 session 被撤销后，即使 JWT 未过期，也可以拒绝请求。

---

### 5.2 Refresh Token

Refresh token 不使用 JWT，使用随机 opaque token。

生成方式：

```ts
import crypto from "crypto";

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("base64url");
}
```

数据库中只保存 hash：

```ts
import crypto from "crypto";

export function hashRefreshToken(token: string, pepper: string): string {
  return crypto
    .createHash("sha256")
    .update(`${token}.${pepper}`)
    .digest("hex");
}
```

环境变量：

```env
REFRESH_TOKEN_PEPPER="replace-me-refresh-pepper"
JWT_REFRESH_TTL_DAYS="30"
```

Refresh token 只通过 httpOnly cookie 保存。

---

## 6. Cookie 设计

Cookie 名称：

```txt
refresh_token
```

推荐 cookie path：

```txt
/api/auth
```

这样 `/api/auth/refresh` 和 `/api/auth/logout` 都可以访问 cookie。

### 6.1 开发环境

前端：

```txt
http://localhost:5173
```

后端：

```txt
http://localhost:3000
```

Cookie 配置：

```ts
const refreshCookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
```

### 6.2 生产环境，同站点部署

例如：

```txt
https://brain.example.com
https://brain.example.com/api
```

Cookie 配置：

```ts
const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
```

### 6.3 生产环境，子域名部署

例如：

```txt
https://app.example.com
https://api.example.com
```

两者属于 same-site，可以继续使用：

```ts
sameSite: "lax",
secure: true
```

如果需要让 cookie 在多个子域可用，可以设置：

```ts
domain: ".example.com"
```

但如果 refresh cookie 只需要 API 域名使用，通常不需要手动设置 `domain`。

### 6.4 跨站点部署

例如：

```txt
https://brain-game.com
https://brain-api.net
```

此时需要：

```ts
const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
```

不推荐跨站点部署，因为会增加：

1. CORS 配置复杂度。
2. CSRF 防护复杂度。
3. 浏览器第三方 cookie 策略兼容问题。
4. 本地调试难度。

---

## 7. 后端 API 设计

统一前缀：

```txt
/api/auth
```

### 7.1 POST `/api/auth/register`

注册用户。

Request：

```ts
interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}
```

Response：

```ts
interface AuthResponse {
  user: CurrentUser;
  accessToken: string;
}
```

行为：

1. 校验 email、username、password。
2. 检查 email 是否已存在。
3. 检查 username 是否已存在。
4. 使用 Argon2id hash password。
5. 创建 User。
6. 创建 Session。
7. 生成 refresh token。
8. 保存 refresh token hash。
9. 设置 httpOnly refresh cookie。
10. 返回 access token 和 user。

---

### 7.2 POST `/api/auth/login`

登录。

Request：

```ts
interface LoginRequest {
  emailOrUsername: string;
  password: string;
}
```

Response：

```ts
interface AuthResponse {
  user: CurrentUser;
  accessToken: string;
}
```

行为：

1. 根据 email 或 username 查询用户。
2. 校验用户是否存在。
3. 校验用户状态是否为 `ACTIVE`。
4. 使用 Argon2id verify password。
5. 更新 `lastLoginAt`。
6. 创建 Session。
7. 生成 refresh token。
8. 设置 refresh cookie。
9. 返回 access token 和 user。

不要返回具体错误：

```txt
邮箱不存在
密码错误
```

统一返回：

```txt
Invalid credentials
```

避免账号枚举。

---

### 7.3 POST `/api/auth/refresh`

刷新 access token。

Request：

```txt
无 body
```

浏览器自动携带：

```txt
Cookie: refresh_token=...
```

Response：

```ts
interface RefreshResponse {
  user: CurrentUser;
  accessToken: string;
}
```

行为：

1. 从 cookie 读取 refresh token。
2. 如果没有 refresh token，返回 `401 AUTH_REFRESH_TOKEN_MISSING`。
3. hash refresh token。
4. 查询 Session。
5. 如果 Session 不存在，执行 refresh token reuse 检测逻辑。
6. 如果 Session 已 revoked，执行 reuse 检测逻辑。
7. 如果 Session 已过期，返回 `401 AUTH_REFRESH_TOKEN_EXPIRED`。
8. 查询 User。
9. 如果 User 不存在或非 `ACTIVE`，撤销 session 并返回 401。
10. 执行 refresh token rotation：
    - 创建新的 refresh token。
    - 创建新的 Session 或更新当前 Session。
    - 推荐创建新 Session，并把旧 Session 标记为 `ROTATED`。
11. 设置新的 refresh cookie。
12. 返回新的 access token 和 user。

推荐 rotation 策略：

```txt
每次 refresh 都生成新的 refresh token
旧 session 标记 revokedReason = ROTATED
新 session 继承 refreshTokenFamilyId
旧 session.replacedBySessionId = 新 session.id
```

---

### 7.4 POST `/api/auth/logout`

退出当前设备。

Request：

```txt
无 body
```

行为：

1. 从 cookie 读取 refresh token。
2. 如果存在 refresh token，则 hash 后查找 session。
3. 如果 session 存在，设置：
   - `revokedAt = now`
   - `revokedReason = LOGOUT`
4. 清除 refresh cookie。
5. 返回成功。

Response：

```ts
interface LogoutResponse {
  success: true;
}
```

即使 refresh token 不存在，也返回成功。Logout 应该是幂等的。

---

### 7.5 POST `/api/auth/logout-all`

退出所有设备。

需要 access token。

行为：

1. 获取当前 userId。
2. 撤销该用户所有未 revoked 且未过期的 sessions。
3. 当前响应清除 refresh cookie。
4. 返回成功。

---

### 7.6 GET `/api/auth/me`

获取当前用户。

需要 access token。

Response：

```ts
interface MeResponse {
  user: CurrentUser;
}
```

如果 access token 有效但 session 已撤销，返回 401。

---

## 8. 后端 AuthService 核心流程

### 8.1 登录流程

```ts
async function login(input: LoginInput, context: RequestContext) {
  const user = await findUserByEmailOrUsername(input.emailOrUsername);

  if (!user) {
    throw new UnauthorizedException("Invalid credentials");
  }

  if (user.status !== "ACTIVE") {
    throw new ForbiddenException("User is not active");
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);

  if (!passwordValid) {
    throw new UnauthorizedException("Invalid credentials");
  }

  const session = await createSession({
    userId: user.id,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
  });

  const accessToken = signAccessToken({
    user,
    sessionId: session.id,
  });

  return {
    user: toCurrentUser(user),
    accessToken,
    refreshToken: session.rawRefreshToken,
  };
}
```

---

### 8.2 Refresh 流程

```ts
async function refresh(refreshToken: string, context: RequestContext) {
  if (!refreshToken) {
    throw new UnauthorizedException("Missing refresh token");
  }

  const refreshTokenHash = hashRefreshToken(refreshToken, env.REFRESH_TOKEN_PEPPER);

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash },
    include: { user: true },
  });

  if (!session) {
    throw new UnauthorizedException("Invalid refresh token");
  }

  if (session.revokedAt) {
    await handleRefreshTokenReuse(session);
    throw new UnauthorizedException("Refresh token revoked");
  }

  if (session.expiresAt <= new Date()) {
    await revokeSession(session.id, "EXPIRED");
    throw new UnauthorizedException("Refresh token expired");
  }

  if (session.user.status !== "ACTIVE") {
    await revokeSession(session.id, "USER_BANNED");
    throw new UnauthorizedException("User is not active");
  }

  const nextSession = await rotateSession({
    previousSession: session,
    context,
  });

  const accessToken = signAccessToken({
    user: session.user,
    sessionId: nextSession.id,
  });

  return {
    user: toCurrentUser(session.user),
    accessToken,
    refreshToken: nextSession.rawRefreshToken,
  };
}
```

---

### 8.3 Refresh Token Reuse Detection

当一个已经被 rotation 的 refresh token 再次出现，说明可能出现：

1. 网络重试导致旧 token 被重复使用。
2. 多标签页并发 refresh。
3. refresh token 被窃取。
4. 客户端请求竞态。

MVP 可以采用保守策略：

```txt
如果 revoked session 的 revokedReason 是 ROTATED，
并且短时间内再次使用旧 token，
允许判断为并发 refresh，不立刻封禁整个 family。
```

更严格策略：

```txt
一旦检测到已 revoked refresh token 被使用，
撤销整个 refreshTokenFamilyId 下所有 sessions。
```

推荐第一版采用中间策略：

```ts
const REUSE_GRACE_PERIOD_MS = 10_000;
```

规则：

1. 如果旧 session 是 `ROTATED`。
2. 且 `revokedAt` 距当前时间小于 10 秒。
3. 且有 `replacedBySessionId`。
4. 则可以返回 401，让前端重新走一次 refresh，不立即撤销 family。

否则：

1. 撤销整个 `refreshTokenFamilyId`。
2. 要求用户重新登录。

伪代码：

```ts
async function handleRefreshTokenReuse(session: Session) {
  const now = Date.now();

  const isRecentRotation =
    session.revokedReason === "ROTATED" &&
    session.revokedAt &&
    now - session.revokedAt.getTime() < 10_000;

  if (isRecentRotation) {
    return;
  }

  await prisma.session.updateMany({
    where: {
      refreshTokenFamilyId: session.refreshTokenFamilyId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: "REUSE_DETECTED",
    },
  });
}
```

---

## 9. 后端 Guard 设计

### 9.1 JwtAuthGuard

职责：

1. 解析 `Authorization: Bearer <token>`。
2. 验证 JWT 签名和过期时间。
3. 读取 payload。
4. 查询用户。
5. 查询 session 是否仍有效。
6. 将 user 和 session 挂到 request。

不要只验证 JWT，不查 session。否则用户 logout 后，旧 access token 在过期前仍可使用。

伪代码：

```ts
async function validate(payload: AccessTokenPayload) {
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedException();
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new UnauthorizedException();
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    sessionId: session.id,
  };
}
```

代价：

1. 每个受保护请求都要查一次 DB。
2. 可以后续用 Redis 缓存 session 状态优化。
3. MVP 阶段优先正确性，不优先极限性能。

---

## 10. 后端 CORS 配置

NestJS `main.ts`：

```ts
app.enableCors({
  origin: env.WEB_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

注意：

```ts
credentials: true
```

时不能使用：

```ts
origin: "*"
```

`.env`：

```env
WEB_ORIGIN="http://localhost:5173"
```

---

## 11. 前端状态模型

前端 auth 状态不能只有：

```ts
user: User | null
```

必须有显式状态机：

```ts
type AuthStatus =
  | "bootstrapping"
  | "authenticated"
  | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  accessToken: string | null;
}
```

状态含义：

| 状态 | 含义 |
|---|---|
| `bootstrapping` | 应用启动中，正在尝试恢复登录态 |
| `authenticated` | 已登录 |
| `anonymous` | 确认未登录 |

刷新页面后初始状态必须是：

```ts
{
  status: "bootstrapping",
  user: null,
  accessToken: null
}
```

不能默认是：

```ts
{
  status: "anonymous",
  user: null
}
```

否则路由守卫会过早跳转登录页。

---

## 12. 前端启动恢复流程

在应用最外层放 `AuthProvider`。

```tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}
```

`bootstrap` 逻辑：

```ts
async function bootstrap() {
  set({ status: "bootstrapping" });

  try {
    const res = await authApi.refresh();

    set({
      status: "authenticated",
      user: res.user,
      accessToken: res.accessToken,
    });
  } catch {
    set({
      status: "anonymous",
      user: null,
      accessToken: null,
    });
  }
}
```

`authApi.refresh()` 必须带 cookie：

```ts
export async function refresh() {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  return res.json();
}
```

---

## 13. 前端路由守卫

错误写法：

```tsx
if (!user) {
  return <Navigate to="/login" />;
}
```

正确写法：

```tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();

  if (status === "bootstrapping") {
    return <FullPageLoading />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

登录页也要处理已登录状态：

```tsx
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuthStore();

  if (status === "bootstrapping") {
    return <FullPageLoading />;
  }

  if (status === "authenticated") {
    return <Navigate to="/games" replace />;
  }

  return <>{children}</>;
}
```

这样刷新和回退时不会误跳转。

---

## 14. 前端 API Client 设计

所有 API 请求统一经过 `apiClient`。

### 14.1 基础请求

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status !== 401) {
    return handleResponse<T>(res);
  }

  return retryAfterRefresh<T>(path, options);
}
```

### 14.2 401 自动 refresh + retry

```ts
let refreshPromise: Promise<void> | null = null;

async function retryAfterRefresh<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    await refreshPromise;
  } catch {
    useAuthStore.getState().setAnonymous();
    throw new Error("Unauthorized");
  }

  const accessToken = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const retryRes = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  return handleResponse<T>(retryRes);
}
```

### 14.3 refreshAccessToken

```ts
async function refreshAccessToken() {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  const data = await res.json();

  useAuthStore.getState().setAuthenticated({
    user: data.user,
    accessToken: data.accessToken,
  });
}
```

关键点：

1. 多个请求同时 401 时，只发起一次 refresh。
2. refresh 成功后，所有请求复用新的 access token retry。
3. refresh 失败后，统一进入 anonymous 状态。
4. 不要每个 API hook 自己处理 401。

---

## 15. Zustand Auth Store

```ts
interface CurrentUser {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string | null;
}

type AuthStatus = "bootstrapping" | "authenticated" | "anonymous";

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  accessToken: string | null;

  bootstrap: () => Promise<void>;
  setAuthenticated: (input: {
    user: CurrentUser;
    accessToken: string;
  }) => void;
  setAnonymous: () => void;
  login: (input: LoginRequest) => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}
```

实现要点：

```ts
export const useAuthStore = create<AuthState>((set, get) => ({
  status: "bootstrapping",
  user: null,
  accessToken: null,

  async bootstrap() {
    set({ status: "bootstrapping" });

    try {
      const data = await authApi.refresh();

      set({
        status: "authenticated",
        user: data.user,
        accessToken: data.accessToken,
      });
    } catch {
      set({
        status: "anonymous",
        user: null,
        accessToken: null,
      });
    }
  },

  setAuthenticated(input) {
    set({
      status: "authenticated",
      user: input.user,
      accessToken: input.accessToken,
    });
  },

  setAnonymous() {
    set({
      status: "anonymous",
      user: null,
      accessToken: null,
    });
  },

  async login(input) {
    const data = await authApi.login(input);

    set({
      status: "authenticated",
      user: data.user,
      accessToken: data.accessToken,
    });

    broadcastAuthEvent("login");
  },

  async register(input) {
    const data = await authApi.register(input);

    set({
      status: "authenticated",
      user: data.user,
      accessToken: data.accessToken,
    });

    broadcastAuthEvent("login");
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      set({
        status: "anonymous",
        user: null,
        accessToken: null,
      });

      broadcastAuthEvent("logout");
    }
  },
}));
```

---

## 16. 多标签页同步

问题：

1. A 标签页 logout。
2. B 标签页仍显示登录。
3. B 标签页继续用旧 access token 请求。
4. 体验不一致。

解决：使用 `BroadcastChannel`。

```ts
const authChannel = new BroadcastChannel("auth");

export function broadcastAuthEvent(type: "login" | "logout") {
  authChannel.postMessage({ type });
}

export function listenAuthEvents() {
  authChannel.onmessage = async (event) => {
    if (event.data?.type === "logout") {
      useAuthStore.getState().setAnonymous();
    }

    if (event.data?.type === "login") {
      await useAuthStore.getState().bootstrap();
    }
  };
}
```

在应用启动时调用：

```ts
useEffect(() => {
  listenAuthEvents();
}, []);
```

降级方案：

如果不想用 `BroadcastChannel`，可以用 `window.addEventListener("storage")`，但这需要写 localStorage 事件。注意不要把 token 写进去，只写事件标记。

```ts
localStorage.setItem("auth_event", JSON.stringify({
  type: "logout",
  ts: Date.now(),
}));
```

---

## 17. React Query 配合

登录、退出后需要清理或刷新 query cache。

### 17.1 登录成功

```ts
queryClient.invalidateQueries();
```

或者只刷新：

```ts
queryClient.invalidateQueries({ queryKey: ["me"] });
queryClient.invalidateQueries({ queryKey: ["leaderboards"] });
```

### 17.2 退出登录

```ts
queryClient.clear();
```

退出后必须清理用户相关缓存，避免另一个用户登录后看到前一个用户的数据。

---

## 18. Auth DTO / Schema

建议在 `packages/shared` 定义 Zod schema。

```ts
import { z } from "zod";

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z
    .string()
    .min(10)
    .max(128),
});

export const LoginRequestSchema = z.object({
  emailOrUsername: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
});

export const CurrentUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  role: z.enum(["USER", "ADMIN"]),
  avatarUrl: z.string().url().nullable().optional(),
});

export const AuthResponseSchema = z.object({
  user: CurrentUserSchema,
  accessToken: z.string(),
});
```

密码复杂度是否强制数字、大小写、特殊字符，由产品决定。MVP 不建议过度复杂，只要求长度和常见弱密码过滤即可。

---

## 19. 密码安全

使用 Argon2id。

```ts
import argon2 from "argon2";

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
```

不要自己加盐。Argon2 会处理 salt。

可选增强：

1. 弱密码字典检查。
2. 登录失败次数限制。
3. 同 IP 限流。
4. 同账号限流。
5. 邮箱验证后才允许上榜。

---

## 20. 限流设计

至少对以下接口限流：

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout-all
```

推荐策略：

### 登录限流

按 IP：

```txt
10 requests / minute
```

按账号：

```txt
5 failed attempts / 10 minutes
```

### 注册限流

按 IP：

```txt
5 requests / hour
```

### Refresh 限流

按 IP 或 session：

```txt
60 requests / minute
```

Refresh 不要太严格，否则多标签页和网络抖动容易误伤。

---

## 21. CSRF 设计

因为 refresh token 使用 cookie，所以需要考虑 CSRF。

MVP 推荐：

1. refresh cookie 设置 `SameSite=Lax`。
2. 所有状态变更接口使用 JSON request body。
3. CORS 只允许指定 `WEB_ORIGIN`。
4. 不允许 wildcard origin。
5. 对高风险接口可后续加 CSRF token。

高风险接口：

```txt
POST /api/auth/logout-all
POST /api/users/change-password
DELETE /api/users/me
```

如果后续需要强 CSRF 防护，可以使用 double-submit cookie：

```txt
csrf_token: 非 httpOnly cookie
X-CSRF-Token: 请求头
```

但 MVP 阶段可以先不做，前提是 same-site 部署和严格 CORS。

---

## 22. 错误码规范

不要只返回字符串错误，建议统一错误结构：

```ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

认证错误码：

```ts
export const AuthErrorCode = {
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  USER_BANNED: "AUTH_USER_BANNED",
  ACCESS_TOKEN_MISSING: "AUTH_ACCESS_TOKEN_MISSING",
  ACCESS_TOKEN_EXPIRED: "AUTH_ACCESS_TOKEN_EXPIRED",
  ACCESS_TOKEN_INVALID: "AUTH_ACCESS_TOKEN_INVALID",
  REFRESH_TOKEN_MISSING: "AUTH_REFRESH_TOKEN_MISSING",
  REFRESH_TOKEN_EXPIRED: "AUTH_REFRESH_TOKEN_EXPIRED",
  REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
  SESSION_REVOKED: "AUTH_SESSION_REVOKED",
} as const;
```

前端处理逻辑：

| 错误 | 前端行为 |
|---|---|
| access token expired | 自动 refresh |
| refresh token expired | 清空登录态，跳转登录 |
| invalid credentials | 登录表单展示错误 |
| user banned | 展示账号不可用 |
| session revoked | 清空登录态 |

---

## 23. 登录态状态机

```txt
[bootstrapping]
  ├── refresh success → [authenticated]
  └── refresh failed  → [anonymous]

[anonymous]
  ├── login success    → [authenticated]
  ├── register success → [authenticated]
  └── visit protected route → /login

[authenticated]
  ├── access token valid      → normal request
  ├── access token expired    → refresh
  ├── refresh success         → stay authenticated
  ├── refresh failed          → anonymous
  ├── logout                  → anonymous
  └── session revoked/banned  → anonymous
```

关键原则：

```txt
只有 anonymous 才能跳登录页
bootstrapping 不能跳登录页
```

---

## 24. 前端登录后跳转

登录页支持 redirect 参数：

```txt
/login?redirect=/games/sliding-puzzle/play
```

ProtectedRoute 中：

```tsx
const location = useLocation();

if (status === "anonymous") {
  return (
    <Navigate
      to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
      replace
    />
  );
}
```

登录成功后：

```ts
const redirect = searchParams.get("redirect") ?? "/games";

navigate(redirect, { replace: true });
```

这样用户访问游戏页面时，如果未登录，登录后能回到原页面。

---

## 25. 后端 Controller 结构

```txt
apps/api/src/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  auth.types.ts
  auth.schemas.ts
  jwt.strategy.ts
  jwt-auth.guard.ts
  current-user.decorator.ts
  session.service.ts
  token.service.ts
  cookie.service.ts
```

职责划分：

| 文件 | 职责 |
|---|---|
| `auth.controller.ts` | HTTP 入参、cookie 设置、响应 |
| `auth.service.ts` | register/login/refresh/logout 编排 |
| `session.service.ts` | session 创建、轮换、撤销 |
| `token.service.ts` | access token、refresh token 生成与 hash |
| `cookie.service.ts` | refresh cookie 设置和清理 |
| `jwt.strategy.ts` | JWT 校验 |
| `jwt-auth.guard.ts` | 受保护接口守卫 |
| `current-user.decorator.ts` | 获取当前用户 |

---

## 26. CookieService 示例

```ts
@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService) {}

  getRefreshCookieOptions(): CookieOptions {
    const isProd = this.config.get("NODE_ENV") === "production";

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: this.config.get("COOKIE_SAME_SITE") ?? "lax",
      path: "/api/auth",
      maxAge:
        Number(this.config.get("JWT_REFRESH_TTL_DAYS") ?? 30) *
        24 *
        60 *
        60 *
        1000,
    };
  }

  setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie("refresh_token", refreshToken, this.getRefreshCookieOptions());
  }

  clearRefreshTokenCookie(res: Response) {
    res.clearCookie("refresh_token", {
      path: "/api/auth",
    });
  }
}
```

---

## 27. Controller 示例

```ts
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Post("login")
  async login(
    @Body() body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    this.cookieService.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    const result = await this.authService.refresh(refreshToken, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    this.cookieService.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    await this.authService.logout(refreshToken);

    this.cookieService.clearRefreshTokenCookie(res);

    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: CurrentUser) {
    return { user };
  }
}
```

---

## 28. 环境变量

`.env.example`：

```env
NODE_ENV="development"

WEB_ORIGIN="http://localhost:5173"
API_PORT="3000"

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brain_games?schema=public"
REDIS_URL="redis://localhost:6379"

JWT_ACCESS_SECRET="replace-me-access-secret"
JWT_ACCESS_TTL="15m"

JWT_REFRESH_TTL_DAYS="30"
REFRESH_TOKEN_PEPPER="replace-me-refresh-pepper"

COOKIE_SAME_SITE="lax"
```

生产环境必须替换：

```txt
JWT_ACCESS_SECRET
REFRESH_TOKEN_PEPPER
```

---

## 29. 刷新页面不掉登录态的完整链路

必须满足全部条件。

### 29.1 后端

```ts
app.enableCors({
  origin: env.WEB_ORIGIN,
  credentials: true,
});
```

登录成功时：

```ts
res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/api/auth",
});
```

Refresh 接口能读取：

```ts
req.cookies.refresh_token
```

NestJS 需要启用 cookie parser：

```ts
import cookieParser from "cookie-parser";

app.use(cookieParser());
```

### 29.2 前端

所有请求：

```ts
credentials: "include"
```

应用启动：

```ts
authStore.bootstrap()
```

路由守卫：

```ts
if (status === "bootstrapping") return <Loading />;
if (status === "anonymous") return <Navigate to="/login" />;
```

Access token：

```txt
只存在 Zustand 内存，不持久化
```

Refresh 成功：

```txt
set accessToken + user + authenticated
```

---

## 30. 测试要求

### 30.1 后端测试

必须覆盖：

1. 注册成功后返回 access token，并设置 refresh cookie。
2. 登录成功后返回 access token，并设置 refresh cookie。
3. 错误密码不能登录。
4. refresh token 有效时可以刷新 access token。
5. refresh 后旧 session 被标记为 `ROTATED`。
6. logout 后 session 被标记为 `LOGOUT`。
7. logout 后 refresh 失败。
8. access token 过期后不能访问 protected API。
9. session revoked 后，即使 access token 未过期，也不能访问 protected API。
10. banned 用户不能 refresh。
11. 重复使用已过期 refresh token 返回 401。
12. 多次 refresh 不应产生明文 refresh token 存储。

---

### 30.2 前端测试

必须覆盖：

1. 初始状态为 `bootstrapping`。
2. bootstrap refresh 成功后进入 `authenticated`。
3. bootstrap refresh 失败后进入 `anonymous`。
4. `ProtectedRoute` 在 `bootstrapping` 时不跳转。
5. `ProtectedRoute` 在 `anonymous` 时跳转 `/login`。
6. API 返回 401 后会调用 refresh。
7. refresh 成功后会 retry 原请求。
8. refresh 失败后清空 auth state。
9. logout 后清空 query cache。
10. 多标签页 logout 事件能同步。

---

## 31. Debug Checklist

如果仍然刷新掉登录态，按顺序排查。

### 31.1 浏览器 Application 面板

检查是否存在 cookie：

```txt
refresh_token
```

检查属性：

```txt
HttpOnly: true
Path: /api/auth
SameSite: Lax
Secure: development 下 false，production 下 true
Expires/Max-Age: 正常
```

### 31.2 Network 面板

刷新页面后是否调用：

```txt
POST /api/auth/refresh
```

请求是否带 cookie：

```txt
Cookie: refresh_token=...
```

如果没有 cookie，检查：

1. 前端是否 `credentials: "include"`。
2. 后端是否 `credentials: true`。
3. Cookie `sameSite` 是否错误。
4. Cookie `secure` 是否在 HTTP 本地环境中被设置为 true。
5. Cookie `path` 是否不匹配。

### 31.3 Refresh 响应

检查 `/api/auth/refresh` 是否返回：

```json
{
  "user": "...",
  "accessToken": "..."
}
```

并且响应头是否有：

```txt
Set-Cookie: refresh_token=...
```

### 31.4 前端状态

检查刷新时状态变化是否为：

```txt
bootstrapping → authenticated
```

错误状态是：

```txt
anonymous → login page
```

这说明路由守卫过早执行。

### 31.5 CORS

如果控制台出现：

```txt
The value of the 'Access-Control-Allow-Credentials' header...
```

检查 NestJS：

```ts
app.enableCors({
  origin: "http://localhost:5173",
  credentials: true,
});
```

不能是：

```ts
origin: "*"
```

---

## 32. 最小实现顺序

Claude Code 应按以下顺序改造。

### Step 1：后端 Session 模型

1. 新增 `Session` 表。
2. 删除或替换旧 `RefreshToken` 表。
3. 添加 migration。

### Step 2：TokenService

实现：

```ts
generateRefreshToken()
hashRefreshToken()
signAccessToken()
verifyAccessToken()
```

### Step 3：SessionService

实现：

```ts
createSession()
rotateSession()
revokeSession()
revokeAllUserSessions()
findValidSessionByRefreshToken()
```

### Step 4：CookieService

实现：

```ts
setRefreshTokenCookie()
clearRefreshTokenCookie()
```

### Step 5：Auth API

实现：

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/logout-all
GET  /auth/me
```

### Step 6：JwtAuthGuard

实现：

1. 校验 JWT。
2. 查询 user。
3. 查询 session。
4. 检查 session 未 revoked。
5. 检查 user status。

### Step 7：前端 Auth Store

实现：

```ts
status: "bootstrapping" | "authenticated" | "anonymous"
bootstrap()
login()
register()
logout()
setAuthenticated()
setAnonymous()
```

### Step 8：前端 API Client

实现：

1. 自动带 Authorization。
2. 自动带 cookie。
3. 401 refresh。
4. refresh 成功 retry。
5. refresh 并发锁。

### Step 9：路由守卫

实现：

```tsx
ProtectedRoute
PublicOnlyRoute
```

### Step 10：多标签页同步

实现：

```ts
BroadcastChannel("auth")
```

---

## 33. 验收标准

用户系统完成后必须满足：

1. 登录成功后刷新页面，仍保持登录。
2. 登录成功后浏览器回退，不会误退出。
3. 关闭当前 tab 后重新打开站点，如果 refresh token 未过期，仍能恢复登录。
4. access token 过期后，普通 API 请求自动 refresh 并 retry。
5. refresh token 过期后，前端进入 anonymous 并跳转登录。
6. logout 后刷新页面不会恢复登录。
7. logout 后旧 access token 不能继续访问受保护接口。
8. 多标签页中一个 tab logout，其他 tab 同步变为未登录。
9. 登录后访问 `/login`，自动跳转到 `/games`。
10. 未登录访问受保护页面，跳转 `/login?redirect=...`。
11. 登录后能回到原始 redirect 页面。
12. query cache 不会在用户切换后泄露上一个用户数据。
13. 数据库不保存明文 refresh token。
14. refresh token 每次刷新都会轮换。
15. CORS 和 cookie 在本地开发环境可正常工作。
