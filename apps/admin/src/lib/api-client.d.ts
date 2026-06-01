export declare class ApiError extends Error {
    statusCode: number;
    body?: unknown | undefined;
    constructor(statusCode: number, message: string, body?: unknown | undefined);
}
export declare function apiRequest<T>(path: string, options?: RequestInit): Promise<T>;
//# sourceMappingURL=api-client.d.ts.map