# SuperBrain 前端总览（apps/web 玩家端 / apps/admin 管理端）

> **状态**：Change 7 阶段。Web 玩家端的 **Challenge Runtime Gateway** 层（统一挑战路由/store/心跳/广播）已就位；admin 端 RBAC 守卫已切换到 permission-key。各游戏的具体 UI 接入仍混合 — 旧的游戏页面经 `// @ts-nocheck` 过渡；新增游戏建议直接走 `apps/web/src/challenge/` 适配器模式。
> **真理源**：`apps/web/src/challenge/`、`apps/web/src/app/router.tsx`、`apps/admin/src/`。

---

## 1. 仓库布局

```
apps/web/                                      玩家端 (Vite + React + TanStack Router/Query + Zustand)
├── src/main.tsx
├── src/app/
│   ├── router.tsx                             路由树（code-based，未启用 file-based）
│   └── routes/                                各路由组件 + ProtectedRoute / PublicOnlyRoute
├── src/challenge/                             ★ Change 3/7 引入的统一挑战层
│   ├── core/
│   │   ├── challenge-types.ts
│   │   ├── challenge-runtime-store.ts         Zustand 本地 UI 状态
│   │   ├── challenge-navigation-manager.ts    beginChallenge / claim / submit / leave
│   │   ├── challenge-route-guard.ts           （TanStack Router beforeLoad 助手；可在路由中调用）
│   │   ├── challenge-blocker.ts               LeaveChallengeDialog + sendBeacon (TODO 完整化)
│   │   ├── challenge-heartbeat.ts             useChallengeHeartbeat(intervalSec)
│   │   ├── challenge-broadcast.ts             useChallengeBroadcast(attemptId)
│   │   └── challenge-errors.ts
│   ├── api/
│   │   ├── challenge-api.ts                   /api/challenges/* 客户端
│   │   └── challenge-query-keys.ts
│   ├── adapters/
│   │   ├── game-runtime-adapter.ts            （客户端接口；buildSubmissionPayload 等）
│   │   └── registry.ts                        （4 个游戏 adapter 注册点）
│   └── components/
│       ├── ChallengeStartPage.tsx             /games/$slug/start
│       ├── ChallengePlayHost.tsx              /games/$slug/attempts/$id/play
│       ├── ChallengeResultPage.tsx            .../result
│       └── ChallengeExpiredPage.tsx           .../expired
├── src/features/                               遗留：分游戏的页面（Change 7 之后逐步迁入 challenge 层）
│   ├── auth/                                   登录、注册、auth-store
│   └── games/<slug>/                           原 /play 页面（暂保留，UI 改造在后续迭代）
├── src/components/layout/                      TopNav 等通用 UI（permissionKeys 替换 user.role 已完成）
└── src/lib/api-client.ts                       全局 fetch + JWT + refresh

apps/admin/                                    管理后台
├── src/app/                                    路由 + 守卫；登录后按 permissionKeys 校验
├── src/features/auth, users, games, puzzles, leaderboards, audit, ...
├── src/lib/api-client.ts
└── src/stores/                                 admin 用 zustand auth-store
```

---

## 2. 路由约定（玩家端）

| 路径 | 用途 | 鉴权 |
|---|---|---|
| `/` | 首页 | `PublicOnlyRoute` |
| `/login` `/register` | 登录注册 | `PublicOnlyRoute` |
| `/games` `/games/$slug` | 游戏目录 | `ProtectedRoute` |
| **`/games/$gameSlug/start`** | 开始挑战页（选择难度+模式） | `ProtectedRoute` |
| **`/games/$gameSlug/attempts/$attemptId/play`** | Host shell + claim + 心跳 + broadcast | `ProtectedRoute` |
| **`/games/$gameSlug/attempts/$attemptId/result`** | 结果页 | `ProtectedRoute` |
| **`/games/$gameSlug/attempts/$attemptId/expired`** | 终止页 | `ProtectedRoute` |
| `/games/sliding-puzzle/play` 等 | 遗留路由（Change 7 后建议改为重定向到 `/start`） | `ProtectedRoute` |
| `/games/$slug/leaderboards` | 排行榜 | `ProtectedRoute` |

**进入 `/play` 的硬约束**：必须经 `/start` 跳转并携带 `entryToken`（RANKED/DAILY 仅内存；PRACTICE 可 sessionStorage）。直接打开 `/play` URL → claim 失败 → 自动跳到 `/expired`（reason=`no-entry-token`）。

