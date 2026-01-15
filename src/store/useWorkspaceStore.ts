import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceStore {
  currentWorkspaceId: string | null
  setCurrentWorkspaceId: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),
    }),
    { name: 'workspace-storage' }
  )
)
