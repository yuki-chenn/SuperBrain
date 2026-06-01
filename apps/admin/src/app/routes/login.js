import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        onError: (err) => {
            setError(err?.message || '登录失败');
        },
    });
    function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!form.emailOrUsername || !form.password) {
            setError('请填写所有字段');
            return;
        }
        loginMutation.mutate();
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-[var(--sb-bg)]", children: _jsxs(Card, { className: "w-full max-w-md", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)] mb-1 text-center", children: "SuperBrain Admin" }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)] mb-6 text-center", children: "\u7BA1\u7406\u540E\u53F0\u767B\u5F55" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx(Input, { label: "\u90AE\u7BB1\u6216\u7528\u6237\u540D", value: form.emailOrUsername, onChange: (e) => setForm((f) => ({ ...f, emailOrUsername: e.target.value })), placeholder: "admin@example.com", autoComplete: "username" }), _jsx(Input, { label: "\u5BC6\u7801", type: "password", value: form.password, onChange: (e) => setForm((f) => ({ ...f, password: e.target.value })), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: "current-password" }), error && _jsx("p", { className: "text-sm text-[var(--sb-danger)]", children: error }), _jsx(Button, { type: "submit", className: "w-full", disabled: loginMutation.isPending, children: loginMutation.isPending ? '登录中...' : '登录' })] })] }) }));
}
//# sourceMappingURL=login.js.map