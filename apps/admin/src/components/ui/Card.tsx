import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-[var(--sb-radius-card)] p-6 shadow-[var(--sb-card-shadow)] text-left w-full ${
        hover ? 'transition-[var(--sb-transition)] hover:-translate-y-1 hover:shadow-[var(--sb-card-shadow-hover)] hover:border-[var(--sb-primary)] cursor-pointer' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
