interface Difficulty {
  key: string;
  label: string;
  description?: string;
}

interface DifficultySelectorProps {
  levels: Difficulty[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

export function DifficultySelector({
  levels,
  value,
  onChange,
  disabled = false,
}: DifficultySelectorProps) {
  return (
    <div className="flex gap-2">
      {levels.map((level) => (
        <button
          key={level.key}
          onClick={() => !disabled && onChange(level.key)}
          disabled={disabled}
          className={`px-4 py-2 rounded-[var(--sb-radius-button)] text-sm font-medium border transition-[var(--sb-transition)] ${
            value === level.key
              ? 'bg-[var(--sb-primary)] text-white border-[var(--sb-primary)]'
              : 'bg-[var(--sb-bg-elevated)] text-[var(--sb-text-secondary)] border-[var(--sb-border)] hover:border-[var(--sb-primary)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed hover:border-[var(--sb-border)]' : 'cursor-pointer'}`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
