import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  adminGetSessionStatsApi,
  adminListSessionsApi,
  adminGetSessionApi,
  adminRevokeSessionApi,
  adminRevokeFamilyApi,
  type AdminSessionListItem,
  type AdminSessionDetail,
  type AdminSessionListParams,
} from '../../features/sessions/api';

// ─── UA Parser ───────────────────────────────────────────────────────────────
function parseUA(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  let browser = 'Unknown', os = 'Unknown', device = 'Desktop';
  if (/Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua)) browser = `Chrome ${RegExp.$1}`;
  else if (/Edg\/(\d+)/.test(ua)) browser = `Edge ${RegExp.$1}`;
  else if (/Firefox\/(\d+)/.test(ua)) browser = `Firefox ${RegExp.$1}`;
  else if (/Safari\/(\d+)/.test(ua) && /Version\/(\d+)/.test(ua)) browser = `Safari ${RegExp.$1}`;
  if (/Windows NT (\d+\.\d+)/.test(ua)) os = `Windows ${RegExp.$1}`;
  else if (/Mac OS X (\d+[._]\d+)/.test(ua)) os = `macOS ${RegExp.$1.replace('_', '.')}`;
  else if (/Android (\d+)/.test(ua)) { os = `Android ${RegExp.$1}`; device = 'Mobile'; }
  else if (/iPhone|iPad/.test(ua)) { os = 'iOS'; device = /iPad/.test(ua) ? 'Tablet' : 'Mobile'; }
  else if (/Linux/.test(ua)) os = 'Linux';
  return { browser, os, device };
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
let _showToast: ((msg: string) => void) | null = null;

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    _showToast?.('已复制');
  }).catch(() => {});
}

function ToastContainer() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    _showToast = (m: string) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 1500);
    };
    return () => { _showToast = null; };
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg bg-[var(--sb-primary)] text-white text-sm shadow-lg animate-fade-in">
      {msg}
    </div>
  );
}

// ─── Status Colors ───────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active' },
  EXPIRED: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Expired' },
  REVOKED: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revoked' },
  ROTATED: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Rotated' },
  COMPROMISED: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Compromised' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.ACTIVE;
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
}

function ClientBadge({ client }: { client: string | null }) {
  if (client === 'admin') return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400">Admin</span>;
  if (client === 'game') return <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400">Game</span>;
  return <span className="text-xs text-[var(--sb-text-muted)]">-</span>;
}

function isExpiringSoon(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  return (
    <button
      className="ml-1 text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)] transition-colors"
      onClick={(e) => { e.stopPropagation(); copyText(text); }}
      title="复制"
    >
      <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
      </svg>
    </button>
  );
}

// ─── Column widths ───────────────────────────────────────────────────────────
const LW = { session: 150, user: 180, status: 90 };
const MW = { client: 90, device: 160, ip: 130, family: 150, expires: 170, lastUsed: 170, created: 170, revoked: 200 };
const RW = 120; // actions
const TOTAL_W = LW.session + LW.user + LW.status + Object.values(MW).reduce((a, b) => a + b, 0) + RW;

