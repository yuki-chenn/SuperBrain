import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { getDashboardOverviewApi } from '../../features/dashboard/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/Skeleton';
export default function DashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: getDashboardOverviewApi,
    });
    if (isLoading) {
        return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)] mb-6", children: "\u4EEA\u8868\u76D8" }), _jsx(TableSkeleton, { rows: 8 })] }));
    }
    if (!data) {
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u5931\u8D25" });
    }
    const stats = [
        { label: '总用户数', value: data.totalUsers, color: 'text-[var(--sb-primary)]' },
        { label: '活跃用户', value: data.activeUsers, color: 'text-[var(--sb-success)]' },
        { label: '总挑战次数', value: data.totalAttempts, color: 'text-[var(--sb-accent)]' },
        { label: '完成次数', value: data.completedAttempts, color: 'text-[var(--sb-success)]' },
        { label: '游戏数', value: data.totalGames, color: 'text-[var(--sb-primary)]' },
        { label: '已发布题目', value: data.publishedPuzzles, color: 'text-[var(--sb-success)]' },
    ];
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u4EEA\u8868\u76D8" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: stats.map((stat) => (_jsxs(Card, { className: "text-center", children: [_jsx("div", { className: `text-3xl font-bold ${stat.color}`, children: stat.value }), _jsx("div", { className: "text-sm text-[var(--sb-text-muted)] mt-1", children: stat.label })] }, stat.label))) }), _jsxs(Card, { children: [_jsx("h2", { className: "text-lg font-semibold text-[var(--sb-text-primary)] mb-4", children: "\u6700\u8FD1\u64CD\u4F5C" }), data.recentAuditLogs.length > 0 ? (_jsx("div", { className: "space-y-2", children: data.recentAuditLogs.map((log) => (_jsxs("div", { className: "flex items-center gap-3 py-2 border-b border-[var(--sb-border)] last:border-0", children: [_jsx(Badge, { variant: "default", children: log.resourceType }), _jsx("span", { className: "text-sm text-[var(--sb-text-primary)]", children: log.action }), log.actorUsername && (_jsxs("span", { className: "text-sm text-[var(--sb-text-muted)]", children: ["by ", log.actorUsername] })), _jsx("span", { className: "text-xs text-[var(--sb-text-muted)] ml-auto", children: new Date(log.createdAt).toLocaleString() })] }, log.id))) })) : (_jsx("p", { className: "text-sm text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u64CD\u4F5C\u8BB0\u5F55" }))] })] }));
}
//# sourceMappingURL=dashboard.js.map