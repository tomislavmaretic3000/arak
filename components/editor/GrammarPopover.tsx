'use client'

import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { LTMatch } from '@/lib/editor/languageTool'

interface Props {
  editor: Editor
  matches: LTMatch[]
}

const CATEGORY_COLOR: Record<string, string> = {
  spelling: 'rgba(220,80,60,0.7)',
  grammar:  'rgba(60,120,220,0.7)',
  style:    'rgba(150,150,150,0.5)',
  other:    'rgba(150,150,150,0.5)',
}

export function GrammarPopover({ editor, matches }: Props) {
  const [popover, setPopover] = useState<{
    match: LTMatch
    x: number
    y: number
  } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Listen for clicks on decorated spans
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-lt-rule]') as HTMLElement | null
      if (!target) { setPopover(null); return }

      const ruleId = target.getAttribute('data-lt-rule')
      const match = matches.find((m) => m.ruleId === ruleId) ?? null
      if (!match) { setPopover(null); return }

      const rect = target.getBoundingClientRect()
      setPopover({
        match,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      })
      e.stopPropagation()
    }

    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, matches])

  // Close on outside click
  useEffect(() => {
    if (!popover) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPopover(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [popover])

  const applyReplacement = (replacement: string) => {
    if (!popover) return
    const { match } = popover
    // Find the position in the doc using the match offset
    let pos = 1
    let found = false
    editor.state.doc.forEach((node) => {
      if (found) return
      if (node.isTextblock) {
        const start = pos + 1
        const end = start + node.textContent.length
        if (match.offset >= 0 && match.offset < node.textContent.length) {
          const from = start + match.offset
          const to = from + match.length
          editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
          found = true
        }
      }
      pos += node.nodeSize
    })
    setPopover(null)
  }

  if (!popover) return null

  const { match, x, y } = popover
  const color = CATEGORY_COLOR[match.category]

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: y,
        left: x,
        transform: 'translateX(-50%)',
        zIndex: 150,
        background: '#1a1a18',
        borderRadius: 12,
        padding: '10px 14px',
        maxWidth: 280,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Category badge + message */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: match.replacements.length ? 10 : 0 }}>
        <span style={{
          flexShrink: 0,
          width: 6, height: 6,
          borderRadius: '50%',
          background: color,
          marginTop: 5,
        }} />
        <span style={{
          fontSize: 13,
          lineHeight: 1.4,
          color: 'rgba(255,255,255,0.7)',
        }}>
          {match.shortMessage}
        </span>
      </div>

      {/* Replacement suggestions */}
      {match.replacements.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {match.replacements.map((r) => (
            <button
              key={r}
              onMouseDown={(e) => { e.preventDefault(); applyReplacement(r) }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                fontFamily: 'inherit',
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
