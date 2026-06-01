import { apiRequest } from '../../lib/api-client';
export async function adminListTablesApi() {
    return apiRequest('/admin/database/tables');
}
export async function adminGetTableDataApi(tableName, params) {
    const sp = new URLSearchParams();
    if (params?.page)
        sp.set('page', String(params.page));
    if (params?.pageSize)
        sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return apiRequest(`/admin/database/tables/${tableName}${qs ? `?${qs}` : ''}`);
}
//# sourceMappingURL=api.js.map