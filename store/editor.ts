import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'shade'
export type Font = 'sans' | 'serif' | 'mono'
export type SizeOption = 'small' | 'medium' | 'large'

interface EditorStore {
  content: string
  focusMode: boolean
  posHighlight: boolean
  showWordCount: boolean
  theme: Theme
  font: Font
  fontSize: SizeOption
  lineHeight: SizeOption
  setContent: (content: string) => void
  toggleFocusMode: () => void
  setFocusMode: (v: boolean) => void
  setPosHighlight: (v: boolean) => void
  setShowWordCount: (v: boolean) => void
  setTheme: (theme: Theme) => void
  setFont: (font: Font) => void
  setFontSize: (v: SizeOption) => void
  setLineHeight: (v: SizeOption) => void
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      content: '',
      focusMode: true,
      posHighlight: false,
      showWordCount: false,
      theme: 'light',
      font: 'serif',
      fontSize: 'medium',
      lineHeight: 'medium',
      setContent: (content) => set({ content }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setFocusMode: (focusMode) => set({ focusMode }),
      setPosHighlight: (posHighlight) => set({ posHighlight }),
      setShowWordCount: (showWordCount) => set({ showWordCount }),
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
    }),
    { name: 'arak-editor' }
  )
)

// ── Display value maps ────────────────────────────────────────────────────────

export const FONT_SIZE_MAP: Record<SizeOption, string> = {
  small: '18px',
  medium: '24px',
  large: '32px',
}

export const LINE_HEIGHT_MAP: Record<SizeOption, string> = {
  small: '1.5',
  medium: '1.75',
  large: '2.2',
}
