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

// ─── Path matching ──────────────────────────────────────────────────

interface RouteMatch {
  pattern: RegExp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  extractParams: (match: RegExpMatchArray) => Record<string, string>;
}

const ROUTE_MATCHERS: RouteMatch[] = [
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
  { pattern: /^\/database$/, component: DatabasePage, extractParams: () => ({}) },
];

function matchRoute(path: string) {
  for (const route of ROUTE_MATCHERS) {
    const m = path.match(route.pattern);
    if (m) {
      return { component: route.component, params: route.extractParams(m) };
    }
  }
  return null;
}

// ─── Tab Content ────────────────────────────────────────────────────

function TabContent({ path, isActive }: { path: string; isActive: boolean }) {
  const match = matchRoute(path);
  if (!match) return null;

  const Component = match.component;

  return (
    <div style={{ display: isActive ? 'block' : 'none' }} className="h-full overflow-auto">
      <Component {...match.params} />
    </div>
  );
}

// ─── AdminShell ─────────────────────────────────────────────────────

export function AdminShell() {
  const { tabs, activeTabId } = useTabStore();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Sync URL with active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] shrink-0">
        <span className="text-sm font-semibold text-[var(--sb-primary)]">SuperBrain 管理后台</span>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-[var(--sb-text-muted)]">{user.username}</span>}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TabBar />
          <main className="flex-1 min-h-0 overflow-hidden bg-[var(--sb-bg)]">
            {tabs.map((tab) => (
              <TabContent key={tab.id} path={tab.path} isActive={tab.id === activeTabId} />
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
