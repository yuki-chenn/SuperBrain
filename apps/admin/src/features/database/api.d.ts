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
export declare function adminListTablesApi(): Promise<{
    tables: TableInfo[];
}>;
export declare function adminGetTableDataApi(tableName: string, params?: {
    page?: number;
    pageSize?: number;
}): Promise<TableDataResponse>;
//# sourceMappingURL=api.d.ts.map