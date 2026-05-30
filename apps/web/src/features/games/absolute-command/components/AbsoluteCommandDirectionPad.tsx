import type { AbsoluteCommandDirection } from '@brain-games/game-engine';

interface DirectionPadProps {
  onDirection: (direction: AbsoluteCommandDirection) => void;
  disabled?: boolean;
}

const PLANE_BUTTONS: Array<{ direction: AbsoluteCommandDirection; label: string; gridArea: string }> = [
  { direction: 'X_POS', label: '前 X+', gridArea: '1 / 2 / 2 / 3' },
  { direction: 'Y_NEG', label: '左 Y-', gridArea: '2 / 1 / 3 / 2' },
  { direction: 'Y_POS', label: '右 Y+', gridArea: '2 / 3 / 3 / 4' },
  { direction: 'X_NEG', label: '后 X-', gridArea: '3 / 2 / 4 / 3' },
];

export function AbsoluteCommandDirectionPad({ onDirection, disabled }: DirectionPadProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Plane movement */}
      <div>
        <div className="text-[10px] text-[var(--sb-text-muted)] mb-1 text-center">平面</div>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: 'repeat(3, 40px)',
            gridTemplateRows: 'repeat(3, 40px)',
          }}
        >
          {PLANE_BUTTONS.map((btn) => (
            <button
              key={btn.direction}
              style={{ gridArea: btn.gridArea }}
              disabled={disabled}
              onClick={() => onDirection(btn.direction)}
              className="rounded-lg bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
                hover:bg-[var(--sb-primary-soft)] hover:border-[var(--sb-primary)]
                active:scale-95 transition-all text-xs font-mono font-semibold
                text-[var(--sb-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center"
            >
              {btn.label}
            </button>
          ))}
          <div style={{ gridArea: '2 / 2 / 3 / 3' }} className="flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[var(--sb-primary)] opacity-40" />
          </div>
        </div>
      </div>

      {/* Vertical movement */}
      <div>
        <div className="text-[10px] text-[var(--sb-text-muted)] mb-1 text-center">层级</div>
        <div className="flex flex-col gap-1">
          <button
            disabled={disabled}
            onClick={() => onDirection('Z_POS')}
            className="w-14 h-9 rounded-lg bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
              hover:bg-[var(--sb-primary-soft)] hover:border-[var(--sb-primary)]
              active:scale-95 transition-all text-xs font-mono font-semibold
              text-[var(--sb-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            上 Z+
          </button>
          <button
            disabled={disabled}
            onClick={() => onDirection('Z_NEG')}
            className="w-14 h-9 rounded-lg bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)]
              hover:bg-[var(--sb-primary-soft)] hover:border-[var(--sb-primary)]
              active:scale-95 transition-all text-xs font-mono font-semibold
              text-[var(--sb-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下 Z-
          </button>
        </div>
      </div>
    </div>
  );
}