// ─── Shared cell styles ──────────────────────────────────────────────────────
const thCls = 'px-3 py-2.5 text-left font-medium text-[var(--sb-text-muted)] bg-[var(--sb-bg-muted)]';
const tdCls = 'px-3 py-2 bg-[var(--sb-bg-elevated)]';

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SessionsPage() {
  const queryClient = useQueryClient();
  const midRef = useRef<HTMLDivElement>(null);

  // Wheel → horizontal scroll only when over non-sticky columns
  useEffect(() => {
    const el = midRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // If target is a sticky column, let the page scroll vertically normally
      const target = e.target as HTMLElement;
      if (target.closest('.sticky')) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Filters
  const [filters, setFilters] = useState<AdminSessionListParams>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminSessionListItem | null>(null);
  const [revokeFamilyTarget, setRevokeFamilyTarget] = useState<AdminSessionListItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-session-stats'],
    queryFn: adminGetSessionStatsApi,
  });

  const listParams: AdminSessionListParams = { ...filters, page, pageSize, sortField, sortDir };
  const { data: listData, isLoading, error } = useQuery({
    queryKey: ['admin-sessions', listParams],
    queryFn: () => adminListSessionsApi(listParams),
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-session-detail', detailId],
    queryFn: () => adminGetSessionApi(detailId!),
    enabled: !!detailId,
  });

  const revokeMut = useMutation({
    mutationFn: () => adminRevokeSessionApi(revokeTarget!.id, revokeReason),
    onSuccess: () => {
      setRevokeTarget(null);
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-stats'] });
      if (detailId === revokeTarget?.id) queryClient.invalidateQueries({ queryKey: ['admin-session-detail', detailId] });
    },
  });

  const revokeFamilyMut = useMutation({
    mutationFn: () => adminRevokeFamilyApi(revokeFamilyTarget!.refreshTokenFamilyId, revokeReason),
    onSuccess: () => {
      setRevokeFamilyTarget(null);
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-session-stats'] });
    },
  });

  const items = listData?.items || [];
  const total = listData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  }

  function resetFilters() {
    setFilters({});
    setPage(1);
  }

  function setFilter(key: keyof AdminSessionListParams, val: string) {
    setFilters((f) => ({ ...f, [key]: val || undefined }));
    setPage(1);
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-[var(--sb-text-muted)] ml-1">↕</span>;
    return <span className="text-[var(--sb-primary)] ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };


  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">认证会话</h1>
          <p className="text-sm text-[var(--sb-text-muted)] mt-1">管理所有用户的登录会话</p>
        </div>
        <Button onClick={() => { queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }); queryClient.invalidateQueries({ queryKey: ['admin-session-stats'] }); }}>
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Sessions', value: stats.active, color: 'text-emerald-400' },
            { label: 'Expired Sessions', value: stats.expired, color: 'text-gray-400' },
            { label: 'Revoked Sessions', value: stats.revoked, color: 'text-red-400' },
            { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-orange-400' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="text-sm text-[var(--sb-text-muted)]">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input placeholder="User ID" value={filters.userId || ''} onChange={(e) => setFilter('userId', e.target.value)} />
          <Input placeholder="Session ID" value={filters.sessionId || ''} onChange={(e) => setFilter('sessionId', e.target.value)} />
          <Input placeholder="Token Family ID" value={filters.familyId || ''} onChange={(e) => setFilter('familyId', e.target.value)} />
          <Input placeholder="IP Address" value={filters.ipAddress || ''} onChange={(e) => setFilter('ipAddress', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <select className="rounded-lg border px-3 py-2 text-sm bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] text-[var(--sb-text-primary)]" value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">所有状态</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="REVOKED">Revoked</option>
            <option value="ROTATED">Rotated</option>
            <option value="COMPROMISED">Compromised</option>
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] text-[var(--sb-text-primary)]" value={filters.client || ''} onChange={(e) => setFilter('client', e.target.value)}>
            <option value="">所有端</option>
            <option value="admin">Admin</option>
            <option value="game">Game</option>
          </select>
          <select className="rounded-lg border px-3 py-2 text-sm bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] text-[var(--sb-text-primary)]" value={filters.special || ''} onChange={(e) => setFilter('special', e.target.value)}>
            <option value="">快速筛选</option>
            <option value="expiring-soon">即将过期 (24h)</option>
            <option value="unused">长期未使用</option>
            <option value="replaced">已被替换</option>
          </select>
          <Input type="date" placeholder="创建时间起" value={filters.createdFrom || ''} onChange={(e) => setFilter('createdFrom', e.target.value)} />
          <Input type="date" placeholder="创建时间止" value={filters.createdTo || ''} onChange={(e) => setFilter('createdTo', e.target.value)} />
          <Button variant="ghost" onClick={resetFilters}>重置筛选</Button>
        </div>
      </Card>

      {/* ─── Single table with sticky columns ──────────────────────────── */}
      <div className="bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-[var(--sb-radius-card)] shadow-[var(--sb-card-shadow)] overflow-hidden">
        <div ref={midRef} className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: TOTAL_W }}>
            <colgroup>
              <col style={{ width: LW.session }} />
              <col style={{ width: LW.user }} />
              <col style={{ width: LW.status }} />
              <col style={{ width: MW.client }} />
              <col style={{ width: MW.device }} />
              <col style={{ width: MW.ip }} />
              <col style={{ width: MW.family }} />
              <col style={{ width: MW.expires }} />
              <col style={{ width: MW.lastUsed }} />
              <col style={{ width: MW.created }} />
              <col style={{ width: MW.revoked }} />
              <col style={{ width: RW }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--sb-border)]">
                <th className={`${thCls} sticky left-0 z-30`}>Session</th>
                <th className={`${thCls} sticky z-30`} style={{ left: LW.session }}>User</th>
                <th className={`${thCls} sticky z-30`} style={{ left: LW.session + LW.user }}>Status</th>
                <th className={thCls}>Client</th>
                <th className={thCls}>Device</th>
                <th className={thCls}>IP Address</th>
                <th className={thCls}>Token Family</th>
                <th className={`${thCls} cursor-pointer select-none`} onClick={() => toggleSort('expiresAt')}>Expires At<SortIcon field="expiresAt" /></th>
                <th className={`${thCls} cursor-pointer select-none`} onClick={() => toggleSort('lastUsedAt')}>Last Used<SortIcon field="lastUsedAt" /></th>
                <th className={`${thCls} cursor-pointer select-none`} onClick={() => toggleSort('createdAt')}>Created<SortIcon field="createdAt" /></th>
                <th className={thCls}>Revoked</th>
                <th className={`${thCls} sticky right-0 z-30`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-[var(--sb-text-muted)]">加载中...</td></tr>
              ) : error ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-red-400">加载失败，请重试</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={12} className="px-3 py-8 text-center text-[var(--sb-text-muted)]">暂无会话数据</td></tr>
              ) : items.map((s) => {
                const ua = parseUA(s.userAgent);
                const canRevoke = s.status === 'ACTIVE';
                return (
                  <tr key={s.id} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)] cursor-pointer" onClick={() => setDetailId(s.id)}>
                    {/* Left sticky: Session */}
                    <td className={`${tdCls} sticky left-0 z-20`}>
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs text-[var(--sb-primary)]" title={s.id}>{shortId(s.id)}</span>
                        <CopyBtn text={s.id} />
                      </span>
                    </td>
                    {/* Left sticky: User */}
                    <td className={`${tdCls} sticky z-20`} style={{ left: LW.session }}>
                      <div className="text-[var(--sb-text-primary)] truncate">{s.user?.username || s.user?.email || '-'}</div>
                      <div className="flex items-center">
                        <span className="text-xs text-[var(--sb-text-muted)] font-mono truncate">{s.userId}</span>
                        <CopyBtn text={s.userId} />
                      </div>
                    </td>
                    {/* Left sticky: Status */}
                    <td className={`${tdCls} sticky z-20`} style={{ left: LW.session + LW.user }}>
                      <StatusBadge status={s.status} />
                    </td>
                    {/* Client */}
                    <td className={tdCls}>
                      <ClientBadge client={s.client} />
                    </td>
                    {/* Scrollable middle columns */}
                    <td className={`${tdCls} text-[var(--sb-text-secondary)] text-xs whitespace-nowrap`}>{ua.browser} / {ua.os}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs text-[var(--sb-text-secondary)]">{s.ipAddress || '-'}</span>
                        {s.ipAddress && <CopyBtn text={s.ipAddress} />}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs text-[var(--sb-primary)]" title={s.refreshTokenFamilyId}>{shortId(s.refreshTokenFamilyId)}</span>
                        <CopyBtn text={s.refreshTokenFamilyId} />
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <span className={isExpiringSoon(s.expiresAt) && s.status === 'ACTIVE' ? 'text-orange-400' : 'text-[var(--sb-text-secondary)]'}>
                        {formatTime(s.expiresAt)}
                        {isExpiringSoon(s.expiresAt) && s.status === 'ACTIVE' && <span className="ml-1 text-orange-400 text-xs">⚠</span>}
                      </span>
                    </td>
                    <td className={`${tdCls} text-[var(--sb-text-secondary)] whitespace-nowrap`}>{s.lastUsedAt ? formatTime(s.lastUsedAt) : <span className="text-[var(--sb-text-muted)] italic">Never</span>}</td>
                    <td className={`${tdCls} text-[var(--sb-text-secondary)] whitespace-nowrap`}>{formatTime(s.createdAt)}</td>
                    <td className={tdCls}>
                      {s.revokedAt ? (
                        <div className="text-xs whitespace-nowrap">
                          <div className="text-red-400">{formatTime(s.revokedAt)}</div>
                          <div className="text-[var(--sb-text-muted)] truncate max-w-[180px]" title={s.revokedReason || ''}>{s.revokedReason}</div>
                        </div>
                      ) : s.replacedBySessionId ? (
                        <span className="text-xs text-blue-400 whitespace-nowrap">Replaced</span>
                      ) : (
                        <span className="text-xs text-[var(--sb-text-muted)]">-</span>
                      )}
                    </td>
                    {/* Right sticky: Actions */}
                    <td className={`${tdCls} sticky right-0 z-20`}>
                      <div className="flex gap-1 whitespace-nowrap items-center" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)}>详情</Button>
                        {canRevoke ? (
                          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => { setRevokeTarget(s); setRevokeReason(''); }}>撤销</Button>
                        ) : (
                          <span className="inline-flex items-center justify-center font-medium border border-transparent rounded-[var(--sb-radius-button)] px-3 py-1.5 text-sm text-[var(--sb-text-muted)] opacity-50 cursor-not-allowed">撤销</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]">
            <span className="text-sm text-[var(--sb-text-muted)]">共 {total} 条，第 {page}/{totalPages} 页</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detail Modal ────────────────────────────────────────────── */}
      <Modal open={!!detailId} title="会话详情" onClose={() => setDetailId(null)}>
        {detail ? <SessionDetailPanel detail={detail} onRevoke={(s) => { setDetailId(null); setRevokeTarget(s as any); setRevokeReason(''); }} onRevokeFamily={(s) => { setDetailId(null); setRevokeFamilyTarget(s as any); setRevokeReason(''); }} /> : <div className="p-4 text-[var(--sb-text-muted)]">加载中...</div>}
      </Modal>

      {/* ─── Revoke Modal ────────────────────────────────────────────── */}
      <Modal open={!!revokeTarget} title="撤销会话" onClose={() => setRevokeTarget(null)} footer={
        <>
          <Button variant="ghost" onClick={() => setRevokeTarget(null)}>取消</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!revokeReason.trim() || revokeMut.isPending} onClick={() => revokeMut.mutate()}>
            {revokeMut.isPending ? '撤销中...' : '确认撤销'}
          </Button>
        </>
      }>
        {revokeTarget && (
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div className="flex items-center"><span className="text-[var(--sb-text-muted)]">Session:</span> <span className="font-mono ml-1">{revokeTarget.id}</span> <CopyBtn text={revokeTarget.id} /></div>
              <div><span className="text-[var(--sb-text-muted)]">User:</span> {revokeTarget.user?.username || revokeTarget.userId}</div>
              <div><span className="text-[var(--sb-text-muted)]">IP:</span> {revokeTarget.ipAddress || '-'}</div>
              <div><span className="text-[var(--sb-text-muted)]">Device:</span> {parseUA(revokeTarget.userAgent).browser} / {parseUA(revokeTarget.userAgent).os}</div>
              <div><span className="text-[var(--sb-text-muted)]">Last Used:</span> {revokeTarget.lastUsedAt ? formatTime(revokeTarget.lastUsedAt) : 'Never'}</div>
            </div>
            <div>
              <label className="block text-sm text-[var(--sb-text-muted)] mb-1">撤销原因 <span className="text-red-400">*</span></label>
              <Input placeholder="请输入撤销原因" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Revoke Family Modal ──────────────────────────────────────── */}
      <Modal open={!!revokeFamilyTarget} title="撤销 Token Family" onClose={() => setRevokeFamilyTarget(null)} footer={
        <>
          <Button variant="ghost" onClick={() => setRevokeFamilyTarget(null)}>取消</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!revokeReason.trim() || revokeFamilyMut.isPending} onClick={() => revokeFamilyMut.mutate()}>
            {revokeFamilyMut.isPending ? '撤销中...' : '确认撤销'}
          </Button>
        </>
      }>
        {revokeFamilyTarget && (
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div className="flex items-center"><span className="text-[var(--sb-text-muted)]">Token Family:</span> <span className="font-mono ml-1">{revokeFamilyTarget.refreshTokenFamilyId}</span> <CopyBtn text={revokeFamilyTarget.refreshTokenFamilyId} /></div>
              <div><span className="text-[var(--sb-text-muted)]">User:</span> {revokeFamilyTarget.user?.username || revokeFamilyTarget.userId}</div>
              <p className="text-orange-400 text-xs mt-2">⚠ 将撤销该 Family 下所有有效会话，用户需要重新登录。</p>
            </div>
            <div>
              <label className="block text-sm text-[var(--sb-text-muted)] mb-1">撤销原因 <span className="text-red-400">*</span></label>
              <Input placeholder="请输入撤销原因" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────
function SessionDetailPanel({ detail, onRevoke, onRevokeFamily }: {
  detail: AdminSessionDetail;
  onRevoke: (s: AdminSessionDetail) => void;
  onRevokeFamily: (s: AdminSessionDetail) => void;
}) {
  const ua = parseUA(detail.userAgent);
  const events = [
    { label: 'Created', time: detail.createdAt, color: 'bg-blue-400' },
    detail.lastUsedAt ? { label: 'Last Used', time: detail.lastUsedAt, color: 'bg-emerald-400' } : null,
    detail.replacedBySessionId ? { label: 'Replaced', time: null, color: 'bg-blue-400' } : null,
    detail.revokedAt ? { label: 'Revoked', time: detail.revokedAt, color: 'bg-red-400' } : null,
    { label: 'Expires', time: detail.expiresAt, color: 'bg-gray-400' },
  ].filter(Boolean);

  return (
    <div className="space-y-5 text-sm">
      <Section title="Basic Information">
        <InfoRow label="ID" value={<span className="inline-flex items-center"><span className="font-mono">{detail.id}</span><CopyBtn text={detail.id} /></span>} />
        <InfoRow label="User" value={<div><div>{detail.user?.username || detail.user?.email || '-'}</div><div className="flex items-center"><span className="text-xs text-[var(--sb-text-muted)] font-mono">{detail.userId}</span><CopyBtn text={detail.userId} /></div></div>} />
        <InfoRow label="Status" value={<StatusBadge status={detail.status} />} />
        <InfoRow label="Client" value={<ClientBadge client={detail.client} />} />
        <InfoRow label="Created" value={formatTime(detail.createdAt)} />
        <InfoRow label="Expires" value={<span className={isExpiringSoon(detail.expiresAt) && detail.status === 'ACTIVE' ? 'text-orange-400' : ''}>{formatTime(detail.expiresAt)}{isExpiringSoon(detail.expiresAt) && detail.status === 'ACTIVE' && ' ⚠ 即将过期'}</span>} />
        <InfoRow label="Last Used" value={detail.lastUsedAt ? formatTime(detail.lastUsedAt) : 'Never used'} />
      </Section>
      <Section title="Client Information">
        <InfoRow label="User Agent" value={<span className="text-xs break-all">{detail.userAgent || '-'}</span>} />
        <InfoRow label="Browser" value={ua.browser} />
        <InfoRow label="OS" value={ua.os} />
        <InfoRow label="Device" value={ua.device} />
        <InfoRow label="IP Address" value={<span className="inline-flex items-center"><span className="font-mono">{detail.ipAddress || '-'}</span>{detail.ipAddress && <CopyBtn text={detail.ipAddress} />}</span>} />
      </Section>
      <Section title="Token Information">
        <InfoRow label="Token Family" value={<span className="inline-flex items-center"><span className="font-mono text-[var(--sb-primary)]">{detail.refreshTokenFamilyId}</span><CopyBtn text={detail.refreshTokenFamilyId} /></span>} />
        <InfoRow label="Refresh Token Hash" value={<span className="font-mono text-[var(--sb-text-muted)]">{detail.refreshTokenHashMasked}</span>} />
        <InfoRow label="Replaced By" value={detail.replacedBySessionId ? <span className="inline-flex items-center"><span className="font-mono text-blue-400">{detail.replacedBySessionId}</span><CopyBtn text={detail.replacedBySessionId} /></span> : '-'} />
      </Section>
      <Section title="Revocation Information">
        {detail.revokedAt ? (<><InfoRow label="Revoked At" value={formatTime(detail.revokedAt)} /><InfoRow label="Reason" value={detail.revokedReason || '-'} /></>) : <div className="text-[var(--sb-text-muted)] italic">Not revoked</div>}
      </Section>
      <Section title="Lifecycle Timeline">
        <div className="relative pl-4 space-y-3">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--sb-border)]" />
          {events.map((ev, i) => (
            <div key={i} className="relative flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${ev!.color} shrink-0 z-10`} />
              <div className="text-[var(--sb-text-secondary)]"><span className="font-medium">{ev!.label}</span>{ev!.time && <span className="ml-2 text-xs text-[var(--sb-text-muted)]">{formatTime(ev!.time)}</span>}</div>
            </div>
          ))}
        </div>
      </Section>
      {detail.status === 'ACTIVE' && (
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => onRevoke(detail)}>撤销会话</Button>
          <Button size="sm" variant="ghost" className="text-red-400" onClick={() => onRevokeFamily(detail)}>撤销同 Family</Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div><h3 className="text-sm font-semibold text-[var(--sb-text-primary)] mb-2 border-b border-[var(--sb-border)] pb-1">{title}</h3><div className="space-y-1.5">{children}</div></div>);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div className="flex gap-2"><span className="text-[var(--sb-text-muted)] w-32 shrink-0">{label}</span><span className="text-[var(--sb-text-primary)] break-all">{value}</span></div>);
}
