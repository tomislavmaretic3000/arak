import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MARGIN_MIN = 32
export const MARGIN_MAX = 160
export const MARGIN_DEFAULT = 96

export type PaperFormat = 'a4' | 'letter' | 'none'
export type PageNumberPos = 'left' | 'center' | 'right'

export const PAPER_SIZES = {
  a4:     { width: 794, height: 1123, label: 'A4' },
  letter: { width: 816, height: 1056, label: 'Letter' },
} as const

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
  paperFormat: PaperFormat
  showHeader: boolean
  showFooter: boolean
  headerText: string
  footerText: string
  showPageNumbers: boolean
  pageNumberPos: PageNumberPos
  setContent: (content: Record<string, unknown>) => void
  setTitle: (title: string) => void
  markSaved: () => void
  markDirty: () => void
  setMargin: (side: 'top' | 'right' | 'bottom' | 'left', value: number) => void
  setPaperFormat: (v: PaperFormat) => void
  setShowHeader: (v: boolean) => void
  setShowFooter: (v: boolean) => void
  setHeaderText: (v: string) => void
  setFooterText: (v: string) => void
  setShowPageNumbers: (v: boolean) => void
  setPageNumberPos: (v: PageNumberPos) => void
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
      paperFormat: 'a4',
      showHeader: false,
      showFooter: false,
      headerText: '',
      footerText: '',
      showPageNumbers: false,
      pageNumberPos: 'center',
      setContent: (content) => set({ content }),
      setTitle: (title) => set({ title }),
      markSaved: () => set({ lastSaved: Date.now(), isDirty: false }),
      markDirty: () => set({ isDirty: true }),
      setMargin: (side, value) => set({ [`margin${side.charAt(0).toUpperCase()}${side.slice(1)}`]: value }),
      setPaperFormat: (paperFormat) => set({ paperFormat }),
      setShowHeader: (showHeader) => set({ showHeader }),
      setShowFooter: (showFooter) => set({ showFooter }),
      setHeaderText: (headerText) => set({ headerText }),
      setFooterText: (footerText) => set({ footerText }),
      setShowPageNumbers: (showPageNumbers) => set({ showPageNumbers }),
      setPageNumberPos: (pageNumberPos) => set({ pageNumberPos }),
    }),
    { name: 'arak-format' }
  )
)
