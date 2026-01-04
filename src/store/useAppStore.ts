import { create } from 'zustand'

interface AppState {
    isSidebarOpen: boolean
    toggleSidebar: () => void
    isSearchOpen: boolean
    setSearchOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    isSearchOpen: false,
    setSearchOpen: (open) => set({ isSearchOpen: open }),
}))
