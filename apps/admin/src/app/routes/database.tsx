import { useQuery } from '@tanstack/react-query';
import { adminListTablesApi, adminGetTableDataApi, type TableInfo, type ColumnDef } from '../../features/database/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useState, useRef, useCallback, useEffect } from 'react';

function formatValue(value: any, col: ColumnDef): string {
  if (value === null || value === undefined) return 'NULL';
  if (col.type === 'Json') return JSON.stringify(value);
  if (col.type === 'DateTime') return new Date(value).toISOString();
  if (col.type === 'Decimal') return String(value);
  return String(value);
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
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
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono rounded ${colors[type] || 'bg-gray-500/20 text-gray-400'}`}>
      {type}
    </span>
  );
}

function SyncedScrollTable({ columns, items }: { columns: ColumnDef[]; items: Record<string, any>[] }) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const syncScroll = useCallback((source: 'top' | 'bottom') => {
    if (syncing.current) return;
    syncing.current = true;
    const from = source === 'top' ? topRef.current : bottomRef.current;
    const to = source === 'top' ? bottomRef.current : topRef.current;
    if (from && to) {
      to.scrollLeft = from.scrollLeft;
    }
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  const columnWidths = columns.map(() => 160);

  const tableContent = (
    <table className="text-xs" style={{ minWidth: 'max-content' }}>
      <thead>
        <tr className="border-b border-[var(--sb-border)]">
          {columns.map((col, ci) => (
            <th key={col.name} className="text-left py-2 px-3 font-medium whitespace-nowrap" style={{ minWidth: columnWidths[ci] }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--sb-text-muted)]">{col.name}</span>
                <TypeBadge type={col.type} />
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={i} className="border-b border-[var(--sb-border)] hover:bg-[var(--sb-bg-muted)]">
            {columns.map((col, ci) => {
              const rawValue = item[col.name];
              const display = formatValue(rawValue, col);
              const isNull = rawValue === null || rawValue === undefined;
              return (
                <td key={col.name} className="py-2 px-3 font-mono whitespace-nowrap max-w-[300px] truncate" style={{ minWidth: columnWidths[ci] }} title={display}>
                  <span className={isNull ? 'text-[var(--sb-text-muted)] italic' : 'text-[var(--sb-text-secondary)]'}>
                    {display}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Phantom header for top scrollbar sync
  const phantomHeader = (
    <table className="text-xs" style={{ minWidth: 'max-content' }}>
      <thead>
        <tr>
          {columns.map((col, ci) => (
            <th key={col.name} className="py-0 px-3 whitespace-nowrap" style={{ minWidth: columnWidths[ci] }}>
              <span className="invisible text-xs">{col.name}</span>
            </th>
          ))}
        </tr>
      </thead>
    </table>
  );

  return (
    <Card>
      {/* Top scrollbar */}
      <div
        ref={topRef}
        className="overflow-x-auto overflow-y-hidden border-b border-[var(--sb-border)]"
        style={{ maxHeight: '14px' }}
        onScroll={() => syncScroll('top')}
      >
        {phantomHeader}
      </div>

      {/* Main table */}
      <div
        ref={bottomRef}
        className="overflow-x-auto"
        onScroll={() => syncScroll('bottom')}
      >
        {tableContent}
      </div>
    </Card>
  );
}

export default function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState<string>('');
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

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--sb-text-primary)]">所有数据库</h1>

      {/* Table selector */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {tables.map((table) => (
            <button
              key={table.tableName}
              onClick={() => { setSelectedTable(table.tableName); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-mono rounded-lg cursor-pointer transition-colors border ${
                selectedTable === table.tableName
                  ? 'bg-[var(--sb-primary)] text-white border-[var(--sb-primary)]'
                  : 'bg-[var(--sb-bg-muted)] text-[var(--sb-text-secondary)] border-[var(--sb-border)] hover:text-[var(--sb-text-primary)]'
              }`}
            >
              {table.tableName}
            </button>
          ))}
        </div>
      </Card>

      {/* Column info */}
      {currentTable && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--sb-text-secondary)] mb-3">
            {currentTable.tableName} — {currentTable.columns.length} columns
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentTable.columns.map((col) => (
              <div key={col.name} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--sb-bg-muted)] rounded border border-[var(--sb-border)]">
                <span className="text-xs font-mono text-[var(--sb-text-primary)]">{col.name}</span>
                <TypeBadge type={col.type} />
                {col.optional && <span className="text-[10px] text-[var(--sb-text-muted)]">?</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table data */}
      {selectedTable ? (
        isLoading ? (
          <div className="text-center text-[var(--sb-text-muted)] py-8">加载中...</div>
        ) : tableData && currentTable ? (
          <>
            <div className="flex items-center justify-between text-sm text-[var(--sb-text-muted)]">
              <span>{currentTable.tableName} — 共 {tableData.total} 条记录</span>
            </div>

            <SyncedScrollTable columns={currentTable.columns} items={tableData.items} />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm text-[var(--sb-text-muted)] px-3">{page} / {totalPages}</span>
                <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            )}
          </>
        ) : null
      ) : (
        <div className="text-center text-[var(--sb-text-muted)] py-12">选择一个表查看数据</div>
      )}
    </div>
  );
}
