import { create } from 'zustand'

export type CmdMode = 'command' | 'find' | 'replace'

interface CommandBarStore {
  isOpen: boolean
  mode: CmdMode
  open: (mode?: CmdMode) => void
  close: () => void
}

export const useCommandBarStore = create<CommandBarStore>((set) => ({
  isOpen: false,
  mode: 'command',
  open: (mode = 'command') => set({ isOpen: true, mode }),
  close: () => set({ isOpen: false }),
}))
