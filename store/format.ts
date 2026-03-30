import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FormatStore {
  // TipTap JSON content — null means use default empty doc
  content: Record<string, unknown> | null
  title: string
  lastSaved: number | null
  isDirty: boolean
  setContent: (content: Record<string, unknown>) => void
  setTitle: (title: string) => void
  markSaved: () => void
  markDirty: () => void
}

export const useFormatStore = create<FormatStore>()(
  persist(
    (set) => ({
      content: null,
      title: 'untitled',
      lastSaved: null,
      isDirty: false,
      setContent: (content) => set({ content }),
      setTitle: (title) => set({ title }),
      markSaved: () => set({ lastSaved: Date.now(), isDirty: false }),
      markDirty: () => set({ isDirty: true }),
    }),
    { name: 'arak-format' }
  )
)
