import { useRef, useEffect } from 'react';
import { useTabStore } from '../stores/useTabStore';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, closeAllTabs } = useTabStore();
  const closeableCount = tabs.filter((t) => t.closeable).length;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  return (
    <div className="flex items-center border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]">
      <div ref={scrollRef} className="w-0 flex-1 flex items-center overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-4 py-2.5 text-sm cursor-pointer border-r border-[var(--sb-border)] whitespace-nowrap select-none transition-colors shrink-0 ${
                isActive
                  ? 'bg-[var(--sb-bg)] text-[var(--sb-primary)] font-medium border-b-2 border-b-[var(--sb-primary)]'
                  : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] hover:bg-[var(--sb-bg-muted)]'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="max-w-[180px] truncate">{tab.title}</span>
              {tab.closeable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-1 w-4 h-4 flex items-center justify-center rounded text-xs hover:bg-[var(--sb-bg-muted)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)]"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      {closeableCount > 0 && (
        <button
          onClick={closeAllTabs}
          className="px-3 py-2.5 text-xs text-[var(--sb-text-muted)] hover:text-[var(--sb-danger)] hover:bg-[var(--sb-bg-muted)] border-l border-[var(--sb-border)] cursor-pointer shrink-0 whitespace-nowrap"
          title="关闭全部页签"
        >
          关闭全部
        </button>
      )}
    </div>
  );
}
