import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DocMode = 'write' | 'format'

export interface DocEntry {
  id: string
  title: string
  mode: DocMode
  content: string | Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

interface DocumentsStore {
  docs: DocEntry[]
  activeWriteId: string | null
  activeFormatId: string | null

  /** Create a new document and set it as active for its mode. Returns the new doc. */
  createDoc: (mode: DocMode, title?: string) => DocEntry
  /** Patch an existing document's fields. */
  updateDoc: (id: string, patch: Partial<Pick<DocEntry, 'title' | 'content'>>) => void
  /** Remove a document. Falls back to the next available doc for that mode. */
  removeDoc: (id: string) => void
  setActiveWrite: (id: string) => void
  setActiveFormat: (id: string) => void
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export const useDocumentsStore = create<DocumentsStore>()(
  persist(
    (set, get) => ({
      docs: [],
      activeWriteId: null,
      activeFormatId: null,

      createDoc: (mode, title = 'untitled') => {
        const doc: DocEntry = {
          id: uid(),
          title,
          mode,
          content: mode === 'write' ? '' : null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => {
          const next: Partial<DocumentsStore> = { docs: [doc, ...s.docs] }
          if (mode === 'write') next.activeWriteId = doc.id
          else next.activeFormatId = doc.id
          return next
        })
        return doc
      },

      updateDoc: (id, patch) => {
        set((s) => ({
          docs: s.docs.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
          ),
        }))
      },

      removeDoc: (id) => {
        const { docs, activeWriteId, activeFormatId } = get()
        const target = docs.find((d) => d.id === id)
        const remaining = docs.filter((d) => d.id !== id)
        const fallback = remaining.find((d) => d.mode === target?.mode)

        set({
          docs: remaining,
          ...(activeWriteId === id ? { activeWriteId: fallback?.id ?? null } : {}),
          ...(activeFormatId === id ? { activeFormatId: fallback?.id ?? null } : {}),
        })
      },

      setActiveWrite: (id) => set({ activeWriteId: id }),
      setActiveFormat: (id) => set({ activeFormatId: id }),
    }),
    { name: 'arak-documents' }
  )
)
