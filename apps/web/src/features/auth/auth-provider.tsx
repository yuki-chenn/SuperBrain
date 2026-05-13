import { useEffect } from 'react';
import { useAuthStore } from './auth-store';
import { listenAuthEvents } from './broadcast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
    listenAuthEvents();
  }, [bootstrap]);

  return <>{children}</>;
}
