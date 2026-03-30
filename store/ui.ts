import { create } from 'zustand'

interface UIStore {
  leftOpen: boolean
  rightOpen: boolean
  showCounters: boolean
  openLeft: () => void
  openRight: () => void
  closeAll: () => void
  toggleCounters: () => void
}

export const useUIStore = create<UIStore>()((set) => ({
  leftOpen: false,
  rightOpen: false,
  showCounters: false,
  openLeft: () => set({ leftOpen: true, rightOpen: false }),
  openRight: () => set({ rightOpen: true, leftOpen: false }),
  closeAll: () => set({ leftOpen: false, rightOpen: false }),
  toggleCounters: () => set((s) => ({ showCounters: !s.showCounters })),
}))
