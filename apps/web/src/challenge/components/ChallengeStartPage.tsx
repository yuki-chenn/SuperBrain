import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { challengeNavigation } from '../core/challenge-navigation-manager';

export function ChallengeStartPage({ gameSlug }: { gameSlug: string }) {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<string>('easy');
  const [mode, setMode] = useState<'RANKED' | 'PRACTICE'>('RANKED');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const begin = async () => {
    setBusy(true); setErr(null);
    try {
      const { playPath } = await challengeNavigation.beginChallenge({
        gameSlug, mode, difficultyKey: difficulty,
        idempotencyKey: crypto.randomUUID(),
      });
      navigate({ to: playPath });
    } catch (e) {
      setErr((e as Error).message ?? 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>开始挑战 — {gameSlug}</h2>
      <label>难度：
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">入门</option>
          <option value="normal">标准</option>
          <option value="hard">挑战</option>
          <option value="standard">标准（绝对指令）</option>
        </select>
      </label>
      &nbsp;&nbsp;
      <label>模式：
        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
          <option value="RANKED">排位</option>
          <option value="PRACTICE">练习</option>
        </select>
      </label>
      <div style={{ marginTop: 12 }}>
        <button disabled={busy} onClick={begin}>{busy ? '启动中…' : '开始挑战'}</button>
      </div>
      {err && <div style={{ color: 'red', marginTop: 8 }}>错误：{err}</div>}
    </div>
  );
}
