import { useTabStore } from '../../stores/useTabStore';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { apiRequest } from '../../lib/api-client';

interface AttemptDetailPageProps {
  attemptId?: string;
}

export default function AttemptDetailPage({ attemptId: attemptIdProp }: AttemptDetailPageProps) {
  const { openTab } = useTabStore();
  const attemptId = attemptIdProp || '';

  const { data: attempt, isLoading } = useQuery({
    queryKey: ['admin-attempt', attemptId],
    queryFn: () => apiRequest<any>(`/admin/attempts/${attemptId}`),
    enabled: !!attemptId,
  });

  if (isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;
  if (!attempt) return <div className="p-6 text-[var(--sb-text-muted)]">记录未找到</div>;

  const metrics = attempt.metrics || {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <button onClick={() => openTab({ id: '/attempts', title: '挑战记录', path: '/attempts' })} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-1 inline-block">&larr; 返回挑战记录</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">挑战详情</h1>
          <Badge variant={attempt.status === 'COMPLETED' ? 'success' : attempt.status === 'STARTED' ? 'primary' : 'danger'}>
            {attempt.status === 'COMPLETED' ? '已完成' : attempt.status === 'STARTED' ? '进行中' : '挑战失败'}
          </Badge>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-[var(--sb-text-muted)]">尝试 ID: </span><span className="font-mono text-[var(--sb-text-primary)] text-xs">{attempt.id}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">用户: </span><span className="text-[var(--sb-text-primary)]">{attempt.user?.username || attempt.username || '-'}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">游戏: </span><Badge variant="default">{attempt.game?.slug || attempt.gameSlug || '-'}</Badge></div>
          <div><span className="text-[var(--sb-text-muted)]">难度: </span><span className="text-[var(--sb-text-primary)]">{attempt.difficultyKey || '-'}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">开始时间: </span><span className="text-[var(--sb-text-primary)]">{new Date(attempt.startedAt).toLocaleString()}</span></div>
          <div><span className="text-[var(--sb-text-muted)]">完成时间: </span><span className="text-[var(--sb-text-primary)]">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : '-'}</span></div>
          {attempt.invalidReason && (
            <div><span className="text-[var(--sb-text-muted)]">失败原因: </span><Badge variant="danger">{attempt.invalidReason}</Badge></div>
          )}
        </div>
      </Card>

      {/* Metrics */}
      <Card>
        <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">指标数据</h2>
        {Object.keys(metrics).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="bg-[var(--sb-bg-muted)] rounded-lg p-3">
                <div className="text-xs text-[var(--sb-text-muted)] mb-1">{key}</div>
                <div className="text-lg font-semibold text-[var(--sb-text-primary)] font-mono">{String(value)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--sb-text-muted)]">暂无指标数据</p>
        )}
      </Card>

      {/* Metadata */}
      {attempt.metadata && Object.keys(attempt.metadata).length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">元数据</h2>
          <pre className="text-xs font-mono text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] rounded-lg p-4 overflow-x-auto max-h-[400px] overflow-y-auto">
            {JSON.stringify(attempt.metadata, null, 2)}
          </pre>
        </Card>
      )}

      {/* Initial State */}
      {attempt.initialState && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">初始状态</h2>
          <pre className="text-xs font-mono text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] rounded-lg p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
            {JSON.stringify(attempt.initialState, null, 2)}
          </pre>
        </Card>
      )}

      {/* Final State */}
      {attempt.finalState && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">最终状态</h2>
          <pre className="text-xs font-mono text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] rounded-lg p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
            {JSON.stringify(attempt.finalState, null, 2)}
          </pre>
        </Card>
      )}

      {/* Move Trace */}
      {attempt.moveTrace && (
        <Card>
          <h2 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-4">移动轨迹</h2>
          <pre className="text-xs font-mono text-[var(--sb-text-secondary)] bg-[var(--sb-bg-muted)] rounded-lg p-4 overflow-x-auto max-h-[300px] overflow-y-auto">
            {JSON.stringify(attempt.moveTrace, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
