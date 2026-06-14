import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { adminGetSessionStatsApi, adminListSessionsApi, adminGetSessionApi, adminRevokeSessionApi, adminRevokeFamilyApi, } from '../../features/sessions/api';
// ─── UA Parser ───────────────────────────────────────────────────────────────
function parseUA(ua) {
    if (!ua)
        return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    let browser = 'Unknown', os = 'Unknown', device = 'Desktop';
    if (/Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua))
        browser = `Chrome ${RegExp.$1}`;
    else if (/Edg\/(\d+)/.test(ua))
        browser = `Edge ${RegExp.$1}`;
    else if (/Firefox\/(\d+)/.test(ua))
        browser = `Firefox ${RegExp.$1}`;
    else if (/Safari\/(\d+)/.test(ua) && /Version\/(\d+)/.test(ua))
        browser = `Safari ${RegExp.$1}`;
    if (/Windows NT (\d+\.\d+)/.test(ua))
        os = `Windows ${RegExp.$1}`;
    else if (/Mac OS X (\d+[._]\d+)/.test(ua))
        os = `macOS ${RegExp.$1.replace('_', '.')}`;
    else if (/Android (\d+)/.test(ua)) {
        os = `Android ${RegExp.$1}`;
        device = 'Mobile';
    }
    else if (/iPhone|iPad/.test(ua)) {
        os = 'iOS';
        device = /iPad/.test(ua) ? 'Tablet' : 'Mobile';
    }
    else if (/Linux/.test(ua))
        os = 'Linux';
    return { browser, os, device };
}
function shortId(id) {
    return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;
}
// ─── Toast ───────────────────────────────────────────────────────────────────
let _showToast = null;
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        _showToast?.('已复制');
    }).catch(() => { });
}
function ToastContainer() {
    const [msg, setMsg] = useState(null);
    useEffect(() => {
        _showToast = (m) => {
            setMsg(m);
            setTimeout(() => setMsg(null), 1500);
        };
        return () => { _showToast = null; };
    }, []);
    if (!msg)
        return null;
    return (_jsx("div", { className: "fixed top-4 right-4 z-[9999] px-4 py-2 rounded-lg bg-[var(--sb-primary)] text-white text-sm shadow-lg animate-fade-in", children: msg }));
}
// ─── Status Colors ───────────────────────────────────────────────────────────
const STATUS_STYLES = {
    ACTIVE: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Active' },
    EXPIRED: { bg: 'bg-gray-500/15', text: 'text-gray-400', label: 'Expired' },
    REVOKED: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Revoked' },
    ROTATED: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Rotated' },
    COMPROMISED: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Compromised' },
};
function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.ACTIVE;
    return _jsx("span", { className: `inline-block px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`, children: s.label });
}
function isExpiringSoon(expiresAt) {
    return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}
