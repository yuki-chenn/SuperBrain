import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRouter, createRootRoute, createRoute, Outlet, Navigate } from '@tanstack/react-router';
import { useAuthStore } from '../features/auth/auth-store';
import { AdminShell } from '../layouts/AdminShell';
import AdminLoginPage from './routes/login';
// ─── Auth Guard ─────────────────────────────────────────────────────
function AdminGuard() {
    const { status, user } = useAuthStore();
    if (status === 'bootstrapping') {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-[var(--sb-text-secondary)]", children: "Loading..." }) }));
    }
    if (status === 'anonymous') {
        return _jsx(Navigate, { to: "/login" });
    }
    if (!user?.permissionKeys?.some((k) => k.startsWith('user:') || k.startsWith('game:') || k.startsWith('puzzle:') || k.startsWith('role:') || k.startsWith('permission:') || k.startsWith('session:'))) {
        return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center gap-4", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "403 Forbidden" }), _jsx("p", { className: "text-[var(--sb-text-secondary)]", children: "\u6CA1\u6709\u7BA1\u7406\u5458\u6743\u9650" }), _jsx("a", { href: "/", className: "text-[var(--sb-primary)] hover:underline", children: "\u8FD4\u56DE\u9996\u9875" })] }));
    }
    return _jsx(AdminShell, {});
}
// ─── Route definitions ──────────────────────────────────────────────
const rootRoute = createRootRoute({ component: () => _jsx(Outlet, {}) });
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
//# sourceMappingURL=router.js.map