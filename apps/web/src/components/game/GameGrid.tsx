import { ReactNode } from 'react';

interface GameGridProps {
  children: ReactNode;
  className?: string;
}

export function GameGrid({ children, className = '' }: GameGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {children}
    </div>
  );
}
