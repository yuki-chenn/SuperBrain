interface Difficulty {
  key: string;
  label: string;
  description?: string;
}

interface DifficultySelectorProps {
  levels: Difficulty[];
  value: string;
  onChange: (key: string) => void;
}

export function DifficultySelector({ levels, value, onChange }: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {levels.map((level) => (
        <button
          key={level.key}
          onClick={() => onChange(level.key)}
          className={`px-4 py-2 rounded-[var(--sb-radius-button)] text-sm font-medium cursor-pointer border transition-[var(--sb-transition)] ${
            value === level.key
              ? 'bg-[var(--sb-primary)] text-white border-[var(--sb-primary)]'
              : 'bg-[var(--sb-bg-elevated)] text-[var(--sb-text-secondary)] border-[var(--sb-border)] hover:border-[var(--sb-primary)]'
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
