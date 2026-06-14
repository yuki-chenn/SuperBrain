import { useQuery } from '@tanstack/react-query';
import { adminListGamesApi } from '../../features/games/api';

interface GameFilterProps {
  value: string;
  onChange: (gameId: string) => void;
  className?: string;
}

export function GameFilter({ value, onChange, className = '' }: GameFilterProps) {
  const { data } = useQuery({
    queryKey: ['admin-games-filter'],
    queryFn: () => adminListGamesApi({ pageSize: 200 }),
    staleTime: 60_000,
  });

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--sb-text-primary)] outline-none cursor-pointer ${className}`}
    >
      <option value="">全部游戏</option>
      {data?.items.map((g) => (
        <option key={g.id} value={g.id}>{g.title} ({g.slug})</option>
      ))}
    </select>
  );
}
