import { useQuery } from '@tanstack/react-query';
import { adminListGamesApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export default function PuzzlesPage() {
  const { openTab } = useTabStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-games-for-puzzles'],
    queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">题库管理</h1>

      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((game) => (
            <Card
              key={game.id}
              hover
              onClick={() => {
                if (game.slug === 'absolute-command') {
                  openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--sb-text-primary)]">{game.title}</h3>
                  <p className="text-xs text-[var(--sb-text-muted)] font-mono">{game.slug}</p>
                </div>
                <Badge variant="default">{game.puzzleCount} 题</Badge>
              </div>
              <p className="text-sm text-[var(--sb-text-muted)] line-clamp-2">{game.description}</p>
              <div className="mt-3 text-xs text-[var(--sb-text-muted)]">
                {game.slug === 'absolute-command' ? '点击进入题库管理 →' : '暂不支持管理'}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-8">暂无游戏</div>
      )}
    </div>
  );
}
