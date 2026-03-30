import { create } from 'zustand'

export interface Match {
  start: number
  end: number
}

type SearchMode = 'search' | 'replace'

interface SearchStore {
  isOpen: boolean
  mode: SearchMode
  query: string
  replaceText: string
  matches: Match[]
  currentMatchIndex: number

  open: (mode?: SearchMode) => void
  close: () => void
  setQuery: (q: string) => void
  setReplaceText: (t: string) => void
  setMatches: (matches: Match[]) => void
  goToNext: () => void
  goToPrev: () => void
  setCurrentMatchIndex: (i: number) => void
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  isOpen: false,
  mode: 'search',
  query: '',
  replaceText: '',
  matches: [],
  currentMatchIndex: 0,

  open: (mode = 'search') => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false, query: '', matches: [], currentMatchIndex: 0 }),

  setQuery: (query) => set({ query, currentMatchIndex: 0 }),
  setReplaceText: (replaceText) => set({ replaceText }),
  setMatches: (matches) => set({ matches }),

  goToNext: () => {
    const { matches, currentMatchIndex } = get()
    if (matches.length === 0) return
    set({ currentMatchIndex: (currentMatchIndex + 1) % matches.length })
  },
  goToPrev: () => {
    const { matches, currentMatchIndex } = get()
    if (matches.length === 0) return
    set({
      currentMatchIndex:
        (currentMatchIndex - 1 + matches.length) % matches.length,
    })
  },
  setCurrentMatchIndex: (i) => set({ currentMatchIndex: i }),
}))
