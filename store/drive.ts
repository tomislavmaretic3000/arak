import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DocMode } from './documents'

interface DriveStore {
  /** Drive file ID currently linked to the active document, keyed by arak doc ID */
  links: Record<string, string>  // arakDocId → driveFileId
  /** Last known Drive file name, keyed by arak doc ID */
  names: Record<string, string>

  linkFile: (arakDocId: string, driveFileId: string, driveName: string) => void
  unlinkFile: (arakDocId: string) => void
  getDriveId: (arakDocId: string) => string | null
  getDriveName: (arakDocId: string) => string | null
}

export const useDriveStore = create<DriveStore>()(
  persist(
    (set, get) => ({
      links: {},
      names: {},

      linkFile: (arakDocId, driveFileId, driveName) =>
        set((s) => ({
          links: { ...s.links, [arakDocId]: driveFileId },
          names: { ...s.names, [arakDocId]: driveName },
        })),

      unlinkFile: (arakDocId) =>
        set((s) => {
          const links = { ...s.links }
          const names = { ...s.names }
          delete links[arakDocId]
          delete names[arakDocId]
          return { links, names }
        }),

      getDriveId: (arakDocId) => get().links[arakDocId] ?? null,
      getDriveName: (arakDocId) => get().names[arakDocId] ?? null,
    }),
    { name: 'arak-drive' }
  )
)
