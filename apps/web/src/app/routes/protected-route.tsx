import { Navigate } from '@tanstack/react-router';
import { useAuthStore } from '../../features/auth/auth-store';

function FullPageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-[var(--color-text-muted)]">Loading...</div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === 'bootstrapping') {
    return <FullPageLoading />;
  }

  if (status === 'anonymous') {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
    return <FullPageLoading />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);

  if (status === 'bootstrapping') {
    return <FullPageLoading />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/games" replace />;
  }

  return <>{children}</>;
}
