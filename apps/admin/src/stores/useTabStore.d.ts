export interface Tab {
    id: string;
    title: string;
    path: string;
    closeable: boolean;
}
interface TabStore {
    tabs: Tab[];
    activeTabId: string;
    openTab: (tab: Omit<Tab, 'closeable'> & {
        closeable?: boolean;
    }) => void;
    closeTab: (tabId: string) => void;
    closeAllTabs: () => void;
    setActiveTab: (tabId: string) => void;
    updateTabTitle: (tabId: string, title: string) => void;
}
export declare const useTabStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<TabStore>, "setState" | "persist"> & {
    setState(partial: TabStore | Partial<TabStore> | ((state: TabStore) => TabStore | Partial<TabStore>), replace?: false | undefined): unknown;
    setState(state: TabStore | ((state: TabStore) => TabStore), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<TabStore, {
            tabs: Tab[];
            activeTabId: string;
        }, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: TabStore) => void) => () => void;
        onFinishHydration: (fn: (state: TabStore) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<TabStore, {
            tabs: Tab[];
            activeTabId: string;
        }, unknown>>;
    };
}>;
export {};
//# sourceMappingURL=useTabStore.d.ts.map