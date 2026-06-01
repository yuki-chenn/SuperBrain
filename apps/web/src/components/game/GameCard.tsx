import { Link } from '@tanstack/react-router';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { RadarChart } from '../ui/RadarChart';
import { GAME_DIMENSIONS } from '../../features/games/dimensions';
import type { GameDimension } from '../../features/games/config/types';

interface Game {
  slug: string;
  title: string;
  subtitle?: string | null;
  source?: string | null;
  difficultyLevels?: Array<{ key: string; label: string }>;
  metadata?: { tags?: string[]; estimatedDuration?: string; dimensions?: GameDimension[] } | Record<string, unknown>;
}

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const meta = game.metadata as { tags?: string[]; estimatedDuration?: string; dimensions?: GameDimension[] } | undefined;
  const tags = meta?.tags || [];
  const duration = meta?.estimatedDuration;
  const difficulties = game.difficultyLevels?.length || 0;
  const metaDimensions = meta?.dimensions;
  const dimensions = (metaDimensions && metaDimensions.length > 0) ? metaDimensions : (GAME_DIMENSIONS[game.slug] || []);

  return (
    <Link
      to="/games/$slug"
      params={{ slug: game.slug }}
      className="no-underline text-[var(--sb-text-primary)]"
    >
      <Card hover className="min-h-[220px] flex flex-col gap-4">
        {/* Title + Radar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1">{game.title}</h3>
            {game.subtitle && (
              <p className="text-sm text-[var(--sb-text-secondary)] line-clamp-2">{game.subtitle}</p>
            )}
          </div>
          {dimensions.length > 0 && (
            <RadarChart
              dimensions={dimensions}
              size={72}
              showLabels={false}
              showScale={false}
              className="shrink-0 opacity-80"
            />
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="primary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center gap-4 text-xs text-[var(--sb-text-muted)]">
          <span>{difficulties} 难度</span>
          {duration && <span>{duration}</span>}
          {game.source && <span className="truncate">{game.source}</span>}
        </div>
      </Card>
    </Link>
  );
}
