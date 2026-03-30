import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'shade'
export type Font = 'sans' | 'serif' | 'mono'

interface EditorStore {
  content: string
  focusMode: boolean
  typewriterMode: boolean
  theme: Theme
  font: Font
  setContent: (content: string) => void
  toggleFocusMode: () => void
  toggleTypewriterMode: () => void
  setTheme: (theme: Theme) => void
  setFont: (font: Font) => void
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      content: '',
      focusMode: true,
      typewriterMode: true,
      theme: 'light',
      font: 'serif',
      setContent: (content) => set({ content }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      toggleTypewriterMode: () => set((s) => ({ typewriterMode: !s.typewriterMode })),
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
    }),
    { name: 'arak-editor' }
  )
)
