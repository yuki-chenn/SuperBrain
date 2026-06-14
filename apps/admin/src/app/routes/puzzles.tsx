import { useQuery } from '@tanstack/react-query';
import { adminListGamesApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function PuzzlesPage() {
  const { openTab } = useTabStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-games-for-puzzles'],
    queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">题目配置</h1>

      {isLoading ? (
        <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
      ) : data && data.items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((game) => (
            <Card key={game.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--sb-text-primary)]">{game.title}</h3>
                  <p className="text-xs text-[var(--sb-text-muted)] font-mono">{game.slug}</p>
                </div>
                <Badge variant="default">{game.puzzleCount} 题</Badge>
              </div>
              <p className="text-sm text-[var(--sb-text-muted)] line-clamp-2 mb-3">{game.description}</p>
              <Button size="sm" variant="secondary" onClick={() => {
                openTab({ id: `/puzzles/${game.id}`, title: `题库-${game.title}`, path: `/puzzles/${game.id}` });
              }}>
                配置题库 →
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-8">暂无游戏</div>
      )}
    </div>
  );
}
