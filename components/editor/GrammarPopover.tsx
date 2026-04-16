'use client'

import { useEffect, useRef, useState } from 'react'
import { SpellCheck, Languages, Pencil } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import type { LTMatch } from '@/lib/editor/languageTool'

interface Props {
  editor: Editor
  matches: LTMatch[]
}

const ICON_PROPS = { size: 16, strokeWidth: 1.5 }

const CATEGORY_COLOR: Record<string, string> = {
  spelling: 'rgba(210,65,50,0.85)',
  grammar:  'rgba(55,115,210,0.85)',
  style:    'rgba(140,140,130,0.7)',
  other:    'rgba(140,140,130,0.7)',
}

function CategoryIcon({ category }: { category: string }) {
  if (category === 'spelling') return <SpellCheck {...ICON_PROPS} />
  if (category === 'grammar')  return <Languages  {...ICON_PROPS} />
  return <Pencil {...ICON_PROPS} />
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
      const result = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
      if (!result) { setPopover(null); return }

      const posMap = buildPosMap(editor)
      const match = matches.find((m) => {
        const end = m.offset + m.length
        if (m.offset >= posMap.length || end > posMap.length) return false
        return result.pos >= posMap[m.offset] && result.pos < posMap[end - 1] + 1
      }) ?? null

      if (!match) { setPopover(null); return }
      setPopover({ match, x: e.clientX, y: e.clientY + 16 })
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
  const color = CATEGORY_COLOR[match.category] ?? CATEGORY_COLOR.other
  const suggestions = match.replacements.slice(0, 5)

  return (
    <div
      ref={ref}
      className="format-toolbar-enter"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        transform: 'translateX(-50%)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        background: '#1a1a18',
        borderRadius: 100,
        padding: '4px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        whiteSpace: 'nowrap',
      }}
    >
      {/* Category icon */}
      <div style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
        flexShrink: 0,
      }}>
        <CategoryIcon category={match.category} />
      </div>

      {/* Separator */}
      {suggestions.length > 0 && (
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      )}

      {/* Suggestion buttons */}
      {suggestions.map((r) => (
        <button
          key={r}
          onMouseDown={(e) => { e.preventDefault(); applyReplacement(r) }}
          style={{
            height: 36,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 100,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 100ms, color 100ms',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
          }}
        >
          {r}
        </button>
      ))}

      {/* No suggestions: show short message */}
      {suggestions.length === 0 && (
        <span style={{
          height: 36, padding: '0 12px',
          display: 'flex', alignItems: 'center',
          fontSize: 13, color: 'rgba(255,255,255,0.4)',
        }}>
          {match.shortMessage || match.message}
        </span>
      )}
    </div>
  )
}
