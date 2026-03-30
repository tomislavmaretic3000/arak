'use client'

import { useUIStore } from '@/store/ui'
import { useEditorStore } from '@/store/editor'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormatStore } from '@/store/format'

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200))
}

export function Counters() {
  const { showCounters } = useUIStore()
  const pathname = usePathname()
  const writeContent = useEditorStore((s) => s.content)
  const formatContent = useFormatStore((s) => s.content)

  const [text, setText] = useState('')

  // Extract plain text from TipTap JSON for format mode
  useEffect(() => {
    if (pathname === '/write') {
      setText(writeContent)
      return
    }
    if (!formatContent) { setText(''); return }
    // Walk the TipTap JSON tree and collect text
    function extractText(node: Record<string, unknown>): string {
      if (node.type === 'text') return (node.text as string) ?? ''
      const children = (node.content as Record<string, unknown>[]) ?? []
      return children.map(extractText).join(' ')
    }
    setText(extractText(formatContent as Record<string, unknown>))
  }, [pathname, writeContent, formatContent])

  if (!showCounters) return null

  const words = countWords(text)
  const chars = text.length
  const minutes = readingMinutes(words)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '1.5rem',
        fontFamily: 'var(--font-noto-sans)',
        fontSize: '11px',
        color: 'var(--muted)',
        opacity: 0.4,
        pointerEvents: 'none',
        userSelect: 'none',
        letterSpacing: '0.03em',
        transition: 'opacity 300ms ease-in-out',
      }}
    >
      <span>{words.toLocaleString()} words</span>
      <span>{chars.toLocaleString()} chars</span>
      <span>{minutes} min read</span>
    </div>
  )
}