---

## 3. ChallengeRuntimeStore（Zustand）

```ts
{
  phase: 'idle'|'starting'|'countdown'|'playing'|'submitting'|'done'|'expired'|'error';
  attemptId, attemptStatus, mode, gameSlug;
  entryToken, playSessionId;
  initialState;
  startedAt, expiresAt, remainingMs;
  conflictDetected, errorReason;
}
```

**关键原则**：store 只是本地 UI 状态。是否能继续游戏由服务端 `/status` 决定 —— 路由守卫每次进入 challenge 路由都重新 fetch。

---

## 4. 心跳 + 广播

- `useChallengeHeartbeat(5)`：每 5s POST 心跳。`accepted=false` → store.phase='expired'。
- `useChallengeBroadcast(attemptId)`：开 `BroadcastChannel('challenge:'+attemptId)`，发 `{type:'claim', playSessionId}`。收到不同 playSessionId → 当前页放弃 + 跳 `/expired?reason=tab-conflict`。
- 离开 `/play`：在 `ChallengeBlocker`（TODO：连 LeaveChallengeDialog）确认放弃；浏览器关闭用 `navigator.sendBeacon` 兜底。

---

## 5. 提交流程（统一）

```
adapter.buildSubmissionPayload(localState, intent)
  → { type, payload, hints? }
useChallengeSubmission().mutate({...})
  → POST /api/challenges/:id/submissions
    body: { type, payload, idempotencyKey: cuid(), playSessionId, roundIndex?, regionId?, seq? }
  → 服务端 SubmissionsService → adapter.verifySubmission → GameSubmission/AttemptSnapshot
  → 响应 { accepted, submission, finalReady? }
  当 finalReady → SPA 启用 “提交结果” 按钮 → POST /finish
```

> 注：当前批次仅完成 SubmissionsController 后端 + 4 个 adapter 的 `verifySubmission`；**前端各游戏 store 改造为统一 endpoint 仍是后续迭代**（详 Change 7 §6）。已通过 `// @ts-nocheck` 让旧游戏页保持可编译。

---

## 6. Auth 接入

- `apps/web/src/features/auth/auth-store.ts`：保存 `accessToken` + `user`。
- 登录返回 `user.permissionKeys: string[]`。
- 受保护路由 `<ProtectedRoute>` 检查 `accessToken`；权限敏感按钮 / 菜单使用 `user.permissionKeys.includes('xxx')`。
- 401 自动尝试 `/api/auth/refresh`（cookie），成功重发原请求；失败则跳登录。

admin 端等价：`apps/admin/src/stores/`、`features/auth/`，权限按钮统一用 `permissionKeys`（已替换全部 `user.role === 'ADMIN'` 检查）。

---

## 7. API 客户端

`apps/web/src/lib/api-client.ts` 提供 `apiRequest<T>(path, options)`，自动加 Bearer + cookies。  
challenge 层 + features 都通过它发起请求。  
所有 mutating 端点建议带 `Idempotency-Key` 头（Change 6 已上 IdempotencyInterceptor）。

---

## 8. 已知遗留与后续

| 项 | 状态 |
|---|---|
| 旧 `/games/$slug/play` 重定向到 `/start` | 未做（仍渲染遗留组件） |
| 各游戏 store 改用 `/submissions` 端点 | 未做（用 `// @ts-nocheck` 临时让 TS 通过） |
| `LeaveChallengeDialog` 与 `sendBeacon` | 未做（接口预留） |
| Admin SPA `/catalog/*`、`/puzzles/$id/versions/$vid/edit`、`/review-tasks` UI | 未做 |
| 内容编辑器（life region / PCB board / 3D maze） | 未做 |
| 客户端 broadcast 在 RANKED 双开下的 UX 文案 | 占位 |

这些不阻塞引入新游戏 — 后端契约已就绪，前端 UI 是迭代项。

---

## 9. 与其他 Overview 的关系

- 路由背后的 API：`Overview-Challenge-Runtime.md`。
- Auth/RBAC 的前端守卫：`Overview-Auth-Identity.md` §6。
- 排行榜 SPA 接入：`Overview-Leaderboard.md` §4。
- 数据模型：`Overview-Database.md`。
