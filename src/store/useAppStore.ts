import { create } from 'zustand'

interface AppState {
    isSidebarOpen: boolean
    toggleSidebar: () => void
    isSearchOpen: boolean
    setSearchOpen: (open: boolean) => void
    // 新消息通知
    hasNewMessages: boolean
    setHasNewMessages: (has: boolean) => void
    acknowledgeNewMessages: () => void
}

export const useAppStore = create<AppState>((set) => ({
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    isSearchOpen: false,
    setSearchOpen: (open) => set({ isSearchOpen: open }),
    hasNewMessages: false,
    setHasNewMessages: (has) => set({ hasNewMessages: has }),
    acknowledgeNewMessages: () => set({ hasNewMessages: false }),
}))
