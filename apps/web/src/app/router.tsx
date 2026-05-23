import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { RootLayout } from './routes/root';
import { HomePage } from './routes/home';
import { LoginPage } from './routes/login';
import { RegisterPage } from './routes/register';
import { GamesPage } from './routes/games';
import { GameDetailPage } from './routes/game-detail';
import { LeaderboardPage } from './routes/leaderboard';
import { ProtectedRoute, PublicOnlyRoute } from './routes/protected-route';
import SlidingPuzzlePage from '../features/games/sliding-puzzle/SlidingPuzzlePage';
import LifeGamePlayPage from '../features/games/life-game/LifeGamePlayPage';
import LifePracticeRoom from '../features/games/life-game/LifePracticeRoom';
import PreciseCharacterPlayPage from '../features/games/precise-character-building/PreciseCharacterPlayPage';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <PublicOnlyRoute>
      <LoginPage />
    </PublicOnlyRoute>
  ),
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: () => (
    <PublicOnlyRoute>
      <RegisterPage />
    </PublicOnlyRoute>
  ),
});

const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: () => (
    <ProtectedRoute>
      <GamesPage />
    </ProtectedRoute>
  ),
});

const gameDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$slug',
  component: () => (
    <ProtectedRoute>
      <GameDetailPage />
    </ProtectedRoute>
  ),
});

const slidingPuzzleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/sliding-puzzle/play',
  component: () => (
    <ProtectedRoute>
      <SlidingPuzzlePage />
    </ProtectedRoute>
  ),
});

const lifeGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/life-game/play',
  component: () => (
    <ProtectedRoute>
      <LifeGamePlayPage />
    </ProtectedRoute>
  ),
});

const lifePracticeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/life-game/practice',
  component: () => (
    <ProtectedRoute>
      <LifePracticeRoom />
    </ProtectedRoute>
  ),
});

const pcbPlayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/precise-character-building/play',
  component: () => (
    <ProtectedRoute>
      <PreciseCharacterPlayPage />
    </ProtectedRoute>
  ),
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games/$slug/leaderboards',
  component: () => (
    <ProtectedRoute>
      <LeaderboardPage />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  gamesRoute,
  gameDetailRoute,
  slidingPuzzleRoute,
  lifeGameRoute,
  lifePracticeRoute,
  pcbPlayRoute,
  leaderboardRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
