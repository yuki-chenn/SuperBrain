import { useState, useEffect } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminGetACPuzzleDetailApi, adminCreateACPuzzleApi, adminUpdateACPuzzleApi } from '../../features/puzzles/ac-admin-api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { AC_DIFFICULTY_LABELS } from '@brain-games/shared';
import type { ACDifficultyLabel } from '@brain-games/shared';

interface ACPuzzleEditPageProps {
  puzzleId?: string;
}

export default function ACPuzzleEditPage({ puzzleId: puzzleIdProp }: ACPuzzleEditPageProps) {
  const { openTab } = useTabStore();
  const puzzleId = puzzleIdProp || '';
  const isCreate = !puzzleId;

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    difficultyLabel: '' as string,
    maxDurationMs: 3600000,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingPuzzle, isLoading } = useQuery({
    queryKey: ['admin-ac-puzzle', puzzleId],
    queryFn: () => adminGetACPuzzleDetailApi(puzzleId!),
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
      difficultyLabel: (form.difficultyLabel || undefined) as ACDifficultyLabel | undefined,
      maxDurationMs: form.maxDurationMs,
    }),
    onSuccess: (data: any) => {
      const newPath = `/puzzles/absolute-command/${data.id}`;
      openTab({ id: newPath, title: '题目编辑', path: newPath });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => adminUpdateACPuzzleApi(puzzleId!, {
      title: form.title,
      slug: form.slug,
      description: form.description || undefined,
      difficultyLabel: (form.difficultyLabel || undefined) as ACDifficultyLabel | undefined,
      maxDurationMs: form.maxDurationMs,
    }),
    onSuccess: () => {
      const newPath = `/puzzles/absolute-command/${puzzleId}`;
      openTab({ id: newPath, title: '题目编辑', path: newPath });
    },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = '标题不能为空';
    if (!form.slug.trim()) e.slug = 'Slug 不能为空';
    if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Slug 只能包含小写字母、数字和连字符';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    isCreate ? createMutation.mutate() : updateMutation.mutate();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  if (puzzleId && isLoading) return <div className="p-6 text-[var(--sb-text-muted)]">加载中...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => {
        if (isCreate) {
          openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
        } else {
          const mazePath = `/puzzles/absolute-command/${puzzleId}`;
          openTab({ id: mazePath, title: '题目编辑', path: mazePath });
        }
      }} className="text-sm text-[var(--sb-text-muted)] hover:text-[var(--sb-text-primary)] cursor-pointer mb-4 inline-block">&larr; {isCreate ? '返回题库' : '返回迷宫编辑'}</button>
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)] mb-6">{isCreate ? '创建新题目' : `编辑 - ${existingPuzzle?.title || ''}`}</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="标题 *"
            value={form.title}
            onChange={(e) => setForm(f => ({
              ...f,
              title: e.target.value,
              slug: isCreate ? e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) : f.slug,
            }))}
            placeholder="例如：绝对指令 . 题目 004"
            error={errors.title}
          />

          <Input
            label="Slug *"
            value={form.slug}
            onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="ac-puzzle-004"
            error={errors.slug}
          />
          <p className="text-xs text-[var(--sb-text-muted)] -mt-3">
            Slug 是题目的唯一标识符，用于 URL 和 API 调用。只能包含小写字母、数字和连字符。
          </p>

          <div>
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="题目描述（可选）"
              rows={3}
              className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] placeholder:text-[var(--sb-text-muted)] focus:outline-none focus:border-[var(--sb-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">难度标签</label>
            <select
              value={form.difficultyLabel}
              onChange={(e) => setForm(f => ({ ...f, difficultyLabel: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] cursor-pointer"
            >
              <option value="">未设置</option>
              {AC_DIFFICULTY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--sb-text-secondary)] mb-1.5">最大挑战时间（分钟）</label>
            <input
              type="number"
              min={1}
              value={Math.round(form.maxDurationMs / 60000)}
              onChange={(e) => setForm(f => ({ ...f, maxDurationMs: (parseInt(e.target.value) || 60) * 60000 }))}
              className="w-full px-3.5 py-2.5 bg-[var(--sb-bg-muted)] border border-[var(--sb-border)] rounded-[var(--sb-radius-input)] text-[var(--sb-text-primary)] focus:outline-none focus:border-[var(--sb-primary)] transition-[var(--sb-transition)]"
            />
            <p className="text-xs text-[var(--sb-text-muted)] mt-1">
              超过此时间未完成的挑战将自动标记为失败。当前：{Math.floor(form.maxDurationMs / 3600000)} 小时 {(form.maxDurationMs % 3600000) / 60000} 分钟
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>{isPending ? '保存中...' : isCreate ? '创建题目' : '保存修改'}</Button>
            <Button type="button" variant="secondary" onClick={() => {
              if (isCreate) {
                openTab({ id: '/puzzles/absolute-command', title: '题库: 绝对指令', path: '/puzzles/absolute-command' });
              } else {
                const mazePath = `/puzzles/absolute-command/${puzzleId}`;
                openTab({ id: mazePath, title: '题目编辑', path: mazePath });
              }
            }}>取消</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
