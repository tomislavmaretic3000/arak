'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '@/store/editor'
import { useFilesStore } from '@/store/files'

const AUTOSAVE_INTERVAL = 2 * 60 * 1000 // 2 min
const IDLE_DELAY = 3_000                 // 3 s after last keystroke

export function AutosaveProvider({ children }: { children: React.ReactNode }) {
  const content = useEditorStore((s) => s.content)
  const { markSaved, markDirty } = useFilesStore()

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const save = useCallback(() => {
    // Content is already persisted to localStorage via Zustand persist.
    // We only need to update the timestamp.
    markSaved()
  }, [markSaved])

  // On every content change: mark dirty + reset idle timer
  useEffect(() => {
    markDirty()

    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(save, IDLE_DELAY)

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [content, markDirty, save])

  // Periodic autosave every 2 minutes
  useEffect(() => {
    intervalTimer.current = setInterval(save, AUTOSAVE_INTERVAL)
    return () => {
      if (intervalTimer.current) clearInterval(intervalTimer.current)
    }
  }, [save])

  return <>{children}</>
}
