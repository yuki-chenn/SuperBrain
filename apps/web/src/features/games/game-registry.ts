import { lazy } from 'react';

export interface WebGameDefinition {
  slug: string;
  playRoute: string;
  component: React.LazyExoticComponent<React.ComponentType>;
}

export const webGameRegistry: Record<string, WebGameDefinition> = {
  'sliding-puzzle': {
    slug: 'sliding-puzzle',
    playRoute: '/games/sliding-puzzle/play',
    component: lazy(() => import('./sliding-puzzle/SlidingPuzzlePage')),
  },
  'life-game': {
    slug: 'life-game',
    playRoute: '/games/life-game/play',
    component: lazy(() => import('./life-game/LifeGamePlayPage')),
  },
};
