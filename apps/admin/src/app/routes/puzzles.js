import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { adminListGamesApi } from '../../features/games/api';
import { useTabStore } from '../../stores/useTabStore';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
export default function PuzzlesPage() {
    const { openTab } = useTabStore();
    const { data, isLoading } = useQuery({
        queryKey: ['admin-games-for-puzzles'],
        queryFn: () => adminListGamesApi({ status: 'PUBLISHED', pageSize: 50 }),
    });
    return (_jsxs("div", { className: "p-6 max-w-7xl mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u9898\u5E93\u7BA1\u7406" }), isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : data && data.items.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: data.items.map((game) => (_jsxs(Card, { hover: true, onClick: () => {
                        if (game.slug === 'absolute-command') {
                            openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                        }
                    }, children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-[var(--sb-text-primary)]", children: game.title }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] font-mono", children: game.slug })] }), _jsxs(Badge, { variant: "default", children: [game.puzzleCount, " \u9898"] })] }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)] line-clamp-2", children: game.description }), _jsx("div", { className: "mt-3 text-xs text-[var(--sb-text-muted)]", children: game.slug === 'absolute-command' ? '点击进入题库管理 →' : '暂不支持管理' })] }, game.id))) })) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u6682\u65E0\u6E38\u620F" }))] }));
}
//# sourceMappingURL=puzzles.js.map