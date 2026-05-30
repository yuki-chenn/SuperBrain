import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  title: string;
  path: string;
  closeable: boolean;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string;
  openTab: (tab: Omit<Tab, 'closeable'> & { closeable?: boolean }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
}

const DEFAULT_TAB: Tab = { id: '/', title: '仪表盘', path: '/', closeable: false };

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [DEFAULT_TAB],
      activeTabId: '/',

      openTab: (tab) => {
        const { tabs } = get();
        const existing = tabs.find((t) => t.id === tab.id);
        if (existing) {
          set({ activeTabId: existing.id });
        } else {
          const newTab: Tab = {
            id: tab.id,
            title: tab.title,
            path: tab.path,
            closeable: tab.closeable ?? true,
          };
          set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
        }
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const tabToClose = tabs.find((t) => t.id === tabId);
        if (!tabToClose || !tabToClose.closeable) return;

        const remaining = tabs.filter((t) => t.id !== tabId);
        if (remaining.length === 0) return;

        let newActiveId = activeTabId;
        if (activeTabId === tabId) {
          const idx = tabs.findIndex((t) => t.id === tabId);
          const nextTab = remaining[Math.min(idx, remaining.length - 1)];
          newActiveId = nextTab.id;
        }

        set({ tabs: remaining, activeTabId: newActiveId });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabTitle: (tabId, title) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
        }));
      },
    }),
    {
      name: 'admin-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    },
  ),
);
