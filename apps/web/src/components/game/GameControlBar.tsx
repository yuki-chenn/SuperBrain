import { Button } from '../ui/Button';

interface GameControlBarProps {
  status: string;
  onStart: () => void;
  onRestart: () => void;
  isAuthenticated?: boolean;
}

export function GameControlBar({ status, onStart, onRestart, isAuthenticated = true }: GameControlBarProps) {
  if (status === 'idle') {
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={onStart}
        className="w-full"
      >
        {isAuthenticated ? '开始游戏' : '登录后开始'}
      </Button>
    );
  }

  if (status === 'loading') {
    return (
      <Button variant="primary" size="lg" disabled className="w-full">
        加载中...
      </Button>
    );
  }

  if (status === 'countdown' || status === 'playing' || status === 'submitting') {
    return (
      <Button variant="secondary" size="md" onClick={onRestart} className="w-full">
        重新开始
      </Button>
    );
  }

  if (status === 'completed' || status === 'submitted') {
    return (
      <Button variant="primary" size="lg" onClick={onRestart} className="w-full">
        再来一局
      </Button>
    );
  }

  return null;
}
