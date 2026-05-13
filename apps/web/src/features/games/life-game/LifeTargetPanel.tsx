import type { LocalCellCoord } from '@brain-games/game-engine';
import { LifeRegionAnswerEditor } from './LifeRegionAnswerEditor';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface LifeTargetPanelProps {
  targetRegionIds: number[];
  correctRegionIds: number[];
  activeRegionId: number | null;
  answerDrafts: Record<number, LocalCellCoord[]>;
  answerHints: Record<number, LocalCellCoord[]>;
  onSelectRegion: (regionId: number) => void;
  onToggleCell: (regionId: number, x: number, y: number) => void;
  onSubmit: (regionId: number) => void;
  isSubmitting: boolean;
}

export function LifeTargetPanel({
  targetRegionIds,
  correctRegionIds,
  activeRegionId,
  answerDrafts,
  answerHints,
  onSelectRegion,
  onToggleCell,
  onSubmit,
  isSubmitting,
}: LifeTargetPanelProps) {
  const isAllCorrect = targetRegionIds.every((id) => correctRegionIds.includes(id));

  return (
    <Card>
      <h3 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">
        目标区域
      </h3>

      {/* Region tabs */}
      <div className="flex gap-2 mb-4">
        {targetRegionIds.map((regionId) => {
          const isCorrect = correctRegionIds.includes(regionId);
          const isActive = regionId === activeRegionId;
          return (
            <button
              key={regionId}
              type="button"
              onClick={() => onSelectRegion(regionId)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-[var(--sb-primary)] text-white'
                  : isCorrect
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] hover:bg-[var(--sb-bg-elevated)]'}
              `}
            >
              {isCorrect ? `区域 ${regionId} ✓` : `区域 ${regionId}`}
            </button>
          );
        })}
      </div>

      {/* Active region editor */}
      {activeRegionId && !isAllCorrect && (
        <>
          <LifeRegionAnswerEditor
            regionId={activeRegionId}
            cells={answerDrafts[activeRegionId] || []}
            answerCells={answerHints[activeRegionId]}
            isLocked={correctRegionIds.includes(activeRegionId)}
            onToggle={(x, y) => onToggleCell(activeRegionId, x, y)}
          />
          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              onClick={() => onSubmit(activeRegionId)}
              disabled={isSubmitting || correctRegionIds.includes(activeRegionId)}
              className="w-full"
            >
              {isSubmitting ? '提交中...' : '提交区域'}
            </Button>
          </div>
        </>
      )}

      {isAllCorrect && (
        <div className="text-center py-4">
          <p className="text-green-400 font-semibold">所有区域已完成！</p>
        </div>
      )}
    </Card>
  );
}
