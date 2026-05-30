import type { AbsoluteCommandRuntimeState } from '@brain-games/game-engine';

interface InfoPanelProps {
  title: string;
  state: AbsoluteCommandRuntimeState;
  requiredCells: number;
}

export function AbsoluteCommandInfoPanel({
  title,
  state,
  requiredCells,
}: InfoPanelProps) {
  const visitedCount = state.visitedCells.length;
  const progressPct = requiredCells > 0 ? Math.round((visitedCount / requiredCells) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--sb-text-muted)] mb-1">绝对指令</h3>
        <p className="text-sm font-medium text-[var(--sb-text-primary)] truncate">{title}</p>
      </div>

      <div className="space-y-2">
        <HudRow label="步数" value={String(state.commandCount)} emphasize />
        <HudRow label="距离" value={String(state.travelDistance)} />
      </div>

      <div>
        <div className="text-xs text-[var(--sb-text-muted)] mb-1">
          访问进度 {visitedCount} / {requiredCells}
        </div>
        <div className="w-full h-2 bg-[var(--sb-bg-muted)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--sb-primary)] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-[var(--sb-text-muted)] mt-0.5 text-right">
          {progressPct}%
        </div>
      </div>
    </div>
  );
}

function HudRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--sb-text-muted)]">{label}</span>
      <span className={`text-sm font-mono tabular-nums ${emphasize ? 'text-[var(--sb-primary)] font-semibold' : 'text-[var(--sb-text-secondary)]'}`}>
        {value}
      </span>
    </div>
  );
}