function formatTime(iso) {
    if (!iso)
        return '-';
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}
// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
    return (_jsx("button", { className: "ml-1 text-[var(--sb-text-muted)] hover:text-[var(--sb-primary)] transition-colors", onClick: (e) => { e.stopPropagation(); copyText(text); }, title: "\u590D\u5236", children: _jsxs("svg", { className: "w-3.5 h-3.5 inline", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2", strokeWidth: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1", strokeWidth: "2" })] }) }));
}
// ─── Column widths ───────────────────────────────────────────────────────────
const LW = { session: 150, user: 180, status: 90 };
const MW = { device: 160, ip: 130, family: 150, expires: 170, lastUsed: 170, created: 170, revoked: 200 };
const RW = 120; // actions
const TOTAL_W = LW.session + LW.user + LW.status + Object.values(MW).reduce((a, b) => a + b, 0) + RW;
// ─── Shared cell styles ──────────────────────────────────────────────────────
const thCls = 'px-3 py-2.5 text-left font-medium text-[var(--sb-text-muted)] bg-[var(--sb-bg-muted)]';
const tdCls = 'px-3 py-2 bg-[var(--sb-bg-elevated)]';
// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SessionsPage() {
    const queryClient = useQueryClient();
    const midRef = useRef(null);
    // Wheel → horizontal scroll only when over non-sticky columns
    useEffect(() => {
        const el = midRef.current;
        if (!el)
            return;
        const handler = (e) => {
            // If target is a sticky column, let the page scroll vertically normally
            const target = e.target;
            if (target.closest('.sticky'))
                return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);
    // Filters
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');
    const [detailId, setDetailId] = useState(null);
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [revokeFamilyTarget, setRevokeFamilyTarget] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');
    const { data: stats } = useQuery({
        queryKey: ['admin-session-stats'],
        queryFn: adminGetSessionStatsApi,
    });
    const listParams = { ...filters, page, pageSize, sortField, sortDir };
    const { data: listData, isLoading, error } = useQuery({
        queryKey: ['admin-sessions', listParams],
        queryFn: () => adminListSessionsApi(listParams),
    });
    const { data: detail } = useQuery({
        queryKey: ['admin-session-detail', detailId],
        queryFn: () => adminGetSessionApi(detailId),
        enabled: !!detailId,
    });
    const revokeMut = useMutation({
        mutationFn: () => adminRevokeSessionApi(revokeTarget.id, revokeReason),
        onSuccess: () => {
            setRevokeTarget(null);
            setRevokeReason('');
            queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-session-stats'] });
            if (detailId === revokeTarget?.id)
                queryClient.invalidateQueries({ queryKey: ['admin-session-detail', detailId] });
        },
    });
    const revokeFamilyMut = useMutation({
        mutationFn: () => adminRevokeFamilyApi(revokeFamilyTarget.refreshTokenFamilyId, revokeReason),
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
    function toggleSort(field) {
        if (sortField === field)
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else {
            setSortField(field);
            setSortDir('desc');
        }
        setPage(1);
    }
    function resetFilters() {
        setFilters({});
        setPage(1);
    }
    function setFilter(key, val) {
        setFilters((f) => ({ ...f, [key]: val || undefined }));
        setPage(1);
    }
    const SortIcon = ({ field }) => {
        if (sortField !== field)
            return _jsx("span", { className: "text-[var(--sb-text-muted)] ml-1", children: "\u2195" });
        return _jsx("span", { className: "text-[var(--sb-primary)] ml-1", children: sortDir === 'asc' ? '↑' : '↓' });
    };
    return (_jsxs("div", { className: "p-6 max-w-[1600px] mx-auto space-y-6", children: [_jsx(ToastContainer, {}), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u8BA4\u8BC1\u4F1A\u8BDD" }), _jsx("p", { className: "text-sm text-[var(--sb-text-muted)] mt-1", children: "\u7BA1\u7406\u6240\u6709\u7528\u6237\u7684\u767B\u5F55\u4F1A\u8BDD" })] }), _jsx(Button, { onClick: () => { queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }); queryClient.invalidateQueries({ queryKey: ['admin-session-stats'] }); }, children: "\u5237\u65B0" })] }), stats && (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
                    { label: 'Active Sessions', value: stats.active, color: 'text-emerald-400' },
                    { label: 'Expired Sessions', value: stats.expired, color: 'text-gray-400' },
                    { label: 'Revoked Sessions', value: stats.revoked, color: 'text-red-400' },
                    { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-orange-400' },
                ].map((s) => (_jsxs(Card, { className: "p-4", children: [_jsx("div", { className: "text-sm text-[var(--sb-text-muted)]", children: s.label }), _jsx("div", { className: `text-2xl font-bold mt-1 ${s.color}`, children: s.value })] }, s.label))) })), _jsxs(Card, { className: "p-4 space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3", children: [_jsx(Input, { placeholder: "User ID", value: filters.userId || '', onChange: (e) => setFilter('userId', e.target.value) }), _jsx(Input, { placeholder: "Session ID", value: filters.sessionId || '', onChange: (e) => setFilter('sessionId', e.target.value) }), _jsx(Input, { placeholder: "Token Family ID", value: filters.familyId || '', onChange: (e) => setFilter('familyId', e.target.value) }), _jsx(Input, { placeholder: "IP Address", value: filters.ipAddress || '', onChange: (e) => setFilter('ipAddress', e.target.value) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3", children: [_jsxs("select", { className: "rounded-lg border px-3 py-2 text-sm bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] text-[var(--sb-text-primary)]", value: filters.status || '', onChange: (e) => setFilter('status', e.target.value), children: [_jsx("option", { value: "", children: "\u6240\u6709\u72B6\u6001" }), _jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "EXPIRED", children: "Expired" }), _jsx("option", { value: "REVOKED", children: "Revoked" }), _jsx("option", { value: "ROTATED", children: "Rotated" }), _jsx("option", { value: "COMPROMISED", children: "Compromised" })] }), _jsxs("select", { className: "rounded-lg border px-3 py-2 text-sm bg-[var(--sb-bg-elevated)] border-[var(--sb-border)] text-[var(--sb-text-primary)]", value: filters.special || '', onChange: (e) => setFilter('special', e.target.value), children: [_jsx("option", { value: "", children: "\u5FEB\u901F\u7B5B\u9009" }), _jsx("option", { value: "expiring-soon", children: "\u5373\u5C06\u8FC7\u671F (24h)" }), _jsx("option", { value: "unused", children: "\u957F\u671F\u672A\u4F7F\u7528" }), _jsx("option", { value: "replaced", children: "\u5DF2\u88AB\u66FF\u6362" })] }), _jsx(Input, { type: "date", placeholder: "\u521B\u5EFA\u65F6\u95F4\u8D77", value: filters.createdFrom || '', onChange: (e) => setFilter('createdFrom', e.target.value) }), _jsx(Input, { type: "date", placeholder: "\u521B\u5EFA\u65F6\u95F4\u6B62", value: filters.createdTo || '', onChange: (e) => setFilter('createdTo', e.target.value) }), _jsx(Button, { variant: "ghost", onClick: resetFilters, children: "\u91CD\u7F6E\u7B5B\u9009" })] })] }), _jsxs("div", { className: "bg-[var(--sb-bg-elevated)] border border-[var(--sb-border)] rounded-[var(--sb-radius-card)] shadow-[var(--sb-card-shadow)] overflow-hidden", children: [_jsx("div", { ref: midRef, className: "overflow-x-auto overflow-y-hidden", children: _jsxs("table", { className: "w-full text-sm", style: { tableLayout: 'fixed', minWidth: TOTAL_W }, children: [_jsxs("colgroup", { children: [_jsx("col", { style: { width: LW.session } }), _jsx("col", { style: { width: LW.user } }), _jsx("col", { style: { width: LW.status } }), _jsx("col", { style: { width: MW.device } }), _jsx("col", { style: { width: MW.ip } }), _jsx("col", { style: { width: MW.family } }), _jsx("col", { style: { width: MW.expires } }), _jsx("col", { style: { width: MW.lastUsed } }), _jsx("col", { style: { width: MW.created } }), _jsx("col", { style: { width: MW.revoked } }), _jsx("col", { style: { width: RW } })] }), _jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--sb-border)]", children: [_jsx("th", { className: `${thCls} sticky left-0 z-30`, children: "Session" }), _jsx("th", { className: `${thCls} sticky z-30`, style: { left: LW.session }, children: "User" }), _jsx("th", { className: `${thCls} sticky z-30`, style: { left: LW.session + LW.user }, children: "Status" }), _jsx("th", { className: thCls, children: "Device" }), _jsx("th", { className: thCls, children: "IP Address" }), _jsx("th", { className: thCls, children: "Token Family" }), _jsxs("th", { className: `${thCls} cursor-pointer select-none`, onClick: () => toggleSort('expiresAt'), children: ["Expires At", _jsx(SortIcon, { field: "expiresAt" })] }), _jsxs("th", { className: `${thCls} cursor-pointer select-none`, onClick: () => toggleSort('lastUsedAt'), children: ["Last Used", _jsx(SortIcon, { field: "lastUsedAt" })] }), _jsxs("th", { className: `${thCls} cursor-pointer select-none`, onClick: () => toggleSort('createdAt'), children: ["Created", _jsx(SortIcon, { field: "createdAt" })] }), _jsx("th", { className: thCls, children: "Revoked" }), _jsx("th", { className: `${thCls} sticky right-0 z-30`, children: "Actions" })] }) }), _jsx("tbody", { children: isLoading ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-3 py-8 text-center text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." }) })) : error ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-3 py-8 text-center text-red-400", children: "\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5" }) })) : items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-3 py-8 text-center text-[var(--sb-text-muted)]", children: "\u6682\u65E0\u4F1A\u8BDD\u6570\u636E" }) })) : items.map((s) => {
                                        const ua = parseUA(s.userAgent);
                                        const canRevoke = s.status === 'ACTIVE';
                                        return (_jsxs("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)] cursor-pointer", onClick: () => setDetailId(s.id), children: [_jsx("td", { className: `${tdCls} sticky left-0 z-20`, children: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono text-xs text-[var(--sb-primary)]", title: s.id, children: shortId(s.id) }), _jsx(CopyBtn, { text: s.id })] }) }), _jsxs("td", { className: `${tdCls} sticky z-20`, style: { left: LW.session }, children: [_jsx("div", { className: "text-[var(--sb-text-primary)] truncate", children: s.user?.username || s.user?.email || '-' }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-xs text-[var(--sb-text-muted)] font-mono truncate", children: s.userId }), _jsx(CopyBtn, { text: s.userId })] })] }), _jsx("td", { className: `${tdCls} sticky z-20`, style: { left: LW.session + LW.user }, children: _jsx(StatusBadge, { status: s.status }) }), _jsxs("td", { className: `${tdCls} text-[var(--sb-text-secondary)] text-xs whitespace-nowrap`, children: [ua.browser, " / ", ua.os] }), _jsx("td", { className: tdCls, children: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono text-xs text-[var(--sb-text-secondary)]", children: s.ipAddress || '-' }), s.ipAddress && _jsx(CopyBtn, { text: s.ipAddress })] }) }), _jsx("td", { className: tdCls, children: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono text-xs text-[var(--sb-primary)]", title: s.refreshTokenFamilyId, children: shortId(s.refreshTokenFamilyId) }), _jsx(CopyBtn, { text: s.refreshTokenFamilyId })] }) }), _jsx("td", { className: `${tdCls} whitespace-nowrap`, children: _jsxs("span", { className: isExpiringSoon(s.expiresAt) && s.status === 'ACTIVE' ? 'text-orange-400' : 'text-[var(--sb-text-secondary)]', children: [formatTime(s.expiresAt), isExpiringSoon(s.expiresAt) && s.status === 'ACTIVE' && _jsx("span", { className: "ml-1 text-orange-400 text-xs", children: "\u26A0" })] }) }), _jsx("td", { className: `${tdCls} text-[var(--sb-text-secondary)] whitespace-nowrap`, children: s.lastUsedAt ? formatTime(s.lastUsedAt) : _jsx("span", { className: "text-[var(--sb-text-muted)] italic", children: "Never" }) }), _jsx("td", { className: `${tdCls} text-[var(--sb-text-secondary)] whitespace-nowrap`, children: formatTime(s.createdAt) }), _jsx("td", { className: tdCls, children: s.revokedAt ? (_jsxs("div", { className: "text-xs whitespace-nowrap", children: [_jsx("div", { className: "text-red-400", children: formatTime(s.revokedAt) }), _jsx("div", { className: "text-[var(--sb-text-muted)] truncate max-w-[180px]", title: s.revokedReason || '', children: s.revokedReason })] })) : s.replacedBySessionId ? (_jsx("span", { className: "text-xs text-blue-400 whitespace-nowrap", children: "Replaced" })) : (_jsx("span", { className: "text-xs text-[var(--sb-text-muted)]", children: "-" })) }), _jsx("td", { className: `${tdCls} sticky right-0 z-20`, children: _jsxs("div", { className: "flex gap-1 whitespace-nowrap items-center", onClick: (e) => e.stopPropagation(), children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setDetailId(s.id), children: "\u8BE6\u60C5" }), canRevoke ? (_jsx(Button, { size: "sm", variant: "ghost", className: "text-red-400", onClick: () => { setRevokeTarget(s); setRevokeReason(''); }, children: "\u64A4\u9500" })) : (_jsx("span", { className: "inline-flex items-center justify-center font-medium border border-transparent rounded-[var(--sb-radius-button)] px-3 py-1.5 text-sm text-[var(--sb-text-muted)] opacity-50 cursor-not-allowed", children: "\u64A4\u9500" }))] }) })] }, s.id));
                                    }) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-t border-[var(--sb-border)] bg-[var(--sb-bg-elevated)]", children: [_jsxs("span", { className: "text-sm text-[var(--sb-text-muted)]", children: ["\u5171 ", total, " \u6761\uFF0C\u7B2C ", page, "/", totalPages, " \u9875"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", disabled: page <= 1, onClick: () => setPage(page - 1), children: "\u4E0A\u4E00\u9875" }), _jsx(Button, { size: "sm", variant: "ghost", disabled: page >= totalPages, onClick: () => setPage(page + 1), children: "\u4E0B\u4E00\u9875" })] })] }))] }), _jsx(Modal, { open: !!detailId, title: "\u4F1A\u8BDD\u8BE6\u60C5", onClose: () => setDetailId(null), children: detail ? _jsx(SessionDetailPanel, { detail: detail, onRevoke: (s) => { setDetailId(null); setRevokeTarget(s); setRevokeReason(''); }, onRevokeFamily: (s) => { setDetailId(null); setRevokeFamilyTarget(s); setRevokeReason(''); } }) : _jsx("div", { className: "p-4 text-[var(--sb-text-muted)]", children: "\u52A0\u8F7D\u4E2D..." }) }), _jsx(Modal, { open: !!revokeTarget, title: "\u64A4\u9500\u4F1A\u8BDD", onClose: () => setRevokeTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setRevokeTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { className: "bg-red-600 hover:bg-red-700", disabled: !revokeReason.trim() || revokeMut.isPending, onClick: () => revokeMut.mutate(), children: revokeMut.isPending ? '撤销中...' : '确认撤销' })] }), children: revokeTarget && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "text-sm space-y-1", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "Session:" }), " ", _jsx("span", { className: "font-mono ml-1", children: revokeTarget.id }), " ", _jsx(CopyBtn, { text: revokeTarget.id })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "User:" }), " ", revokeTarget.user?.username || revokeTarget.userId] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "IP:" }), " ", revokeTarget.ipAddress || '-'] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "Device:" }), " ", parseUA(revokeTarget.userAgent).browser, " / ", parseUA(revokeTarget.userAgent).os] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "Last Used:" }), " ", revokeTarget.lastUsedAt ? formatTime(revokeTarget.lastUsedAt) : 'Never'] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm text-[var(--sb-text-muted)] mb-1", children: ["\u64A4\u9500\u539F\u56E0 ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u64A4\u9500\u539F\u56E0", value: revokeReason, onChange: (e) => setRevokeReason(e.target.value) })] })] })) }), _jsx(Modal, { open: !!revokeFamilyTarget, title: "\u64A4\u9500 Token Family", onClose: () => setRevokeFamilyTarget(null), footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setRevokeFamilyTarget(null), children: "\u53D6\u6D88" }), _jsx(Button, { className: "bg-red-600 hover:bg-red-700", disabled: !revokeReason.trim() || revokeFamilyMut.isPending, onClick: () => revokeFamilyMut.mutate(), children: revokeFamilyMut.isPending ? '撤销中...' : '确认撤销' })] }), children: revokeFamilyTarget && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "text-sm space-y-1", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "Token Family:" }), " ", _jsx("span", { className: "font-mono ml-1", children: revokeFamilyTarget.refreshTokenFamilyId }), " ", _jsx(CopyBtn, { text: revokeFamilyTarget.refreshTokenFamilyId })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: "User:" }), " ", revokeFamilyTarget.user?.username || revokeFamilyTarget.userId] }), _jsx("p", { className: "text-orange-400 text-xs mt-2", children: "\u26A0 \u5C06\u64A4\u9500\u8BE5 Family \u4E0B\u6240\u6709\u6709\u6548\u4F1A\u8BDD\uFF0C\u7528\u6237\u9700\u8981\u91CD\u65B0\u767B\u5F55\u3002" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm text-[var(--sb-text-muted)] mb-1", children: ["\u64A4\u9500\u539F\u56E0 ", _jsx("span", { className: "text-red-400", children: "*" })] }), _jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u64A4\u9500\u539F\u56E0", value: revokeReason, onChange: (e) => setRevokeReason(e.target.value) })] })] })) })] }));
}
// ─── Detail Panel ────────────────────────────────────────────────────────────
function SessionDetailPanel({ detail, onRevoke, onRevokeFamily }) {
    const ua = parseUA(detail.userAgent);
    const events = [
        { label: 'Created', time: detail.createdAt, color: 'bg-blue-400' },
        detail.lastUsedAt ? { label: 'Last Used', time: detail.lastUsedAt, color: 'bg-emerald-400' } : null,
        detail.replacedBySessionId ? { label: 'Replaced', time: null, color: 'bg-blue-400' } : null,
        detail.revokedAt ? { label: 'Revoked', time: detail.revokedAt, color: 'bg-red-400' } : null,
        { label: 'Expires', time: detail.expiresAt, color: 'bg-gray-400' },
    ].filter(Boolean);
    return (_jsxs("div", { className: "space-y-5 text-sm", children: [_jsxs(Section, { title: "Basic Information", children: [_jsx(InfoRow, { label: "ID", value: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono", children: detail.id }), _jsx(CopyBtn, { text: detail.id })] }) }), _jsx(InfoRow, { label: "User", value: _jsxs("div", { children: [_jsx("div", { children: detail.user?.username || detail.user?.email || '-' }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "text-xs text-[var(--sb-text-muted)] font-mono", children: detail.userId }), _jsx(CopyBtn, { text: detail.userId })] })] }) }), _jsx(InfoRow, { label: "Status", value: _jsx(StatusBadge, { status: detail.status }) }), _jsx(InfoRow, { label: "Created", value: formatTime(detail.createdAt) }), _jsx(InfoRow, { label: "Expires", value: _jsxs("span", { className: isExpiringSoon(detail.expiresAt) && detail.status === 'ACTIVE' ? 'text-orange-400' : '', children: [formatTime(detail.expiresAt), isExpiringSoon(detail.expiresAt) && detail.status === 'ACTIVE' && ' ⚠ 即将过期'] }) }), _jsx(InfoRow, { label: "Last Used", value: detail.lastUsedAt ? formatTime(detail.lastUsedAt) : 'Never used' })] }), _jsxs(Section, { title: "Client Information", children: [_jsx(InfoRow, { label: "User Agent", value: _jsx("span", { className: "text-xs break-all", children: detail.userAgent || '-' }) }), _jsx(InfoRow, { label: "Browser", value: ua.browser }), _jsx(InfoRow, { label: "OS", value: ua.os }), _jsx(InfoRow, { label: "Device", value: ua.device }), _jsx(InfoRow, { label: "IP Address", value: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono", children: detail.ipAddress || '-' }), detail.ipAddress && _jsx(CopyBtn, { text: detail.ipAddress })] }) })] }), _jsxs(Section, { title: "Token Information", children: [_jsx(InfoRow, { label: "Token Family", value: _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono text-[var(--sb-primary)]", children: detail.refreshTokenFamilyId }), _jsx(CopyBtn, { text: detail.refreshTokenFamilyId })] }) }), _jsx(InfoRow, { label: "Refresh Token Hash", value: _jsx("span", { className: "font-mono text-[var(--sb-text-muted)]", children: detail.refreshTokenHashMasked }) }), _jsx(InfoRow, { label: "Replaced By", value: detail.replacedBySessionId ? _jsxs("span", { className: "inline-flex items-center", children: [_jsx("span", { className: "font-mono text-blue-400", children: detail.replacedBySessionId }), _jsx(CopyBtn, { text: detail.replacedBySessionId })] }) : '-' })] }), _jsx(Section, { title: "Revocation Information", children: detail.revokedAt ? (_jsxs(_Fragment, { children: [_jsx(InfoRow, { label: "Revoked At", value: formatTime(detail.revokedAt) }), _jsx(InfoRow, { label: "Reason", value: detail.revokedReason || '-' })] })) : _jsx("div", { className: "text-[var(--sb-text-muted)] italic", children: "Not revoked" }) }), _jsx(Section, { title: "Lifecycle Timeline", children: _jsxs("div", { className: "relative pl-4 space-y-3", children: [_jsx("div", { className: "absolute left-[7px] top-2 bottom-2 w-px bg-[var(--sb-border)]" }), events.map((ev, i) => (_jsxs("div", { className: "relative flex items-center gap-3", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${ev.color} shrink-0 z-10` }), _jsxs("div", { className: "text-[var(--sb-text-secondary)]", children: [_jsx("span", { className: "font-medium", children: ev.label }), ev.time && _jsx("span", { className: "ml-2 text-xs text-[var(--sb-text-muted)]", children: formatTime(ev.time) })] })] }, i)))] }) }), detail.status === 'ACTIVE' && (_jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx(Button, { size: "sm", className: "bg-red-600 hover:bg-red-700", onClick: () => onRevoke(detail), children: "\u64A4\u9500\u4F1A\u8BDD" }), _jsx(Button, { size: "sm", variant: "ghost", className: "text-red-400", onClick: () => onRevokeFamily(detail), children: "\u64A4\u9500\u540C Family" })] }))] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-[var(--sb-text-primary)] mb-2 border-b border-[var(--sb-border)] pb-1", children: title }), _jsx("div", { className: "space-y-1.5", children: children })] }));
}
function InfoRow({ label, value }) {
    return (_jsxs("div", { className: "flex gap-2", children: [_jsx("span", { className: "text-[var(--sb-text-muted)] w-32 shrink-0", children: label }), _jsx("span", { className: "text-[var(--sb-text-primary)] break-all", children: value })] }));
}
//# sourceMappingURL=sessions.js.map