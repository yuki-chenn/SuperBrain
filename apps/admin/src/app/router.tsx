import { createRouter, createRootRoute, createRoute, redirect, Outlet } from '@tanstack/react-router';
import { useAuthStore } from '../features/auth/auth-store';
import { AdminShell } from '../layouts/AdminShell';

import AdminLoginPage from './routes/login';

// ─── Auth Guard ─────────────────────────────────────────────────────

function AdminGuard() {
  const { status, user } = useAuthStore();

  if (status === 'bootstrapping') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--sb-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (status === 'anonymous') {
    throw redirect({ to: '/login' });
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">403 Forbidden</h1>
        <p className="text-[var(--sb-text-secondary)]">没有管理员权限</p>
        <a href="/" className="text-[var(--sb-primary)] hover:underline">返回首页</a>
      </div>
    );
  }

  return <AdminShell />;
}

// ─── Route definitions ──────────────────────────────────────────────

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: AdminLoginPage,
});

const adminRootRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin',
  component: AdminGuard,
});

// Index route for admin root
const adminIndexRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '/',
  component: () => null,
});

// Catch-all for admin routes - the tab system handles internal navigation
const adminCatchAllRoute = createRoute({
  getParentRoute: () => adminRootRoute,
  path: '$',
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminRootRoute.addChildren([
    adminIndexRoute,
    adminCatchAllRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
