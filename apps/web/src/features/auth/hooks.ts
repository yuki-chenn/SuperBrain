import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from './auth-store';
import { queryClient } from '../../lib/query-client';

export function useRegister() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: register,
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate({ to: '/games' });
    },
  });
}

export function useLogin(opts?: { redirect?: string }) {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate({ to: opts?.redirect || '/games', replace: true });
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: '/' });
    },
  });
}
