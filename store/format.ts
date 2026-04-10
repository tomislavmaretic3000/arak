import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MARGIN_MIN = 32
export const MARGIN_MAX = 160
export const MARGIN_DEFAULT = 96

interface FormatStore {
  // TipTap JSON content — null means use default empty doc
  content: Record<string, unknown> | null
  title: string
  lastSaved: number | null
  isDirty: boolean
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  setContent: (content: Record<string, unknown>) => void
  setTitle: (title: string) => void
  markSaved: () => void
  markDirty: () => void
  setMargin: (side: 'top' | 'right' | 'bottom' | 'left', value: number) => void
}

export const useFormatStore = create<FormatStore>()(
  persist(
    (set) => ({
      content: null,
      title: 'untitled',
      lastSaved: null,
      isDirty: false,
      marginTop: MARGIN_DEFAULT,
      marginRight: MARGIN_DEFAULT,
      marginBottom: MARGIN_DEFAULT,
      marginLeft: MARGIN_DEFAULT,
      setContent: (content) => set({ content }),
      setTitle: (title) => set({ title }),
      markSaved: () => set({ lastSaved: Date.now(), isDirty: false }),
      markDirty: () => set({ isDirty: true }),
      setMargin: (side, value) => set({ [`margin${side.charAt(0).toUpperCase()}${side.slice(1)}`]: value }),
    }),
    { name: 'arak-format' }
  )
)
