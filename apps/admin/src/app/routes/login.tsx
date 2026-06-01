import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../../features/auth/auth-store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => login(form),
    onSuccess: () => {
      const user = useAuthStore.getState().user;
      if (!user?.permissionKeys?.some((k) => k.startsWith('user:') || k.startsWith('game:') || k.startsWith('puzzle:'))) {
        setError('此账号没有管理员权限');
        useAuthStore.getState().logout();
        return;
      }
      navigate({ to: '/', replace: true });
    },
    onError: (err: any) => {
      setError(err?.message || '登录失败');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.emailOrUsername || !form.password) {
      setError('请填写所有字段');
      return;
    }
    loginMutation.mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--sb-bg)]">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-1 text-center">
          SuperBrain Admin
        </h1>
        <p className="text-sm text-[var(--sb-text-muted)] mb-6 text-center">
          管理后台登录
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="邮箱或用户名"
            value={form.emailOrUsername}
            onChange={(e) => setForm((f) => ({ ...f, emailOrUsername: e.target.value }))}
            placeholder="admin@example.com"
            autoComplete="username"
          />
          <Input
            label="密码"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-[var(--sb-danger)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '登录中...' : '登录'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
