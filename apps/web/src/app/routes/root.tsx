import { Outlet } from '@tanstack/react-router';
import { useAuthStore } from '../../features/auth/auth-store';
import { useLogout } from '../../features/auth/hooks';
import { AuthProvider } from '../../features/auth/auth-provider';
import { TopNav } from '../../components/layout/TopNav';

export function RootLayout() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
