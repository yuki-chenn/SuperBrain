高优先级（直接影响性能）
1. 用户权限缓存
现状：permission.service.ts 每次鉴权都查数据库，走 4 表 join


// 每个需要 @RequirePermission 的请求都执行这条查询
const rows = await this.prisma.permission.findMany({
  where: {
    rolePermissions: {
      some: { role: { userRoles: { some: { userId } } } },
    },
  },
});
用 Redis：用户登录时写入 SETEX perm:{userId} 300 [keys]，鉴权时直接读。角色/权限变更时删除对应用户的缓存。

2. 幂等性检查
现状：每个 POST 请求都查 IdempotencyRecord 表（SELECT + UPSERT）

用 Redis：SETNX idem:{userId}:{key} {hash} EX 86400，一次原子操作搞定，比数据库快一个数量级。数据库记录可以异步写入用于审计。

3. 挑战会话锁
现状：RedisLockService 已实现但未调用。挑战创建、提交时可能有并发问题

用 Redis：challenges.service.ts 已经注入了 RedisLockService，在创建挑战时加锁：


await this.lock.withLock(`attempt:create:${userId}`, 5000, async () => {
  // 检查是否已有活跃挑战
  // 创建新挑战
});
中优先级（提升体验）
4. 排行榜
现状：排行榜数据存在 PostgreSQL，每次查询都要排序计算

用 Redis Sorted Set：ZADD leaderboard:{id} {score} {userId}，排名查询变成 ZREVRANK（O(logN)），Top N 查询变成 ZREVRANGE（O(logN+M)）。这是 Redis 最经典的场景。

5. 限流
现状：用 NestJS 内置 ThrottlerGuard，单进程内存计数。多实例部署时每个实例独立计数，限流不准

用 Redis：滑动窗口限流 INCR + EXPIRE，多实例共享同一个计数器。

6. 题目/游戏配置缓存
现状：游戏配置、规则集版本、难度等数据变化不频繁，但每次挑战都要查

用 Redis：配置变更时写入缓存，挑战时直接读。admin-games.service.ts 的 activateRuleSet 等方法在激活新版本时清除缓存即可。

低优先级（当前够用）
7. 心跳状态
现状：心跳写 GameAttempt.lastHeartbeatAt，超时检查查数据库

用 Redis：SETEX heartbeat:{attemptId} 15 true，超时检查用 TTL 自动过期，不需要定时任务扫表。

8. 活跃挑战状态
现状：查用户是否有活跃挑战要查 GameAttempt 表

用 Redis：SET active:{userId} {attemptId}，创建时写入，完成时删除，查询 O(1)。

总结
功能	当前方案	Redis 方案	收益
权限缓存	每次 4 表 join	SET/GET	减少 90%+ 数据库查询
幂等检查	SELECT + UPSERT	SETNX	单次操作，快 10 倍
挑战锁	未实现	SET NX PX	防止并发创建
排行榜	PostgreSQL 排序	Sorted Set	O(logN) 排名查询
限流	进程内存	INCR + EXPIRE	多实例共享
配置缓存	每次查数据库	SET/GET	减少重复查询
心跳	写数据库	SETEX + TTL	自动过期，无需扫表
最值得先做的是权限缓存和排行榜，前者每个请求都受益，后者是 Redis 最擅长的场景。


=====================

1. 页面结构
- 顶部放置统计卡片：
  - Active Sessions：当前有效会话数量
  - Expired Sessions：已过期会话数量
  - Revoked Sessions：已撤销会话数量
  - Expiring Soon：24 小时内即将过期的会话数量
- 统计卡片下方放置筛选区
- 主体区域使用高级数据表格
- 点击某一行后，右侧打开详情抽屉 Drawer，展示该会话完整信息和生命周期时间线

2. 筛选和搜索
需要支持以下筛选条件：
- 按 status 筛选
- 按 userId 搜索
- 按 session id 搜索
- 按 refreshTokenFamilyId 搜索
- 按 ipAddress 搜索
- 按 createdAt 时间范围筛选
- 按 expiresAt 时间范围筛选
- 支持只看“即将过期”“长期未使用”“已被替换”的会话
- 支持重置筛选条件

