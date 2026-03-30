import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilesStore {
  title: string
  lastSaved: number | null
  isDirty: boolean
  setTitle: (title: string) => void
  markSaved: () => void
  markDirty: () => void
}

export const useFilesStore = create<FilesStore>()(
  persist(
    (set) => ({
      title: 'untitled',
      lastSaved: null,
      isDirty: false,
      setTitle: (title) => set({ title }),
      markSaved: () => set({ lastSaved: Date.now(), isDirty: false }),
      markDirty: () => set({ isDirty: true }),
    }),
    { name: 'arak-files' }
  )
)
