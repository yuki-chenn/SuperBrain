import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useAuthStore } from '../../features/auth/auth-store';
import { useLogout } from '../../features/auth/hooks';

export function TopNav() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showBack = location.pathname !== '/';

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-[var(--sb-border)] bg-[var(--sb-bg)]/80 backdrop-blur-xl">
      <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-4 md:px-8">
        {/* Left: back + logo */}
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => window.history.back()}
              className="p-1.5 -ml-1.5 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] bg-transparent border-none cursor-pointer transition-colors rounded-lg hover:bg-[var(--sb-bg-muted)]"
              aria-label="返回"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 15L7.5 10L12.5 5" />
              </svg>
            </button>
          )}
          <Link
            to="/"
            className="text-xl font-bold text-[var(--sb-primary)] no-underline tracking-tight"
          >
            SuperBrain
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/games"
            className="text-sm text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)] no-underline transition-colors"
          >
            游戏中心
          </Link>

          {status === 'authenticated' && user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--sb-text-muted)]">{user.username}</span>
              <button
                onClick={() => logout.mutate()}
                className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] bg-transparent border-none cursor-pointer transition-colors"
              >
                退出
              </button>
            </div>
          ) : status === 'anonymous' ? (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-[var(--sb-text-secondary)] hover:text-[var(--sb-text-primary)] no-underline transition-colors"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="text-sm bg-[var(--sb-primary)] hover:bg-[var(--sb-primary-hover)] text-white px-4 py-1.5 rounded-[var(--sb-radius-button)] no-underline transition-colors"
              >
                注册
              </Link>
            </div>
          ) : null}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[var(--sb-text-secondary)] bg-transparent border-none cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="菜单"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--sb-border)] bg-[var(--sb-bg)] px-4 py-4 space-y-3">
          <Link
            to="/games"
            className="block text-sm text-[var(--sb-text-secondary)] no-underline py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            游戏中心
          </Link>
          {status === 'authenticated' && user ? (
            <>
              <span className="block text-sm text-[var(--sb-text-muted)] py-2">{user.username}</span>
              <button
                onClick={() => { logout.mutate(); setMobileMenuOpen(false); }}
                className="block text-sm text-[var(--sb-text-muted)] bg-transparent border-none cursor-pointer py-2"
              >
                退出
              </button>
            </>
          ) : status === 'anonymous' ? (
            <>
              <Link to="/login" className="block text-sm text-[var(--sb-text-secondary)] no-underline py-2" onClick={() => setMobileMenuOpen(false)}>
                登录
              </Link>
              <Link to="/register" className="block text-sm text-[var(--sb-primary)] no-underline py-2" onClick={() => setMobileMenuOpen(false)}>
                注册
              </Link>
            </>
          ) : null}
        </div>
      )}
    </header>
  );
}
