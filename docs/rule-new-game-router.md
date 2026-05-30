## 1. 新游戏接入规范

未来新增游戏时，不允许重复实现路由控制。新游戏只需要完成以下内容。

### 1.1 后端接入

实现：

```ts
interface GameAdapter {
  startAttempt(input: StartAttemptInput): Promise<StartAttemptResult>
  finishAttempt(attempt: GameAttempt, input: FinishAttemptInput): Promise<FinishAttemptResult>
}
```

如果游戏有实时提交：

```ts
interface RealtimeGameAdapter extends GameAdapter {
  submitStep?(attempt: GameAttempt, input: unknown): Promise<StepSubmitResult>
  submitRound?(attempt: GameAttempt, input: unknown): Promise<RoundSubmitResult>
  validateLiveAction?(attempt: GameAttempt, input: unknown): Promise<LiveActionResult>
}
```

所有实时接口必须校验：

```txt
attempt.status === PLAYING
playSessionId 匹配
userId 匹配
未超时
未放弃
未中断
```

### 1.2 前端接入

实现：

```ts
const newGameRuntimeAdapter: GameRuntimeAdapter = {
  gameSlug: 'new-game',

  createPlayPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/play`
  },

  createResultPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/result`
  },

  createExpiredPath(input) {
    return `/games/${input.gameSlug}/attempts/${input.attemptId}/expired`
  },

  resetForNewAttempt(input) {
    useNewGameStore.getState().resetForNewAttempt(input)
  },

  cleanupAfterLeave(input) {
    useNewGameStore.getState().cleanupAfterLeave(input.reason)
  },

  cleanupAfterComplete(input) {
    useNewGameStore.getState().cleanupAfterComplete(input.result)
  },

  canSubmit() {
    return useNewGameStore.getState().canSubmit()
  },

  buildFinishPayload() {
    return useNewGameStore.getState().buildFinishPayload()
  },
}
```

注册：

```ts
gameRuntimeRegistry.register(newGameRuntimeAdapter)
```

### 1.3 游戏 Store 规范

每个游戏 Store 必须暴露：

```ts
type BaseGameStore = {
  attemptId: string | null
  phase:
    | 'idle'
    | 'initializing'
    | 'countdown'
    | 'playing'
    | 'submitting'
    | 'completed'
    | 'abandoned'
    | 'timeout'
    | 'invalid'

  resetForNewAttempt(input: ResetAttemptInput): void
  cleanupAfterLeave(reason: LeaveChallengeReason): void
  cleanupAfterComplete(result: unknown): void
  canSubmit(): boolean
  buildFinishPayload(): unknown
}
```

禁止：

```txt
1. 在游戏组件 mount 时自动 startAttempt。
2. 根据 URL attemptId 自行恢复本地状态。
3. 在游戏 Store 内直接 navigate。
4. 在游戏 Store 内判断服务端 attempt 是否有效。
5. 将 ranked attempt 的 entryToken 存入 localStorage。
```
