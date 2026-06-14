import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useTabStore } from '../stores/useTabStore';
// ─── Navigation tree definition ───────────────────────────────────
const NAV_TREE = [
    { id: '/', label: '仪表盘', icon: '📊', path: '/', matchPrefixes: ['/'] },
    {
        id: 'users', label: '用户管理', icon: '👥',
        children: [
            { id: '/users', label: '用户配置', icon: '👤', path: '/users', matchPrefixes: ['/users'] },
            {
                id: 'permissions', label: '权限管理', icon: '🔐',
                children: [
                    { id: '/roles', label: '角色配置', icon: '🏷️', path: '/roles', matchPrefixes: ['/roles'] },
                    { id: '/permissions', label: '权限配置', icon: '🔑', path: '/permissions', matchPrefixes: ['/permissions'] },
                ],
            },
        ],
    },
    {
        id: 'games', label: '游戏管理', icon: '🎮',
        children: [
            { id: '/games', label: '游戏配置', icon: '🎯', path: '/games', matchPrefixes: ['/games'] },
            { id: '/difficulties', label: '难度配置', icon: '📶', path: '/difficulties', matchPrefixes: ['/difficulties'] },
            { id: '/content-policies', label: '题库配置', icon: '📦', path: '/content-policies', matchPrefixes: ['/content-policies'] },
            {
                id: 'policies', label: '策略管理', icon: '⚙️',
                children: [
                    { id: '/rule-versions', label: '规则配置', icon: '📐', path: '/rule-versions', matchPrefixes: ['/rule-versions'] },
                    { id: '/challenge-policies', label: '挑战配置', icon: '⚔️', path: '/challenge-policies', matchPrefixes: ['/challenge-policies'] },
                ],
            },
        ],
    },
    {
        id: 'puzzles', label: '题库管理', icon: '🧩',
        children: [
            { id: '/puzzles', label: '题目配置', icon: '🎯', path: '/puzzles', matchPrefixes: ['/puzzles'] },
            {
                id: 'puzzle-mgmt', label: '题目管理', icon: '📝',
                children: [
                    { id: '/puzzle-versions', label: '题目版本', icon: '📋', path: '/puzzle-versions', matchPrefixes: ['/puzzle-versions'] },
                ],
            },
        ],
    },
    { id: '/leaderboards', label: '排行榜', icon: '🏆', path: '/leaderboards', matchPrefixes: ['/leaderboards'] },
    { id: '/attempts', label: '挑战记录', icon: '📋', path: '/attempts', matchPrefixes: ['/attempts'] },
    {
        id: 'audit', label: '审计管理', icon: '📝',
        children: [
            { id: '/audit', label: '审计日志', icon: '📋', path: '/audit', matchPrefixes: ['/audit'] },
            { id: '/sessions', label: '认证会话', icon: '🔐', path: '/sessions', matchPrefixes: ['/sessions'] },
        ],
    },
    { id: '/database', label: '所有数据库', icon: '🗄️', path: '/database', matchPrefixes: ['/database'] },
];
// ─── Helpers ──────────────────────────────────────────────────────
function isLeaf(item) {
    return 'path' in item && typeof item.path === 'string';
}
/** Check if any descendant leaf matches the current path */
function isGroupActive(item, pathname) {
    return item.children.some((child) => isLeaf(child)
        ? child.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
        : isGroupActive(child, pathname));
}
// ─── SidebarItem component ────────────────────────────────────────
function SidebarItem({ item, depth, pathname, expanded, onToggle, }) {
    const { openTab } = useTabStore();
    if (isLeaf(item)) {
        const isActive = item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
        return (_jsxs("button", { onClick: () => openTab({ id: item.id, title: item.label, path: item.path, closeable: item.id !== '/' }), style: { paddingLeft: `${12 + depth * 16}px` }, className: `w-full flex items-center gap-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors border-none text-left ${isActive
                ? 'bg-[var(--sb-primary-soft)] text-[var(--sb-primary)] font-medium'
                : 'text-[var(--sb-text-secondary)] hover:bg-[var(--sb-bg-muted)] hover:text-[var(--sb-text-primary)]'}`, children: [_jsx("span", { className: "text-base shrink-0", children: item.icon }), _jsx("span", { className: "truncate", children: item.label })] }));
    }
    // Group node
    const isOpen = expanded.has(item.id);
    const active = isGroupActive(item, pathname);
    return (_jsxs("div", { children: [_jsxs("button", { onClick: () => onToggle(item.id), style: { paddingLeft: `${12 + depth * 16}px` }, className: `w-full flex items-center gap-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors border-none text-left ${active
                    ? 'text-[var(--sb-primary)] font-medium'
                    : 'text-[var(--sb-text-secondary)] hover:bg-[var(--sb-bg-muted)] hover:text-[var(--sb-text-primary)]'}`, children: [_jsx("span", { className: "text-base shrink-0", children: item.icon }), _jsx("span", { className: "flex-1 truncate", children: item.label }), _jsx("svg", { className: `w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 5l7 7-7 7" }) })] }), isOpen && (_jsx("div", { className: "space-y-0.5", children: item.children.map((child) => (_jsx(SidebarItem, { item: child, depth: depth + 1, pathname: pathname, expanded: expanded, onToggle: onToggle }, child.id))) }))] }));
}
// ─── AdminSidebar ─────────────────────────────────────────────────
export function AdminSidebar() {
    const location = useLocation();
    const [expanded, setExpanded] = useState(new Set(['users', 'permissions', 'games', 'policies', 'puzzles', 'puzzle-mgmt', 'audit']));
    const toggle = (id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    return (_jsxs("aside", { className: "w-56 shrink-0 border-r border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] flex flex-col", children: [_jsx("nav", { className: "flex-1 py-3 space-y-0.5 px-3 overflow-y-auto", children: NAV_TREE.map((item) => (_jsx(SidebarItem, { item: item, depth: 0, pathname: location.pathname, expanded: expanded, onToggle: toggle }, item.id))) }), _jsx("div", { className: "p-3 border-t border-[var(--sb-border)]", children: _jsx("a", { href: "/", className: "block text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] no-underline py-2 px-3 rounded-lg hover:bg-[var(--sb-bg-muted)] transition-colors", children: "\u8FD4\u56DE\u73A9\u5BB6\u7AEF" }) })] }));
}
//# sourceMappingURL=AdminSidebar.js.map