import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminGetACPuzzleDetailApi, adminCreateACPuzzleApi, adminUpdateACPuzzleApi } from '../../features/puzzles/ac-admin-api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { AC_DIFFICULTY_LABELS } from '@brain-games/shared';
export default function ACPuzzleEditPage({ puzzleId: puzzleIdProp }) {
    const { openTab } = useTabStore();
    const puzzleId = puzzleIdProp || '';
    const isCreate = !puzzleId;
    const [form, setForm] = useState({
        title: '',
        slug: '',
        description: '',
        difficultyLabel: '',
        maxDurationMs: 3600000,
    });
    const [errors, setErrors] = useState({});
    const { data: existingPuzzle, isLoading } = useQuery({
        queryKey: ['admin-ac-puzzle', puzzleId],
        queryFn: () => adminGetACPuzzleDetailApi(puzzleId),
        enabled: !!puzzleId,
    });
    useEffect(() => {
        if (existingPuzzle) {
            setForm({
                title: existingPuzzle.title,
                slug: existingPuzzle.slug,
                description: existingPuzzle.description || '',
                difficultyLabel: existingPuzzle.difficultyLabel || '',
                maxDurationMs: existingPuzzle.maxDurationMs ?? 3600000,
            });
        }
    }, [existingPuzzle]);
    const createMutation = useMutation({
        mutationFn: () => adminCreateACPuzzleApi({
            title: form.title,
            slug: form.slug,
            description: form.description || undefined,
            difficultyLabel: (form.difficultyLabel || undefined),
            maxDurationMs: form.maxDurationMs,
        }),
        onSuccess: (data) => {
            const newPath = `/puzzles/absolute-command/${data.id}`;
            openTab({ id: newPath, title: '题目编辑', path: newPath });
        },
    });
    const updateMutation = useMutation({
        mutationFn: () => adminUpdateACPuzzleApi(puzzleId, {
            title: form.title,
            slug: form.slug,
            description: form.description || undefined,
            difficultyLabel: (form.difficultyLabel || undefined),
            maxDurationMs: form.maxDurationMs,
        }),
        onSuccess: () => {
            const newPath = `/puzzles/absolute-command/${puzzleId}`;
            openTab({ id: newPath, title: '题目编辑', path: newPath });
        },
    });
    function validate() {
        const e = {};
        if (!form.title.trim())
            e.title = '标题不能为空';
        if (!form.slug.trim())
            e.slug = 'Slug 不能为空';
        if (!/^[a-z0-9-]+$/.test(form.slug))
            e.slug = 'Slug 只能包含小写字母、数字和连字符';
        setErrors(e);
        return Object.keys(e).length === 0;
    }
    function handleSubmit(ev) {
        ev.preventDefault();
        if (!validate())
            return;
        isCreate ? createMutation.mutate() : updateMutation.mutate();
    }
    const isPending = createMutation.isPending || updateMutation.isPending;
    if (puzzleId && isLoading)
        return _jsx("div", { className: "p-6 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." });
    return (_jsxs("div", { className: "p-6 max-w-2xl mx-auto", children: [_jsxs("button", { onClick: () => {
                    if (isCreate) {
                        openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                    }
                    else {
                        const mazePath = `/puzzles/absolute-command/${puzzleId}`;
                        openTab({ id: mazePath, title: '题目编辑', path: mazePath });
                    }
                }, className: "text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-4 inline-block", children: ["\u2190 ", isCreate ? '返回题库' : '返回迷宫编辑'] }), _jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)] mb-6", children: isCreate ? '创建新题目' : `编辑 - ${existingPuzzle?.title || ''}` }), _jsx(Card, { children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [_jsx(Input, { label: "\u6807\u9898 *", value: form.title, onChange: (e) => setForm(f => ({
                                ...f,
                                title: e.target.value,
                                slug: isCreate ? e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) : f.slug,
                            })), placeholder: "\u4F8B\u5982\uFF1A\u7EDD\u5BF9\u6307\u4EE4 . \u9898\u76EE 004", error: errors.title }), _jsx(Input, { label: "Slug *", value: form.slug, onChange: (e) => setForm(f => ({ ...f, slug: e.target.value })), placeholder: "ac-puzzle-004", error: errors.slug }), _jsx("p", { className: "text-xs text-[var(--sb-text-muted)] -mt-3", children: "Slug \u662F\u9898\u76EE\u7684\u552F\u4E00\u6807\u8BC6\u7B26\uFF0C\u7528\u4E8E URL \u548C API \u8C03\u7528\u3002\u53EA\u80FD\u5305\u542B\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u548C\u8FDE\u5B57\u7B26\u3002" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u63CF\u8FF0" }), _jsx("textarea", { value: form.description, onChange: (e) => setForm(f => ({ ...f, description: e.target.value })), placeholder: "\u9898\u76EE\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09", rows: 3, className: "w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] placeholder:text-[var(--sb-text-muted)] focus:outline-none focus:border-[var(--sb-primary)] resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u96BE\u5EA6\u6807\u7B7E" }), _jsxs("select", { value: form.difficultyLabel, onChange: (e) => setForm(f => ({ ...f, difficultyLabel: e.target.value })), className: "w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] cursor-pointer", children: [_jsx("option", { value: "", children: "\u672A\u8BBE\u7F6E" }), AC_DIFFICULTY_LABELS.map(l => _jsx("option", { value: l, children: l }, l))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--sb-text-secondary)] mb-1.5", children: "\u6700\u5927\u6311\u6218\u65F6\u95F4\uFF08\u5206\u949F\uFF09" }), _jsx("input", { type: "number", min: 1, value: Math.round(form.maxDurationMs / 60000), onChange: (e) => setForm(f => ({ ...f, maxDurationMs: (parseInt(e.target.value) || 60) * 60000 })), className: "w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] transition-[var(--sb-transition)]" }), _jsxs("p", { className: "text-xs text-[var(--sb-text-muted)] mt-1", children: ["\u8D85\u8FC7\u6B64\u65F6\u95F4\u672A\u5B8C\u6210\u7684\u6311\u6218\u5C06\u81EA\u52A8\u6807\u8BB0\u4E3A\u5931\u8D25\u3002\u5F53\u524D\uFF1A", Math.floor(form.maxDurationMs / 3600000), " \u5C0F\u65F6 ", (form.maxDurationMs % 3600000) / 60000, " \u5206\u949F"] })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx(Button, { type: "submit", disabled: isPending, children: isPending ? '保存中...' : isCreate ? '创建题目' : '保存修改' }), _jsx(Button, { type: "button", variant: "secondary", onClick: () => {
                                        if (isCreate) {
                                            openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
                                        }
                                        else {
                                            const mazePath = `/puzzles/absolute-command/${puzzleId}`;
                                            openTab({ id: mazePath, title: '题目编辑', path: mazePath });
                                        }
                                    }, children: "\u53D6\u6D88" })] })] }) })] }));
}
//# sourceMappingURL=ac-puzzle-edit.js.map