import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from '@tanstack/react-router';
import { useTabStore } from '../stores/useTabStore';
import { AdminSidebar } from './AdminSidebar';
import { TabBar } from './TabBar';
import { useAuthStore } from '../features/auth/auth-store';
// Lazy imports for tab content
import DashboardPage from '../app/routes/dashboard';
import UsersPage from '../app/routes/users';
import UserDetailPage from '../app/routes/user-detail';
import GamesPage from '../app/routes/games';
import GameDetailPage from '../app/routes/game-detail';
import PuzzlesPage from '../app/routes/puzzles';
import ACPuzzleListPage from '../app/routes/ac-puzzle-list';
import ACPuzzleEditPage from '../app/routes/ac-puzzle-edit';
import ACMazeEditorPage from '../app/routes/ac-maze-editor';
import LeaderboardsPage from '../app/routes/leaderboards';
import LeaderboardDetailPage from '../app/routes/leaderboard-detail';
import AttemptsPage from '../app/routes/attempts';
import AttemptDetailPage from '../app/routes/attempt-detail';
import AuditPage from '../app/routes/audit';
import DatabasePage from '../app/routes/database';
import PermissionsPage from '../app/routes/permissions';
import RolesPage from '../app/routes/roles';
import RoleDetailPage from '../app/routes/role-detail';
import DifficultiesPage from '../app/routes/difficulties';
import DifficultyDetailPage from '../app/routes/difficulty-detail';
import ContentPoliciesPage from '../app/routes/content-policies';
import ContentPolicyDetailPage from '../app/routes/content-policy-detail';
import RuleVersionsPage from '../app/routes/rule-versions';
import RuleVersionDetailPage from '../app/routes/rule-version-detail';
import ChallengePoliciesPage from '../app/routes/challenge-policies';
import ChallengePolicyDetailPage from '../app/routes/challenge-policy-detail';
import PuzzleListPage from '../app/routes/puzzle-list';
import PuzzleEditPage from '../app/routes/puzzle-edit';
import PuzzleVersionsPage from '../app/routes/puzzle-versions';
import SessionsPage from '../app/routes/sessions';
const ROUTE_MATCHERS = [
    { pattern: /^\/$/, component: DashboardPage, extractParams: () => ({}) },
    { pattern: /^\/users$/, component: UsersPage, extractParams: () => ({}) },
    { pattern: /^\/users\/([^/]+)$/, component: UserDetailPage, extractParams: (m) => ({ userId: m[1] }) },
    { pattern: /^\/games$/, component: GamesPage, extractParams: () => ({}) },
    { pattern: /^\/games\/([^/]+)$/, component: GameDetailPage, extractParams: (m) => ({ gameId: m[1] }) },
    { pattern: /^\/puzzles$/, component: PuzzlesPage, extractParams: () => ({}) },
    { pattern: /^\/puzzles\/absolute-command$/, component: ACPuzzleListPage, extractParams: () => ({}) },
    { pattern: /^\/puzzles\/absolute-command\/create$/, component: ACPuzzleEditPage, extractParams: () => ({}) },
    { pattern: /^\/puzzles\/absolute-command\/([^/]+)\/edit$/, component: ACPuzzleEditPage, extractParams: (m) => ({ puzzleId: m[1] }) },
    { pattern: /^\/puzzles\/absolute-command\/([^/]+)$/, component: ACMazeEditorPage, extractParams: (m) => ({ puzzleId: m[1] }) },
    { pattern: /^\/leaderboards$/, component: LeaderboardsPage, extractParams: () => ({}) },
    { pattern: /^\/leaderboards\/([^/]+)$/, component: LeaderboardDetailPage, extractParams: (m) => ({ leaderboardId: m[1] }) },
    { pattern: /^\/attempts$/, component: AttemptsPage, extractParams: () => ({}) },
    { pattern: /^\/attempts\/([^/]+)$/, component: AttemptDetailPage, extractParams: (m) => ({ attemptId: m[1] }) },
    { pattern: /^\/audit$/, component: AuditPage, extractParams: () => ({}) },
    { pattern: /^\/sessions$/, component: SessionsPage, extractParams: () => ({}) },
    { pattern: /^\/database$/, component: DatabasePage, extractParams: () => ({}) },
    { pattern: /^\/permissions$/, component: PermissionsPage, extractParams: () => ({}) },
    { pattern: /^\/roles$/, component: RolesPage, extractParams: () => ({}) },
    { pattern: /^\/roles\/([^/]+)$/, component: RoleDetailPage, extractParams: (m) => ({ roleId: m[1] }) },
    { pattern: /^\/difficulties$/, component: DifficultiesPage, extractParams: () => ({}) },
    { pattern: /^\/difficulties\/([^/]+)$/, component: DifficultyDetailPage, extractParams: (m) => ({ difficultyId: m[1] }) },
    { pattern: /^\/content-policies$/, component: ContentPoliciesPage, extractParams: () => ({}) },
    { pattern: /^\/content-policies\/([^/]+)$/, component: ContentPolicyDetailPage, extractParams: (m) => ({ contentPolicyId: m[1] }) },
    { pattern: /^\/rule-versions$/, component: RuleVersionsPage, extractParams: () => ({}) },
    { pattern: /^\/rule-versions\/([^/]+)$/, component: RuleVersionDetailPage, extractParams: (m) => ({ ruleVersionId: m[1] }) },
    { pattern: /^\/challenge-policies$/, component: ChallengePoliciesPage, extractParams: () => ({}) },
    { pattern: /^\/challenge-policies\/([^/]+)$/, component: ChallengePolicyDetailPage, extractParams: (m) => ({ challengePolicyId: m[1] }) },
    { pattern: /^\/puzzle-versions$/, component: PuzzleVersionsPage, extractParams: () => ({}) },
    { pattern: /^\/puzzle-edit\/([^/]+)$/, component: PuzzleEditPage, extractParams: (m) => ({ puzzleId: m[1] }) },
    { pattern: /^\/puzzles\/([^/]+)$/, component: PuzzleListPage, extractParams: (m) => ({ gameId: m[1] }) },
];
function matchRoute(path) {
    for (const route of ROUTE_MATCHERS) {
        const m = path.match(route.pattern);
        if (m) {
            return { component: route.component, params: route.extractParams(m) };
        }
    }
    return null;
}
// ─── Tab Content ────────────────────────────────────────────────────
function TabContent({ path, isActive }) {
    const match = matchRoute(path);
    if (!match)
        return null;
    const Component = match.component;
    return (_jsx("div", { style: { display: isActive ? 'block' : 'none' }, className: "h-full overflow-auto", children: _jsx(Component, { ...match.params }) }));
}
// ─── AdminShell ─────────────────────────────────────────────────────
export function AdminShell() {
    const { tabs, activeTabId } = useTabStore();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    // Sync URL with active tab
    const activeTab = tabs.find((t) => t.id === activeTabId);
    return (_jsxs("div", { className: "min-h-screen flex flex-col", children: [_jsxs("div", { className: "h-12 flex items-center justify-between px-4 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] shrink-0", children: [_jsx("span", { className: "text-sm font-semibold text-[var(--sb-primary)]", children: "SuperBrain \u7BA1\u7406\u540E\u53F0" }), _jsx("div", { className: "flex items-center gap-3", children: user && _jsx("span", { className: "text-xs text-[var(--sb-text-muted)]", children: user.username }) })] }), _jsxs("div", { className: "flex-1 flex min-h-0", children: [_jsx(AdminSidebar, {}), _jsxs("div", { className: "flex-1 flex flex-col min-w-0 overflow-hidden", children: [_jsx(TabBar, {}), _jsx("main", { className: "flex-1 min-h-0 overflow-hidden bg-[var(--sb-bg)]", children: tabs.map((tab) => (_jsx(TabContent, { path: tab.path, isActive: tab.id === activeTabId }, tab.id))) })] })] })] }));
}
//# sourceMappingURL=AdminShell.js.map