3. 表格字段设计
主表不要机械展示所有字段，而是按审计场景组织信息。表格列包括：

- Session：展示 id 的短格式，例如 ckl...9a2，支持复制完整 id
- User：展示 userId，若有关联用户信息则优先展示用户名/邮箱，下面小字展示 userId
- Status：用 Badge 展示状态，不同状态使用不同视觉样式
- Device：从 userAgent 中解析浏览器、操作系统、设备类型；如果无法解析则显示 Unknown
- IP Address：展示 ipAddress，支持复制；空值显示 "-"
- Token Family：展示 refreshTokenFamilyId 的短格式，支持复制完整值
- Expires At：展示过期时间，并在 24 小时内过期时给出 warning 标记
- Last Used At：展示最近使用时间，空值显示 Never used
- Created At：展示创建时间
- Revoked：如果 revokedAt 存在，展示 revokedAt 和 revokedReason 的摘要
- Replacement：如果 replacedBySessionId 存在，展示“Replaced”标记并支持跳转到替代会话详情
- Actions：查看详情、撤销会话、撤销同 family 的所有会话、复制 Session ID

4. 敏感字段处理
- refreshTokenHash 属于敏感字段，主表默认不要展示完整值
- 详情抽屉中也不要直接展示完整 refreshTokenHash，只展示脱敏形式，例如 sha256: abcd****7890
- 提供 Copy Hash 按钮时必须要求二次确认，并且只有拥有 SUPER_ADMIN 权限的用户可见
- 不允许编辑 refreshTokenHash
- 不允许通过 UI 修改 userId、createdAt、lastUsedAt 等系统字段
- 所有撤销操作都需要二次确认，并要求填写 revokedReason
- 所有敏感操作都需要记录 audit log

5. 详情抽屉 Drawer 设计
点击表格行后，在右侧打开详情面板，分成以下几个 section：

A. Basic Information
- id
- userId
- status
- createdAt
- expiresAt
- lastUsedAt

B. Client Information
- userAgent 原始字符串
- 解析后的 Browser / OS / Device
- ipAddress

C. Token Information
- refreshTokenFamilyId
- refreshTokenHash 脱敏显示
- replacedBySessionId
- 如果 replacedBySessionId 存在，提供“查看替代会话”入口

D. Revocation Information
- revokedAt
- revokedReason
- 如果未撤销，则显示 Not revoked

E. Lifecycle Timeline
用时间线展示：
- Created
- Last Used
- Replaced
- Revoked
- Expires

6. 状态视觉设计
- ACTIVE：绿色 Badge
- EXPIRED：灰色 Badge
- REVOKED：红色 Badge
- 即将过期：橙色提示
- 长期未使用：黄色提示
- 被替换：蓝色标记

7. 操作设计
需要支持：
- Revoke Session：撤销当前会话
- Revoke Token Family：撤销同一个 refreshTokenFamilyId 下的所有会话
- Copy Session ID
- Copy User ID
- Copy Token Family ID
- View User Detail：跳转用户详情页
- View Replacement Session：跳转 replacedBySessionId 对应的会话

撤销会话时弹出确认 Modal：
- 显示 session id、userId、ipAddress、device、lastUsedAt
- 要求管理员填写 revokedReason
- 确认按钮使用危险操作样式
- 成功后刷新表格并更新状态

8. 表格交互
- 支持分页
- 支持按 createdAt、expiresAt、lastUsedAt 排序
- 支持列显隐设置
- 支持密度切换：comfortable / compact
- 支持导出 CSV，但导出时 refreshTokenHash 必须脱敏
- 空状态需要显示“暂无会话数据”
- 加载状态使用 skeleton
- 错误状态显示可重试提示

9. 推荐布局
顶部：
[页面标题 + 描述 + 刷新按钮]

第二行：
[Active Sessions] [Expired Sessions] [Revoked Sessions] [Expiring Soon]

第三行：
[Search Input] [Status Filter] [Date Range] [Advanced Filters] [Reset]

主体：
高级数据表格

右侧：
点击行后出现 Session Detail Drawer