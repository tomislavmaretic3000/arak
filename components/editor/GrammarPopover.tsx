'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { LTMatch } from '@/lib/editor/languageTool'

interface Props {
  editor: Editor
  matches: LTMatch[]
}

function buildPosMap(editor: Editor): number[] {
  const map: number[] = []
  editor.state.doc.forEach((node, offset) => {
    if (!node.isTextblock) return
    const pmStart = offset + 1
    for (let i = 0; i < node.textContent.length; i++) map.push(pmStart + i)
  })
  return map
}

export function GrammarPopover({ editor, matches }: Props) {
  const [popover, setPopover] = useState<{ match: LTMatch; x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dom = editor.view.dom as HTMLElement

    const onClick = (e: MouseEvent) => {
      // TipTap decorations render real <span> elements — read their rect directly
      const span = (e.target as HTMLElement).closest('.lt-spelling, .lt-grammar, .lt-style, .lt-other') as HTMLElement | null

      if (!span) { setPopover(null); return }

      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor)
      const match = matches.find((m) => {
        const end = m.offset + m.length
        if (m.offset >= posMap.length || end > posMap.length) return false
        return result.pos >= posMap[m.offset] && result.pos < posMap[end - 1] + 1
      }) ?? null

      if (!match) { setPopover(null); return }

      const rect = span.getBoundingClientRect()
      setPopover({ match, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
      e.stopPropagation()
    }

    dom.addEventListener('click', onClick)
    return () => dom.removeEventListener('click', onClick)
  }, [editor, matches])

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
  const label       = match.shortMessage || match.message
  const replacements = match.replacements.slice(0, 5)
  // Single replacement: show the message as the action button (don't show raw value)
  // Multiple replacements: show message as label, chips let user pick which alternative
  const singleFix  = replacements.length === 1
  const multiChips = replacements.length > 1

  // Chip button shared style — transparent bg inside the unified pill container
  const chipStyle: React.CSSProperties = {
    height: 30,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    borderRadius: 100,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    cursor: 'pointer',
    transition: 'background 100ms, color 100ms',
    flexShrink: 0,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  }

  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.color = '#fff'
  }
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'none'
    e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
  }

  return createPortal(
    <div
      ref={ref}
      className="format-toolbar-enter"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        transform: 'translateX(-50%)',
        zIndex: 150,
        background: '#1a1a18',
        borderRadius: 100,
        padding: 4,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 2,
        maxWidth: 360,
      }}
    >
      {singleFix && (
        <button
          onMouseDown={(e) => { e.preventDefault(); applyReplacement(replacements[0]) }}
          style={chipStyle}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {match.category === 'spelling' ? replacements[0] : label}
        </button>
      )}

      {multiChips && replacements.map((r) => (
        <button
          key={r}
          onMouseDown={(e) => { e.preventDefault(); applyReplacement(r) }}
          style={chipStyle}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          {r}
        </button>
      ))}

      {replacements.length === 0 && (
        <div style={{ padding: '6px 12px', fontSize: 14, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.01em' }}>
          {label}
        </div>
      )}
    </div>,
    document.body
  )
}
