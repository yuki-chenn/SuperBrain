import { useState } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { useLogin } from '../../features/auth/hooks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const search = useSearch({ strict: false }) as { redirect?: string };
  const login = useLogin({ redirect: search.redirect });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ emailOrUsername, password });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-[var(--sb-text-primary)]">登录</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="邮箱或用户名"
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {login.isError && (
            <p className="text-[var(--sb-danger)] text-sm">
              {(login.error as any)?.message || '登录失败'}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={login.isPending} className="w-full">
            {login.isPending ? '登录中...' : '登录'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--sb-text-muted)]">
          没有账号？{' '}
          <Link to="/register" className="text-[var(--sb-primary)] no-underline hover:underline">
            注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
