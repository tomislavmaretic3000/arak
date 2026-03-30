'use client'

import { useEffect, useState } from 'react'
import { useFilesStore } from '@/store/files'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return m === 1 ? '1 min ago' : `${m} min ago`
}

export function SaveIndicator() {
  const lastSaved = useFilesStore((s) => s.lastSaved)
  const isDirty = useFilesStore((s) => s.isDirty)
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!lastSaved) return
    setLabel(timeAgo(lastSaved))
    const id = setInterval(() => setLabel(timeAgo(lastSaved)), 10_000)
    return () => clearInterval(id)
  }, [lastSaved])

  if (!lastSaved && !isDirty) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.75rem',
        fontSize: '11px',
        color: 'var(--muted)',
        opacity: isDirty ? 0.5 : 0.25,
        transition: 'opacity 400ms ease-in-out',
        fontFamily: 'var(--font-noto-sans)',
        letterSpacing: '0.03em',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {isDirty ? 'unsaved' : `saved ${label}`}
    </div>
  )
}
