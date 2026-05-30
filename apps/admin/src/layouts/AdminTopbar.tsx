import { useAuthStore } from '../features/auth/auth-store';

export function AdminTopbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-16 shrink-0 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]/80 backdrop-blur-xl flex items-center justify-between px-6">
      <div className="text-sm text-[var(--sb-text-muted)]">
        SuperBrain 管理后台
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-sm text-[var(--sb-text-secondary)]">
              {user.username}
            </span>
            <button
              onClick={() => logout()}
              className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] bg-transparent border-none cursor-pointer transition-colors"
            >
              退出
            </button>
          </>
        )}
      </div>
    </header>
  );
}
