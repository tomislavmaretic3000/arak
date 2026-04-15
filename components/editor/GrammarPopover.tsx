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

/** Rebuilds a flat-text-index → PM-position lookup array from the doc. */
function buildPosMap(editor: Editor): number[] {
  const posMap: number[] = []
  editor.state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    const pmStart = offset + 1
    for (let i = 0; i < node.textContent.length; i++) {
      posMap.push(pmStart + i)
    }
  })
  return posMap
}

export function GrammarPopover({ editor, matches }: Props) {
  const [popover, setPopover] = useState<{
    match: LTMatch
    x: number
    y: number
  } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Listen for clicks inside the editor; use posAtCoords to find which match was hit
  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor)

      const match = matches.find((m) => {
        const end = m.offset + m.length
        if (m.offset >= posMap.length || end > posMap.length) return false
        const from = posMap[m.offset]
        const to   = posMap[end - 1] + 1
        return result.pos >= from && result.pos < to
      }) ?? null

      if (!match) { setPopover(null); return }

      setPopover({ match, x: e.clientX, y: e.clientY + 12 })
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

    const posMap = buildPosMap(editor)
    const end = match.offset + match.length
    if (match.offset >= posMap.length || end > posMap.length) { setPopover(null); return }

    const from = posMap[match.offset]
    const to   = posMap[end - 1] + 1
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()
    setPopover(null)
  }

  if (!popover) return null

  const { match, x, y } = popover
  const color = CATEGORY_COLOR[match.category] ?? CATEGORY_COLOR.other

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
        <span style={{ fontSize: 13, lineHeight: 1.4, color: 'rgba(255,255,255,0.7)' }}>
          {match.shortMessage || match.message}
        </span>
      </div>

      {/* Replacement suggestions */}
      {match.replacements.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {match.replacements.slice(0, 6).map((r) => (
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
