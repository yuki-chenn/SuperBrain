# rule: 实现 GameRuntimeAdapter（后端 + 前端）

每个游戏需要一对 adapter：服务端权威、客户端 UI 桥接。

## 服务端

文件：`apps/api/src/games/<game>/<game>.adapter.ts`

```ts
@Injectable()
export class <Game>Adapter implements GameRuntimeAdapter, OnModuleInit {
  engineKey = '<game>';
  constructor(private registry: GameAdapterRegistry, private prisma: PrismaService) {}
  onModuleInit() { this.registry.register(this); }

  async startAttempt(input): Promise<StartAttemptResult> {
    // GENERATED：调用 generator 产 initialState；写 generatedContentHash
    // CURATED：从 Puzzle/PuzzleVersion 选一个；写 puzzleId / puzzleVersionId
    return {
      seed?: '...',
      initialState: {...},
      contentResolvedType: 'GENERATED' | 'CURATED',
      puzzleId?, puzzleVersionId?, generatedContentHash?,
      maxDurationMs: input.difficulty?.maxDurationMs ?? 默认,
    };
  }

  async finishAttempt(input): Promise<FinishAttemptResult> {
    // 调引擎 validator；返回 { passed, scoreValue, durationMs, metrics, antiCheatFlags, validatorKey }
  }

  async verifySubmission?(input): Promise<VerifySubmissionResult> {
    // 中间提交（life REGION、PCB ROUND、AC COMMAND）
    // 返回 { accepted, reason?, result, metricsDelta?, snapshot?, finalReady? }
  }
}
```

`<game>.module.ts` 仅 `providers: [<Game>Adapter], exports: [<Game>Adapter]`，并 `imports: [PrismaModule]` 即可（registry 是 `@Global` 模块）。

把 `<Game>Module` 加进 `apps/api/src/games/games.module.ts` 的 `imports`。

## 客户端

文件：`apps/web/src/challenge/adapters/<game>.adapter.ts`

```ts
export const <game>Adapter = {
  engineKey: '<game>',
  // 渲染游戏 UI 时需要的配置（按需扩）
  buildSubmissionPayload(localState, intent): { type, payload, hints? },
};
```

在 `apps/web/src/challenge/adapters/registry.ts` 注册（map by engineKey）。`ChallengePlayHost` 用它桥接：心跳 / 提交都走 `useChallengeRuntimeStore` + `challengeApi`。

## 中间提交协议

- SubmissionType 枚举（共享）：`FINAL`、`STEP`、`ROUND`、`REGION`、`COMMAND`、`CHECKPOINT`。
- 客户端：`POST /api/challenges/:id/submissions { type, payload, idempotencyKey, playSessionId, roundIndex?, regionId?, seq? }`。
- 服务端：`SubmissionsService` → adapter `verifySubmission` → 写 `GameSubmission` 并按 `metricsDelta` 累加 attempt.metricsSummary、按 `snapshot` 写 AttemptSnapshot。

## 错误模式

| 情况 | 适配器返回 | 服务端响应 |
|---|---|---|
| 不支持的 SubmissionType | `{ accepted: false, reason: 'submission-type-not-supported' }` | HTTP 200 with `accepted=false`（仍记 GameSubmission） |
| 引擎抛异常 | 抛出 | 服务端 finish 路径 CAS → INVALIDATED + 审计 |
| 反作弊命中 | finishAttempt 返回 `passed: true, antiCheatFlags: [...]` | CAS → REVIEW_REQUIRED + AdminReviewTask（Change 6） |

## 测试

- 单元：纯逻辑覆盖在引擎包中即可。
- e2e（推荐）：写一个最小 `start → claim → heartbeat → submit (REGION/ROUND/COMMAND) → finish` 的 supertest 流程。
