import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { adminListTablesApi, adminGetTableDataApi } from '../../features/database/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useState, useRef, useCallback } from 'react';
function formatValue(value, col) {
    if (value === null || value === undefined)
        return 'NULL';
    if (col.type === 'Json')
        return JSON.stringify(value);
    if (col.type === 'DateTime')
        return new Date(value).toISOString();
    if (col.type === 'Decimal')
        return String(value);
    return String(value);
}
function TypeBadge({ type }) {
    const colors = {
        String: 'bg-blue-500/20 text-blue-400',
        Int: 'bg-green-500/20 text-green-400',
        Float: 'bg-green-500/20 text-green-400',
        Boolean: 'bg-yellow-500/20 text-yellow-400',
        DateTime: 'bg-purple-500/20 text-purple-400',
        Json: 'bg-orange-500/20 text-orange-400',
        Decimal: 'bg-cyan-500/20 text-cyan-400',
        Enum: 'bg-pink-500/20 text-pink-400',
        BigInt: 'bg-green-500/20 text-green-400',
    };
    return (_jsx("span", { className: `inline-block px-1.5 py-0.5 text-[10px] font-mono rounded ${colors[type] || 'bg-gray-500/20 text-gray-400'}`, children: type }));
}
function SyncedScrollTable({ columns, items }) {
    const topRef = useRef(null);
    const bottomRef = useRef(null);
    const syncing = useRef(false);
    const syncScroll = useCallback((source) => {
        if (syncing.current)
            return;
        syncing.current = true;
        const from = source === 'top' ? topRef.current : bottomRef.current;
        const to = source === 'top' ? bottomRef.current : topRef.current;
        if (from && to) {
            to.scrollLeft = from.scrollLeft;
        }
        requestAnimationFrame(() => { syncing.current = false; });
    }, []);
    const columnWidths = columns.map(() => 160);
    const tableContent = (_jsxs("table", { className: "text-xs", style: { minWidth: 'max-content' }, children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-[var(--sb-border)]", children: columns.map((col, ci) => (_jsx("th", { className: "text-left py-2 px-3 font-medium whitespace-nowrap", style: { minWidth: columnWidths[ci] }, children: _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[var(--sb-text-muted)]", children: col.name }), _jsx(TypeBadge, { type: col.type })] }) }, col.name))) }) }), _jsx("tbody", { children: items.map((item, i) => (_jsx("tr", { className: "border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]", children: columns.map((col, ci) => {
                        const rawValue = item[col.name];
                        const display = formatValue(rawValue, col);
                        const isNull = rawValue === null || rawValue === undefined;
                        return (_jsx("td", { className: "py-2 px-3 font-mono whitespace-nowrap max-w-[300px] truncate", style: { minWidth: columnWidths[ci] }, title: display, children: _jsx("span", { className: isNull ? 'text-[var(--sb-text-muted)] italic' : 'text-[var(--sb-text-secondary)]', children: display }) }, col.name));
                    }) }, i))) })] }));
    // Phantom header for top scrollbar sync
    const phantomHeader = (_jsx("table", { className: "text-xs", style: { minWidth: 'max-content' }, children: _jsx("thead", { children: _jsx("tr", { children: columns.map((col, ci) => (_jsx("th", { className: "py-0 px-3 whitespace-nowrap", style: { minWidth: columnWidths[ci] }, children: _jsx("span", { className: "invisible text-xs", children: col.name }) }, col.name))) }) }) }));
    return (_jsxs(Card, { children: [_jsx("div", { ref: topRef, className: "overflow-x-auto overflow-y-hidden border-b border-[var(--sb-border)]", style: { maxHeight: '14px' }, onScroll: () => syncScroll('top'), children: phantomHeader }), _jsx("div", { ref: bottomRef, className: "overflow-x-auto", onScroll: () => syncScroll('bottom'), children: tableContent })] }));
}
export default function DatabasePage() {
    const [selectedTable, setSelectedTable] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 50;
    const { data: tablesData } = useQuery({
        queryKey: ['admin-db-tables'],
        queryFn: adminListTablesApi,
    });
    const tables = tablesData?.tables || [];
    const currentTable = tables.find((t) => t.tableName === selectedTable);
    const { data: tableData, isLoading } = useQuery({
        queryKey: ['admin-db-data', selectedTable, page],
        queryFn: () => adminGetTableDataApi(selectedTable, { page, pageSize }),
        enabled: !!selectedTable,
    });
    const totalPages = tableData ? Math.ceil(tableData.total / pageSize) : 1;
    return (_jsxs("div", { className: "p-6 max-w-full mx-auto space-y-6", children: [_jsx("h1", { className: "text-2xl font-bold text-[var(--sb-text-primary)]", children: "\u6240\u6709\u6570\u636E\u5E93" }), _jsx(Card, { className: "p-4", children: _jsx("div", { className: "flex flex-wrap gap-2", children: tables.map((table) => (_jsx("button", { onClick: () => { setSelectedTable(table.tableName); setPage(1); }, className: `px-3 py-1.5 text-sm font-mono rounded-lg cursor-pointer transition-colors border ${selectedTable === table.tableName
                            ? 'bg-[var(--sb-primary)] text-white border-[var(--sb-primary)]'
                            : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] border-[var(--sb-border)] hover:text-[var(--sb-text-primary)]'}`, children: table.tableName }, table.tableName))) }) }), currentTable && (_jsxs(Card, { className: "p-4", children: [_jsxs("h2", { className: "text-sm font-semibold text-[var(--sb-text-secondary)] mb-3", children: [currentTable.tableName, " \u2014 ", currentTable.columns.length, " columns"] }), _jsx("div", { className: "flex flex-wrap gap-2", children: currentTable.columns.map((col) => (_jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1 bg-[var(--sb-bg-muted)] rounded border border-[var(--sb-border)]", children: [_jsx("span", { className: "text-xs font-mono text-[var(--sb-text-primary)]", children: col.name }), _jsx(TypeBadge, { type: col.type }), col.optional && _jsx("span", { className: "text-[10px] text-[var(--sb-text-muted)]", children: "?" })] }, col.name))) })] })), selectedTable ? (isLoading ? (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-8", children: "\u52A0\u8F7D\u4E2D..." })) : tableData && currentTable ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center justify-between text-sm text-[var(--sb-text-muted)]", children: _jsxs("span", { children: [currentTable.tableName, " \u2014 \u5171 ", tableData.total, " \u6761\u8BB0\u5F55"] }) }), _jsx(SyncedScrollTable, { columns: currentTable.columns, items: tableData.items }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-center gap-2", children: [_jsx(Button, { size: "sm", variant: "secondary", disabled: page <= 1, onClick: () => setPage(p => p - 1), children: "\u4E0A\u4E00\u9875" }), _jsxs("span", { className: "text-sm text-[var(--sb-text-muted)] px-3", children: [page, " / ", totalPages] }), _jsx(Button, { size: "sm", variant: "secondary", disabled: page >= totalPages, onClick: () => setPage(p => p + 1), children: "\u4E0B\u4E00\u9875" })] }))] })) : null) : (_jsx("div", { className: "text-center text-[var(--sb-text-muted)] py-12", children: "\u9009\u62E9\u4E00\u4E2A\u8868\u67E5\u770B\u6570\u636E" }))] }));
}
//# sourceMappingURL=database.js.map