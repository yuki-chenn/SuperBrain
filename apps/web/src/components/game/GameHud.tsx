interface HudItem {
  label: string;
  value: string | number;
  emphasize?: boolean;
}

interface GameHudProps {
  items: HudItem[];
}

export function GameHud({ items }: GameHudProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="bg-[var(--sb-bg-elevated)] rounded-xl p-4 border border-[var(--sb-border)]">
          <div className="text-xs text-[var(--sb-text-muted)] mb-1">{item.label}</div>
          <div
            className={`font-mono tabular-nums ${
              item.emphasize ? 'text-3xl font-bold' : 'text-xl font-semibold'
            } text-[var(--sb-text-primary)]`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
