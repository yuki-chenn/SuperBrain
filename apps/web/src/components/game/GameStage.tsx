import { ReactNode } from 'react';

interface GameStageProps {
  children: ReactNode;
  className?: string;
}

export function GameStage({ children, className = '' }: GameStageProps) {
  return (
    <div
      className={`relative min-h-[520px] rounded-3xl border border-[var(--sb-border)] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,var(--sb-primary-soft),transparent_36%),var(--sb-bg-elevated)] ${className}`}
    >
      {children}
    </div>
  );
}
