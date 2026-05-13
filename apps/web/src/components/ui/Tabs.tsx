interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-2 border-b border-[var(--sb-border)] pb-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-t text-sm font-medium cursor-pointer border-none transition-[var(--sb-transition)] ${
            activeKey === tab.key
              ? 'bg-[var(--sb-bg-elevated)] text-[var(--sb-text-primary)] shadow-sm'
              : 'bg-transparent text-[var(--sb-text-muted)] hover:text-[var(--sb-text-secondary)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
