import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'shade'
export type Font = 'sans' | 'serif' | 'mono'
export type SizeOption = 'small' | 'medium' | 'large'
export type SpacingOption = 'small' | 'normal' | 'large'

interface EditorStore {
  content: string
  focusMode: boolean
  typewriterMode: boolean
  posHighlight: boolean
  showWordCount: boolean
  grammarCheck: boolean
  theme: Theme
  font: Font
  fontSize: SizeOption
  spacing: SpacingOption
  setContent: (content: string) => void
  toggleFocusMode: () => void
  setFocusMode: (v: boolean) => void
  setTypewriterMode: (v: boolean) => void
  setPosHighlight: (v: boolean) => void
  setShowWordCount: (v: boolean) => void
  setGrammarCheck: (v: boolean) => void
  setTheme: (theme: Theme) => void
  setFont: (font: Font) => void
  setFontSize: (v: SizeOption) => void
  setSpacing: (v: SpacingOption) => void
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      content: '',
      focusMode: true,
      typewriterMode: false,
      posHighlight: false,
      showWordCount: false,
      grammarCheck: false,
      theme: 'light',
      font: 'serif',
      fontSize: 'medium',
      spacing: 'normal',
      setContent: (content) => set({ content }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setFocusMode: (focusMode) => set({ focusMode }),
      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),
      setPosHighlight: (posHighlight) => set({ posHighlight }),
      setShowWordCount: (showWordCount) => set({ showWordCount }),
      setGrammarCheck: (grammarCheck) => set({ grammarCheck }),
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setFontSize: (fontSize) => set({ fontSize }),
      setSpacing: (spacing) => set({ spacing }),
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

export interface SpacingValues {
  lineHeight: string
  letterSpacing: string
  wordSpacing: string
}

export const SPACING_MAP: Record<SpacingOption, SpacingValues> = {
  small:  { lineHeight: '1.5',  letterSpacing: '0em',    wordSpacing: '0em'    },
  normal: { lineHeight: '1.75', letterSpacing: '0.01em', wordSpacing: '0em'    },
  large:  { lineHeight: '2.1',  letterSpacing: '0.03em', wordSpacing: '0.05em' },
}

// Keep LINE_HEIGHT_MAP for AboutView compatibility
export const LINE_HEIGHT_MAP: Record<SizeOption, string> = {
  small: '1.5',
  medium: '1.75',
  large: '2.2',
}
