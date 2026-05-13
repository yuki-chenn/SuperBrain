import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useRegister } from '../../features/auth/hooks';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ email, username, password });
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-[var(--sb-text-primary)]">注册</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="用户名"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {register.isError && (
            <p className="text-[var(--sb-danger)] text-sm">
              {(register.error as any)?.message || '注册失败'}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={register.isPending} className="w-full">
            {register.isPending ? '注册中...' : '注册'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-[var(--sb-text-muted)]">
          已有账号？{' '}
          <Link to="/login" className="text-[var(--sb-primary)] no-underline hover:underline">
            登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
