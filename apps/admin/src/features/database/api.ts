import { apiRequest } from '../../lib/api-client';

export interface ColumnDef {
  name: string;
  type: string;
  optional: boolean;
}

export interface TableInfo {
  tableName: string;
  modelName: string;
  columns: ColumnDef[];
}

export interface TableDataResponse {
  items: Record<string, any>[];
  total: number;
  columns: ColumnDef[];
}

export async function adminListTablesApi(): Promise<{ tables: TableInfo[] }> {
  return apiRequest('/admin/database/tables');
}

export async function adminGetTableDataApi(
  tableName: string,
  params?: { page?: number; pageSize?: number },
): Promise<TableDataResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
  const qs = sp.toString();
  return apiRequest(`/admin/database/tables/${tableName}${qs ? `?${qs}` : ''}`);
}
