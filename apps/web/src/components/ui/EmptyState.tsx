import { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-[var(--sb-text-muted)]">{icon}</div>}
      <h3 className="text-lg font-semibold text-[var(--sb-text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--sb-text-muted)] mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
