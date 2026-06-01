import { useLocation } from '@tanstack/react-router';
import { useTabStore } from '../stores/useTabStore';

const NAV_ITEMS = [
  { id: '/', label: '仪表盘', icon: '📊', matchPrefixes: ['/'] },
  { id: '/users', label: '用户管理', icon: '👥', matchPrefixes: ['/users'] },
  { id: '/games', label: '游戏管理', icon: '🎮', matchPrefixes: ['/games'] },
  { id: '/puzzles', label: '题库管理', icon: '🧩', matchPrefixes: ['/puzzles'] },
  { id: '/leaderboards', label: '排行榜', icon: '🏆', matchPrefixes: ['/leaderboards'] },
  { id: '/attempts', label: '挑战记录', icon: '📋', matchPrefixes: ['/attempts'] },
  { id: '/audit', label: '审计日志', icon: '📝', matchPrefixes: ['/audit'] },
  { id: '/database', label: '所有数据库', icon: '🗄️', matchPrefixes: ['/database'] },
];

export function AdminSidebar() {
  const location = useLocation();
  const { openTab } = useTabStore();

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] flex flex-col">
      <nav className="flex-1 py-3 space-y-0.5 px-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === '/'
            ? location.pathname === '/'
            : item.matchPrefixes.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

          return (
            <button
              key={item.id}
              onClick={() => openTab({ id: item.id, title: item.label, path: item.id, closeable: item.id !== '/' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors border-none text-left ${
                isActive
                  ? 'bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] font-medium'
                  : 'text-[var(--sb-text-secondary)] hover:bg-[var(--sb-bg-muted)] hover:text-[var(--sb-text-primary)]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--sb-border)]">
        <a
          href="/"
          className="block text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] no-underline py-2 px-3 rounded-lg hover:bg-[var(--sb-bg-muted)] transition-colors"
        >
          返回玩家端
        </a>
      </div>
    </aside>
  );
}
